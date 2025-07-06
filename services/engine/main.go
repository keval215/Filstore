package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"engine/backup"
	"engine/processor"

	"github.com/gin-gonic/gin"
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

		// Storage advisor endpoints
		api.GET("/storage-advice", getStorageAdviceHandler)
		api.GET("/storage-framework", getStorageFrameworkHandler)
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

func getStorageAdviceHandler(c *gin.Context) {
	// This would integrate with the Python storage advisor
	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"message":   "Storage advisor integration pending",
		"service":   "engine",
		"timestamp": time.Now(),
		"advice": gin.H{
			"recommendation": "Consider current market conditions before making storage deals",
			"priority":       "Medium",
		},
	})
}

func getStorageFrameworkHandler(c *gin.Context) {
	framework := gin.H{
		"decision_factors": gin.H{
			"cost": gin.H{
				"description": "Storage price per GB",
				"importance":  "High",
				"considerations": []string{
					"Current market rates",
					"Price trends (increasing/decreasing)",
					"Long-term vs short-term deals",
				},
			},
			"reliability": gin.H{
				"description": "Provider reputation and uptime",
				"importance":  "High",
				"considerations": []string{
					"Provider track record",
					"Geographic distribution",
					"Redundancy (multiple providers)",
				},
			},
			"deal_type": gin.H{
				"description": "Verified vs regular deals",
				"importance":  "Medium",
				"considerations": []string{
					"FIL+ verified deals offer better incentives",
					"Regular deals may be cheaper",
					"Provider preference for verified deals",
				},
			},
		},
		"decision_checklist": []string{
			"What's your budget per GB?",
			"How long do you need to store the data?",
			"Is data redundancy important?",
			"Do you qualify for FIL+ verified deals?",
		},
	}

	c.JSON(http.StatusOK, framework)
}
