package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gateway/config"
	"gateway/handlers"
	"gateway/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Log startup with Web3 authentication
	log.Printf("🚀 Starting Filecoin Backup Gateway on port %s", cfg.Port)
	log.Println("🔐 Authentication: Web3 Wallet Only (MetaMask, Coinbase Wallet, etc.)")

	// Initialize Gin router
	r := gin.Default()

	// Setup middleware
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimit())
	r.Use(middleware.WalletAuth()) // Only Web3 wallet authentication

	// API routes - all protected by wallet authentication
	api := r.Group("/api/v1")
	{
		api.GET("/health", handlers.Health)
		api.GET("/status", handlers.Status)
		api.POST("/backup", handlers.InitiateBackup)
		api.GET("/backup/:id", handlers.GetBackupStatus)
		api.POST("/faucet", middleware.GetTestnetTokens())
		api.GET("/balance/:address", middleware.GetWalletBalance())
	}

	// Proxy /api/mainnet/deals to deal-analyzer
	r.GET("/api/mainnet/deals", func(c *gin.Context) {
		limit := c.DefaultQuery("limit", "100")
		resp, err := http.Get("http://deal-analyzer:8000/api/mainnet/deals?limit=" + limit)
		if err != nil {
			log.Printf("Error connecting to deal-analyzer: %v", err)
			c.JSON(500, gin.H{"error": "Failed to fetch from deal-analyzer", "details": err.Error()})
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
	})

	// Proxy /api/testnet/deals to deal-analyzer
	r.GET("/api/testnet/deals", func(c *gin.Context) {
		limit := c.DefaultQuery("limit", "100")
		resp, err := http.Get("http://deal-analyzer:8000/api/testnet/deals?limit=" + limit)
		if err != nil {
			log.Printf("Error connecting to deal-analyzer: %v", err)
			c.JSON(500, gin.H{"error": "Failed to fetch from deal-analyzer", "details": err.Error()})
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
	})

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Gateway server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give outstanding requests a deadline for completion
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
