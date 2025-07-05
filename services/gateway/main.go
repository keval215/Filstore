package main

import (
	"context"
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
		// Health and status
		api.GET("/health", handlers.Health)
		api.GET("/status", handlers.Status)
		
		// Backup operations
		api.POST("/backup", handlers.InitiateBackup)
		api.GET("/backup/:id", handlers.GetBackupStatus)
		
		// File retrieval operations
		api.POST("/retrieval", handlers.InitiateFileRetrieval)
		api.GET("/retrieval/:id", handlers.GetRetrievalStatus)
		api.POST("/retrieval/:id/cancel", handlers.CancelRetrieval)
		api.GET("/retrieval/download/:cid", handlers.DownloadFile)
		api.GET("/retrieval/metadata/:cid", handlers.GetFileMetadata)
		api.GET("/retrieval/files", handlers.ListUserFiles)
		
		// Wallet operations
		api.POST("/faucet", middleware.GetTestnetTokens())
		api.GET("/balance/:address", middleware.GetWalletBalance())
	}

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
