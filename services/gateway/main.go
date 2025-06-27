package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"gateway/config"
	"gateway/handlers"
	"gateway/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize Gin router
	r := gin.Default()

	// Setup middleware
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimit())
	r.Use(middleware.Auth())

	// Setup routes
	api := r.Group("/api/v1")
	{
		api.GET("/health", handlers.Health)
		api.GET("/status", handlers.Status)
		api.POST("/backup", handlers.InitiateBackup)
		api.GET("/backup/:id", handlers.GetBackupStatus)
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
