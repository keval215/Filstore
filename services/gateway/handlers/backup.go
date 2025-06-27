package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type BackupRequest struct {
	Files       []string `json:"files" binding:"required"`
	Destination string   `json:"destination" binding:"required"`
	Options     struct {
		Compression bool   `json:"compression"`
		Encryption  bool   `json:"encryption"`
		Schedule    string `json:"schedule"`
	} `json:"options"`
}

type BackupResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Message string `json:"message"`
}

func InitiateBackup(c *gin.Context) {
	var req BackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Forward request to engine service
	engineURL := "http://engine:9090/api/v1/backup"
	jsonData, _ := json.Marshal(req)
	
	resp, err := http.Post(engineURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var backupResp BackupResponse
	if err := json.NewDecoder(resp.Body).Decode(&backupResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, backupResp)
}

func GetBackupStatus(c *gin.Context) {
	backupID := c.Param("id")
	if backupID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Backup ID is required"})
		return
	}

	// Query engine service for backup status
	engineURL := fmt.Sprintf("http://engine:9090/api/v1/backup/%s", backupID)
	
	resp, err := http.Get(engineURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to communicate with engine service"})
		return
	}
	defer resp.Body.Close()

	var statusResp BackupResponse
	if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse engine response"})
		return
	}

	c.JSON(http.StatusOK, statusResp)
}
