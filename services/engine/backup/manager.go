package backup

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Manager struct {
	jobs map[string]*Job
	mu   sync.RWMutex
}

type Job struct {
	ID          string    `json:"id"`
	Status      string    `json:"status"`
	Files       []string  `json:"files"`
	Destination string    `json:"destination"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Progress    int       `json:"progress"`
	Error       string    `json:"error,omitempty"`
}

type BackupRequest struct {
	Files       []string `json:"files" binding:"required"`
	Destination string   `json:"destination" binding:"required"`
	Options     struct {
		Compression bool   `json:"compression"`
		Encryption  bool   `json:"encryption"`
		Schedule    string `json:"schedule"`
	} `json:"options"`
}

func NewManager() *Manager {
	return &Manager{
		jobs: make(map[string]*Job),
	}
}

func (m *Manager) HandleBackup(c *gin.Context) {
	var req BackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new backup job
	job := &Job{
		ID:          uuid.New().String(),
		Status:      "pending",
		Files:       req.Files,
		Destination: req.Destination,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Progress:    0,
	}

	m.mu.Lock()
	m.jobs[job.ID] = job
	m.mu.Unlock()

	// Start backup process in goroutine
	go m.processBackup(job, req.Options)

	c.JSON(http.StatusOK, gin.H{
		"id":      job.ID,
		"status":  job.Status,
		"message": "Backup job created successfully",
	})
}

func (m *Manager) HandleGetStatus(c *gin.Context) {
	jobID := c.Param("id")

	m.mu.RLock()
	job, exists := m.jobs[jobID]
	m.mu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

func (m *Manager) processBackup(job *Job, options struct {
	Compression bool   `json:"compression"`
	Encryption  bool   `json:"encryption"`
	Schedule    string `json:"schedule"`
}) {
	m.updateJobStatus(job.ID, "running", 0)

	// Simulate backup process
	for i := 0; i <= 100; i += 10 {
		time.Sleep(time.Second)
		m.updateJobStatus(job.ID, "running", i)
	}

	// TODO: Implement actual backup logic
	// 1. Validate files
	// 2. Compress if needed
	// 3. Encrypt if needed
	// 4. Store to destination (local/IPFS/Filecoin)

	m.updateJobStatus(job.ID, "completed", 100)
}

func (m *Manager) updateJobStatus(jobID, status string, progress int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if job, exists := m.jobs[jobID]; exists {
		job.Status = status
		job.Progress = progress
		job.UpdatedAt = time.Now()
	}
}
