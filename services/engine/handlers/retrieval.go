package handlers

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"engine/processor"

	"github.com/gin-gonic/gin"
)

// RetrievalHandler handles file retrieval operations
type RetrievalHandler struct {
	retrievalProcessor *processor.RetrievalProcessor
}

// NewRetrievalHandler creates a new retrieval handler
func NewRetrievalHandler(db *sql.DB, ipfsGateway, tempDir, outputDir string) *RetrievalHandler {
	return &RetrievalHandler{
		retrievalProcessor: processor.NewRetrievalProcessor(db, ipfsGateway, tempDir, outputDir),
	}
}

// InitiateRetrieval starts a file retrieval job
func (rh *RetrievalHandler) InitiateRetrieval(c *gin.Context) {
	// Parse request body
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get wallet address from header (set by gateway middleware)
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Create retrieval job
	job, err := rh.retrievalProcessor.CreateRetrievalJob(req, walletAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create retrieval job: %v", err)})
		return
	}

	// Return job information
	response := map[string]interface{}{
		"id":          job.ID,
		"status":      job.Status,
		"message":     job.Message,
		"progress":    job.Progress,
		"created_at":  job.CreatedAt,
		"total_files": len(job.CIDs) + len(job.FilePaths),
	}

	c.JSON(http.StatusOK, response)
}

// GetRetrievalStatus gets the status of a retrieval job
func (rh *RetrievalHandler) GetRetrievalStatus(c *gin.Context) {
	// Extract job ID from URL parameter
	jobID := c.Param("id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Retrieval ID required"})
		return
	}

	// Get wallet address for authorization
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Get retrieval job
	job, err := rh.retrievalProcessor.GetRetrievalJob(jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Failed to get retrieval job: %v", err)})
		return
	}

	// Check authorization
	if job.WalletAddress != walletAddress {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to retrieval job"})
		return
	}

	// Return job status
	response := map[string]interface{}{
		"id":           job.ID,
		"status":       job.Status,
		"progress":     job.Progress,
		"message":      job.Message,
		"created_at":   job.CreatedAt,
		"completed_at": job.CompletedAt,
		"total_size":   job.TotalSize,
		"files":        job.Files,
	}

	c.JSON(http.StatusOK, response)
}

// CancelRetrieval cancels a retrieval job
func (rh *RetrievalHandler) CancelRetrieval(c *gin.Context) {
	// Extract job ID from URL parameter
	jobID := c.Param("id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Retrieval ID required"})
		return
	}

	// Get wallet address for authorization
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Get retrieval job to check authorization
	job, err := rh.retrievalProcessor.GetRetrievalJob(jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Failed to get retrieval job: %v", err)})
		return
	}

	// Check authorization
	if job.WalletAddress != walletAddress {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to retrieval job"})
		return
	}

	// Cancel the job
	if err := rh.retrievalProcessor.CancelRetrievalJob(jobID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to cancel retrieval job: %v", err)})
		return
	}

	response := map[string]interface{}{
		"id":      jobID,
		"status":  "cancelled",
		"message": "Retrieval job cancelled successfully",
	}

	c.JSON(http.StatusOK, response)
}

// DownloadFile downloads a specific file by CID
func (rh *RetrievalHandler) DownloadFile(c *gin.Context) {
	// Extract CID from URL parameter
	cid := c.Param("cid")
	if cid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CID required"})
		return
	}

	// Get format from query parameter
	format := c.Query("format")
	if format == "" {
		format = "original"
	}

	// Get wallet address for authorization
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Check if user has access to this file
	metadata, err := rh.retrievalProcessor.GetFileMetadata(cid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("File not found: %v", err)})
		return
	}

	// Check authorization
	if metadata["wallet_address"] != walletAddress {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to file"})
		return
	}

	// Download the file
	localPath, contentType, size, err := rh.retrievalProcessor.DownloadFile(cid, format)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to download file: %v", err)})
		return
	}

	// Open the file
	file, err := os.Open(localPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to open file: %v", err)})
		return
	}
	defer file.Close()

	// Set filename for download
	filename := cid
	if format == "metadata" {
		filename = fmt.Sprintf("%s_metadata.json", cid)
	} else if format == "car" {
		filename = fmt.Sprintf("%s.car", cid)
	} else {
		// Try to get original filename from metadata
		if filePath, ok := metadata["file_path"].(string); ok {
			filename = filepath.Base(filePath)
		}
	}

	// Set response headers
	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.FormatInt(size, 10))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	// Stream the file
	io.Copy(c.Writer, file)

	// Clean up temporary file after a delay
	go func() {
		time.Sleep(30 * time.Second) // Keep file available for 30 seconds
		os.Remove(localPath)
	}()
}

// GetFileMetadata gets metadata for a specific file
func (rh *RetrievalHandler) GetFileMetadata(c *gin.Context) {
	// Extract CID from URL parameter
	cid := c.Param("cid")
	if cid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CID required"})
		return
	}

	// Get wallet address for authorization
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Get file metadata
	metadata, err := rh.retrievalProcessor.GetFileMetadata(cid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("File not found: %v", err)})
		return
	}

	// Check authorization
	if metadata["wallet_address"] != walletAddress {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to file"})
		return
	}

	// Return metadata
	c.JSON(http.StatusOK, metadata)
}

// ListUserFiles lists all files for a user
func (rh *RetrievalHandler) ListUserFiles(c *gin.Context) {
	// Get wallet address for authorization
	walletAddress := c.GetHeader("X-Wallet-Address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Get query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page <= 0 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	status := c.Query("status")

	// Get user files
	files, err := rh.retrievalProcessor.ListUserFiles(walletAddress, page, limit, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to list files: %v", err)})
		return
	}

	// Return files list
	c.JSON(http.StatusOK, files)
}
