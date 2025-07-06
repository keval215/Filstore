package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"engine/backup"
	"engine/handlers"
	"engine/processor"
)

func main() {
	// Initialize database connection
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Get configuration from environment
	ipfsGateway := os.Getenv("IPFS_GATEWAY")
	if ipfsGateway == "" {
		ipfsGateway = "https://ipfs.io"
	}

	tempDir := os.Getenv("TEMP_DIR")
	if tempDir == "" {
		tempDir = "/tmp/engine"
	}

	outputDir := os.Getenv("OUTPUT_DIR")
	if outputDir == "" {
		outputDir = "/app/output"
	}

	// Create directories if they don't exist
	os.MkdirAll(tempDir, 0755)
	os.MkdirAll(outputDir, 0755)

	// Initialize Gin router
	r := gin.Default()

	// Initialize services
	backupManager := backup.NewManager()
	retrievalHandler := handlers.NewRetrievalHandler(db, ipfsGateway, tempDir, outputDir)

	// Setup routes
	api := r.Group("/api/v1")
	{
		// Health check
		api.GET("/health", healthHandler)
		
		// Backup operations
		api.POST("/backup", backupManager.HandleBackup)
		api.GET("/backup/:id", backupManager.HandleGetStatus)
		
		// File processing
		api.POST("/compress", processor.HandleCompress)
		api.POST("/encrypt", processor.HandleEncrypt)
		
		// File retrieval operations
		api.POST("/retrieval", retrievalHandler.InitiateRetrieval)
		api.GET("/retrieval/:id", retrievalHandler.GetRetrievalStatus)
		api.POST("/retrieval/:id/cancel", retrievalHandler.CancelRetrieval)
		api.GET("/retrieval/download/:cid", retrievalHandler.DownloadFile)
		api.GET("/retrieval/metadata/:cid", retrievalHandler.GetFileMetadata)
		api.GET("/retrieval/files", retrievalHandler.ListUserFiles)
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
		log.Printf("IPFS Gateway: %s", ipfsGateway)
		log.Printf("Temp Directory: %s", tempDir)
		log.Printf("Output Directory: %s", outputDir)
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

func initDatabase() (*sql.DB, error) {
	// Get database URL from environment
	dbURL := os.Getenv("POSTGRES_URL")
	if dbURL == "" {
		dbURL = "postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup?sslmode=disable"
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connected successfully")
	return db, nil
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "engine",
		"version":   "1.0.0",
		"timestamp": time.Now(),
		"features": []string{
			"backup",
			"retrieval",
			"compression",
			"encryption",
		},
	})
}
