package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// FileRetrievalRequest represents a request to retrieve files
type FileRetrievalRequest struct {
	BackupJobID string   `json:"backup_job_id,omitempty"`
	CIDs        []string `json:"cids,omitempty"`
	FilePaths   []string `json:"file_paths,omitempty"`
	Format      string   `json:"format"` // "original", "car", "metadata"
}

// FileRetrievalResponse represents the response for file retrieval
type FileRetrievalResponse struct {
	ID          string                 `json:"id"`
	Status      string                 `json:"status"`
	Message     string                 `json:"message"`
	Files       []FileInfo             `json:"files,omitempty"`
	TotalSize   int64                  `json:"total_size,omitempty"`
	RetrievedAt time.Time              `json:"retrieved_at"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// FileInfo represents information about a retrieved file
type FileInfo struct {
	CID         string                 `json:"cid"`
	FilePath    string                 `json:"file_path"`
	Size        int64                  `json:"size"`
	Type        string                 `json:"type"`
	Status      string                 `json:"status"`
	DownloadURL string                 `json:"download_url,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// RetrievalStatus represents the status of a retrieval job
type RetrievalStatus struct {
	ID          string     `json:"id"`
	Status      string     `json:"status"`
	Progress    int        `json:"progress"`
	Message     string     `json:"message"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// InitiateFileRetrieval starts a file retrieval job
func InitiateFileRetrieval(c *gin.Context) {
	var req FileRetrievalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate request
	if req.BackupJobID == "" && len(req.CIDs) == 0 && len(req.FilePaths) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either backup_job_id, cids, or file_paths must be provided"})
		return
	}

	// Forward request to engine service
	engineURL := "http://engine:9090/api/v1/retrieval"
	jsonData, _ := json.Marshal(req)

	httpReq, err := http.NewRequest("POST", engineURL, bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Pass wallet address as header
	walletAddress := c.GetString("wallet_address")
	if walletAddress != "" {
		httpReq.Header.Set("X-Wallet-Address", walletAddress)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var retrievalResp FileRetrievalResponse
	if err := json.NewDecoder(resp.Body).Decode(&retrievalResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, retrievalResp)
}

// GetRetrievalStatus gets the status of a retrieval job
func GetRetrievalStatus(c *gin.Context) {
	retrievalID := c.Param("id")
	if retrievalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Retrieval ID is required"})
		return
	}

	// Query engine service for retrieval status
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/retrieval/%s", retrievalID)

	req, err := http.NewRequest("GET", engineURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Pass wallet address as header
	walletAddress := c.GetString("wallet_address")
	if walletAddress != "" {
		req.Header.Set("X-Wallet-Address", walletAddress)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var statusResp RetrievalStatus
	if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, statusResp)
}

// DownloadFile downloads a specific file by CID
func DownloadFile(c *gin.Context) {
	cid := c.Param("cid")
	if cid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CID is required"})
		return
	}

	// Get file format (original, car, metadata)
	format := c.Query("format")
	if format == "" {
		format = "original"
	}

	// Forward request to engine service
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/retrieval/download/%s?format=%s", cid, format)

	req, err := http.NewRequest("GET", engineURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Pass wallet address as header
	walletAddress := c.GetString("wallet_address")
	if walletAddress != "" {
		req.Header.Set("X-Wallet-Address", walletAddress)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	// Check if the response is successful
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	// Stream the file back to the client
	contentType := resp.Header.Get("Content-Type")
	contentLength := resp.Header.Get("Content-Length")
	filename := resp.Header.Get("Content-Disposition")

	c.Header("Content-Type", contentType)
	if contentLength != "" {
		c.Header("Content-Length", contentLength)
	}
	if filename != "" {
		c.Header("Content-Disposition", filename)
	}

	// Stream the file
	io.Copy(c.Writer, resp.Body)
}

// ListUserFiles lists all files for a user
func ListUserFiles(c *gin.Context) {
	// Get wallet address from authentication middleware
	walletAddress := c.GetString("wallet_address")
	if walletAddress == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Wallet address not found"})
		return
	}

	// Get query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")

	// Forward request to engine service
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/retrieval/files?page=%d&limit=%d", page, limit)
	if status != "" {
		engineURL += fmt.Sprintf("&status=%s", status)
	}

	req, err := http.NewRequest("GET", engineURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Pass wallet address as header
	req.Header.Set("X-Wallet-Address", walletAddress)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var filesResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&filesResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, filesResp)
}

// GetFileMetadata gets metadata for a specific file
func GetFileMetadata(c *gin.Context) {
	cid := c.Param("cid")
	if cid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CID is required"})
		return
	}

	// Forward request to engine service
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/retrieval/metadata/%s", cid)

	req, err := http.NewRequest("GET", engineURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Pass wallet address as header
	walletAddress := c.GetString("wallet_address")
	if walletAddress != "" {
		req.Header.Set("X-Wallet-Address", walletAddress)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var metadataResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&metadataResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, metadataResp)
}

// CancelRetrieval cancels a retrieval job
func CancelRetrieval(c *gin.Context) {
	retrievalID := c.Param("id")
	if retrievalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Retrieval ID is required"})
		return
	}

	// Forward request to engine service
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/retrieval/%s/cancel", retrievalID)

	req, err := http.NewRequest("POST", engineURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var cancelResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&cancelResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, cancelResp)
}
