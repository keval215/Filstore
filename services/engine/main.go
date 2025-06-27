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
	"engine/backup"
	"engine/processor"
)

func main() {
	// Initialize Gin router
	r := gin.Default()

	// Initialize backup manager
	backupManager := backup.NewManager()

	// Setup routes
	api := r.Group("/api/v1")
	{
		api.GET("/health", healthHandler)
		api.POST("/backup", backupManager.HandleBackup)
		api.GET("/backup/:id", backupManager.HandleGetStatus)
		api.POST("/compress", processor.HandleCompress)
		api.POST("/encrypt", processor.HandleEncrypt)
	}

	// Create HTTP server
	port := os.Getenv("PORT")
	if port == "" {
		port = "9090"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Engine server starting on port %s", port)
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

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "engine",
		"version":   "1.0.0",
		"timestamp": time.Now(),
	})
}
