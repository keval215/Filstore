package processor

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// RetrievalJob represents a file retrieval job
type RetrievalJob struct {
	ID            string                 `json:"id"`
	BackupJobID   string                 `json:"backup_job_id"`
	CIDs          []string               `json:"cids"`
	FilePaths     []string               `json:"file_paths"`
	Format        string                 `json:"format"`
	Status        string                 `json:"status"`
	Progress      int                    `json:"progress"`
	Message       string                 `json:"message"`
	Files         []RetrievedFile        `json:"files"`
	TotalSize     int64                  `json:"total_size"`
	CreatedAt     time.Time              `json:"created_at"`
	CompletedAt   *time.Time             `json:"completed_at,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	WalletAddress string                 `json:"wallet_address"`
}

// RetrievedFile represents a file that has been retrieved
type RetrievedFile struct {
	CID         string                 `json:"cid"`
	FilePath    string                 `json:"file_path"`
	Size        int64                  `json:"size"`
	Type        string                 `json:"type"`
	Status      string                 `json:"status"`
	DownloadURL string                 `json:"download_url,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	LocalPath   string                 `json:"local_path,omitempty"`
}

// RetrievalProcessor handles file retrieval operations
type RetrievalProcessor struct {
	db          *sql.DB
	ipfsGateway string
	tempDir     string
	outputDir   string
}

// NewRetrievalProcessor creates a new retrieval processor
func NewRetrievalProcessor(db *sql.DB, ipfsGateway, tempDir, outputDir string) *RetrievalProcessor {
	return &RetrievalProcessor{
		db:          db,
		ipfsGateway: ipfsGateway,
		tempDir:     tempDir,
		outputDir:   outputDir,
	}
}

// CreateRetrievalJob creates a new retrieval job
func (rp *RetrievalProcessor) CreateRetrievalJob(req map[string]interface{}, walletAddress string) (*RetrievalJob, error) {
	job := &RetrievalJob{
		ID:            uuid.New().String(),
		Status:        "pending",
		Progress:      0,
		CreatedAt:     time.Now(),
		WalletAddress: walletAddress,
	}

	// Parse request fields
	if backupJobID, ok := req["backup_job_id"].(string); ok && backupJobID != "" {
		job.BackupJobID = backupJobID
	}

	if cids, ok := req["cids"].([]interface{}); ok {
		for _, cid := range cids {
			if cidStr, ok := cid.(string); ok {
				job.CIDs = append(job.CIDs, cidStr)
			}
		}
	}

	if filePaths, ok := req["file_paths"].([]interface{}); ok {
		for _, path := range filePaths {
			if pathStr, ok := path.(string); ok {
				job.FilePaths = append(job.FilePaths, pathStr)
			}
		}
	}

	if format, ok := req["format"].(string); ok {
		job.Format = format
	} else {
		job.Format = "original"
	}

	// Store job in database
	if err := rp.storeRetrievalJob(job); err != nil {
		return nil, fmt.Errorf("failed to store retrieval job: %w", err)
	}

	// Start processing in background
	go rp.processRetrievalJob(job)

	return job, nil
}

// GetRetrievalJob retrieves a retrieval job by ID
func (rp *RetrievalProcessor) GetRetrievalJob(jobID string) (*RetrievalJob, error) {
	query := `
		SELECT id, backup_job_id, cids, file_paths, format, status, progress, 
		       message, files, total_size, created_at, completed_at, metadata, wallet_address
		FROM retrieval_jobs WHERE id = $1
	`

	var job RetrievalJob
	var cidsJSON, filePathsJSON, filesJSON, metadataJSON []byte

	err := rp.db.QueryRow(query, jobID).Scan(
		&job.ID, &job.BackupJobID, &cidsJSON, &filePathsJSON, &job.Format,
		&job.Status, &job.Progress, &job.Message, &filesJSON, &job.TotalSize,
		&job.CreatedAt, &job.CompletedAt, &metadataJSON, &job.WalletAddress,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get retrieval job: %w", err)
	}

	// Parse JSON fields
	if err := json.Unmarshal(cidsJSON, &job.CIDs); err != nil {
		return nil, fmt.Errorf("failed to parse CIDs: %w", err)
	}
	if err := json.Unmarshal(filePathsJSON, &job.FilePaths); err != nil {
		return nil, fmt.Errorf("failed to parse file paths: %w", err)
	}
	if err := json.Unmarshal(filesJSON, &job.Files); err != nil {
		return nil, fmt.Errorf("failed to parse files: %w", err)
	}
	if err := json.Unmarshal(metadataJSON, &job.Metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	return &job, nil
}

// CancelRetrievalJob cancels a retrieval job
func (rp *RetrievalProcessor) CancelRetrievalJob(jobID string) error {
	query := `UPDATE retrieval_jobs SET status = 'cancelled', message = 'Cancelled by user' WHERE id = $1`
	_, err := rp.db.Exec(query, jobID)
	return err
}

// ListUserFiles lists all files for a user
func (rp *RetrievalProcessor) ListUserFiles(walletAddress string, page, limit int, status string) (map[string]interface{}, error) {
	offset := (page - 1) * limit

	// Build query with filters
	query := `
		SELECT cf.id, cf.root_cid, cf.car_cid, cf.file_path, cf.original_size, 
		       cf.car_size, cf.status, cf.created_at, cf.metadata,
		       bj.id as backup_job_id, bj.status as backup_status
		FROM car_files cf
		JOIN backup_jobs bj ON cf.backup_job_id = bj.id
		JOIN storage_deals sd ON bj.id = sd.backup_job_id
		JOIN wallets w ON sd.wallet_id = w.id
		WHERE w.address = $1
	`

	args := []interface{}{walletAddress}
	argIndex := 2

	if status != "" {
		query += fmt.Sprintf(" AND cf.status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY cf.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := rp.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query user files: %w", err)
	}
	defer rows.Close()

	var files []map[string]interface{}
	var totalSize int64

	for rows.Next() {
		var file struct {
			ID           string
			RootCID      string
			CarCID       string
			FilePath     string
			OriginalSize int64
			CarSize      int64
			Status       string
			CreatedAt    time.Time
			Metadata     []byte
			BackupJobID  string
			BackupStatus string
		}

		err := rows.Scan(
			&file.ID, &file.RootCID, &file.CarCID, &file.FilePath, &file.OriginalSize,
			&file.CarSize, &file.Status, &file.CreatedAt, &file.Metadata,
			&file.BackupJobID, &file.BackupStatus,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan file row: %w", err)
		}

		var metadata map[string]interface{}
		if file.Metadata != nil {
			if err := json.Unmarshal(file.Metadata, &metadata); err != nil {
				metadata = make(map[string]interface{})
			}
		}

		fileInfo := map[string]interface{}{
			"id":            file.ID,
			"root_cid":      file.RootCID,
			"car_cid":       file.CarCID,
			"file_path":     file.FilePath,
			"original_size": file.OriginalSize,
			"car_size":      file.CarSize,
			"status":        file.Status,
			"created_at":    file.CreatedAt,
			"metadata":      metadata,
			"backup_job_id": file.BackupJobID,
			"backup_status": file.BackupStatus,
		}

		files = append(files, fileInfo)
		totalSize += file.OriginalSize
	}

	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM car_files cf
		JOIN backup_jobs bj ON cf.backup_job_id = bj.id
		JOIN storage_deals sd ON bj.id = sd.backup_job_id
		JOIN wallets w ON sd.wallet_id = w.id
		WHERE w.address = $1
	`

	var totalCount int
	err = rp.db.QueryRow(countQuery, walletAddress).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	return map[string]interface{}{
		"files":       files,
		"total_count": totalCount,
		"total_size":  totalSize,
		"page":        page,
		"limit":       limit,
		"has_more":    (page * limit) < totalCount,
	}, nil
}

// GetFileMetadata gets metadata for a specific file
func (rp *RetrievalProcessor) GetFileMetadata(cid string) (map[string]interface{}, error) {
	query := `
		SELECT cf.id, cf.root_cid, cf.car_cid, cf.file_path, cf.original_size, 
		       cf.car_size, cf.status, cf.created_at, cf.metadata,
		       bj.id as backup_job_id, bj.status as backup_status,
		       w.address as wallet_address
		FROM car_files cf
		JOIN backup_jobs bj ON cf.backup_job_id = bj.id
		JOIN storage_deals sd ON bj.id = sd.backup_job_id
		JOIN wallets w ON sd.wallet_id = w.id
		WHERE cf.root_cid = $1 OR cf.car_cid = $1
	`

	var file struct {
		ID            string
		RootCID       string
		CarCID        string
		FilePath      string
		OriginalSize  int64
		CarSize       int64
		Status        string
		CreatedAt     time.Time
		Metadata      []byte
		BackupJobID   string
		BackupStatus  string
		WalletAddress string
	}

	err := rp.db.QueryRow(query, cid).Scan(
		&file.ID, &file.RootCID, &file.CarCID, &file.FilePath, &file.OriginalSize,
		&file.CarSize, &file.Status, &file.CreatedAt, &file.Metadata,
		&file.BackupJobID, &file.BackupStatus, &file.WalletAddress,
	)

	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	var metadata map[string]interface{}
	if file.Metadata != nil {
		if err := json.Unmarshal(file.Metadata, &metadata); err != nil {
			metadata = make(map[string]interface{})
		}
	}

	// Get storage deals
	dealsQuery := `
		SELECT miner_id, deal_cid, price, size, duration, status, verified_deal
		FROM storage_deals
		WHERE backup_job_id = $1
	`

	dealsRows, err := rp.db.Query(dealsQuery, file.BackupJobID)
	if err != nil {
		return nil, fmt.Errorf("failed to query deals: %w", err)
	}
	defer dealsRows.Close()

	var deals []map[string]interface{}
	for dealsRows.Next() {
		var deal struct {
			MinerID      string
			DealCID      *string
			Price        float64
			Size         int64
			Duration     int
			Status       string
			VerifiedDeal bool
		}

		err := dealsRows.Scan(
			&deal.MinerID, &deal.DealCID, &deal.Price, &deal.Size,
			&deal.Duration, &deal.Status, &deal.VerifiedDeal,
		)
		if err != nil {
			continue
		}

		dealInfo := map[string]interface{}{
			"miner_id":      deal.MinerID,
			"deal_cid":      deal.DealCID,
			"price":         deal.Price,
			"size":          deal.Size,
			"duration":      deal.Duration,
			"status":        deal.Status,
			"verified_deal": deal.VerifiedDeal,
		}
		deals = append(deals, dealInfo)
	}

	return map[string]interface{}{
		"id":             file.ID,
		"root_cid":       file.RootCID,
		"car_cid":        file.CarCID,
		"file_path":      file.FilePath,
		"original_size":  file.OriginalSize,
		"car_size":       file.CarSize,
		"status":         file.Status,
		"created_at":     file.CreatedAt,
		"metadata":       metadata,
		"backup_job_id":  file.BackupJobID,
		"backup_status":  file.BackupStatus,
		"wallet_address": file.WalletAddress,
		"storage_deals":  deals,
		"ipfs_gateway":   rp.ipfsGateway,
	}, nil
}

// DownloadFile downloads a file from IPFS
func (rp *RetrievalProcessor) DownloadFile(cid, format string) (string, string, int64, error) {
	// Determine file type and local path
	var localPath string
	var contentType string

	switch format {
	case "car":
		localPath = filepath.Join(rp.tempDir, fmt.Sprintf("%s.car", cid))
		contentType = "application/car"
	case "metadata":
		// Return metadata as JSON
		metadata, err := rp.GetFileMetadata(cid)
		if err != nil {
			return "", "", 0, err
		}

		metadataPath := filepath.Join(rp.tempDir, fmt.Sprintf("%s_metadata.json", cid))
		metadataJSON, err := json.MarshalIndent(metadata, "", "  ")
		if err != nil {
			return "", "", 0, err
		}

		if err := os.WriteFile(metadataPath, metadataJSON, 0644); err != nil {
			return "", "", 0, err
		}

		return metadataPath, "application/json", int64(len(metadataJSON)), nil
	default: // "original"
		localPath = filepath.Join(rp.tempDir, fmt.Sprintf("%s_original", cid))
		contentType = "application/octet-stream"
	}

	// Download from IPFS
	ipfsURL := fmt.Sprintf("%s/ipfs/%s", rp.ipfsGateway, cid)
	resp, err := http.Get(ipfsURL)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to download from IPFS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("IPFS returned status %d", resp.StatusCode)
	}

	// Create output file
	file, err := os.Create(localPath)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create output file: %w", err)
	}
	defer file.Close()

	// Copy data
	size, err := io.Copy(file, resp.Body)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to copy file data: %w", err)
	}

	// If format is original, try to extract from CAR
	if format == "original" {
		if strings.HasSuffix(cid, ".car") || size > 1024*1024 { // Likely a CAR file
			extractedPath, err := rp.extractFromCAR(localPath, cid)
			if err == nil {
				// Remove original CAR file
				os.Remove(localPath)
				localPath = extractedPath
			}
		}
	}

	return localPath, contentType, size, nil
}

// extractFromCAR extracts original file from CAR format
func (rp *RetrievalProcessor) extractFromCAR(carPath, cid string) (string, error) {
	// This is a simplified CAR extraction
	// In production, you'd use a proper CAR library
	outputPath := filepath.Join(rp.tempDir, fmt.Sprintf("%s_extracted", cid))

	// For now, just copy the CAR file as-is
	// TODO: Implement proper CAR extraction
	input, err := os.Open(carPath)
	if err != nil {
		return "", err
	}
	defer input.Close()

	output, err := os.Create(outputPath)
	if err != nil {
		return "", err
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	return outputPath, err
}

// processRetrievalJob processes a retrieval job in the background
func (rp *RetrievalProcessor) processRetrievalJob(job *RetrievalJob) {
	defer func() {
		now := time.Now()
		job.CompletedAt = &now
		rp.updateRetrievalJob(job)
	}()

	// Update status to processing
	job.Status = "processing"
	job.Message = "Starting file retrieval..."
	rp.updateRetrievalJob(job)

	// Determine files to retrieve
	var filesToRetrieve []string

	if job.BackupJobID != "" {
		// Get files from backup job
		files, err := rp.getFilesFromBackupJob(job.BackupJobID, job.WalletAddress)
		if err != nil {
			job.Status = "failed"
			job.Message = fmt.Sprintf("Failed to get files from backup: %v", err)
			return
		}
		filesToRetrieve = files
	} else if len(job.CIDs) > 0 {
		filesToRetrieve = job.CIDs
	} else if len(job.FilePaths) > 0 {
		// Get CIDs for file paths
		cids, err := rp.getCIDsForPaths(job.FilePaths, job.WalletAddress)
		if err != nil {
			job.Status = "failed"
			job.Message = fmt.Sprintf("Failed to get CIDs for paths: %v", err)
			return
		}
		filesToRetrieve = cids
	}

	if len(filesToRetrieve) == 0 {
		job.Status = "failed"
		job.Message = "No files found to retrieve"
		return
	}

	// Process each file
	totalFiles := len(filesToRetrieve)
	for i, cid := range filesToRetrieve {
		// Check if job was cancelled
		currentJob, err := rp.GetRetrievalJob(job.ID)
		if err != nil || currentJob.Status == "cancelled" {
			job.Status = "cancelled"
			job.Message = "Job was cancelled"
			return
		}

		// Download file
		localPath, contentType, size, err := rp.DownloadFile(cid, job.Format)
		if err != nil {
			job.Message = fmt.Sprintf("Failed to download %s: %v", cid, err)
			continue
		}

		// Create file info
		fileInfo := RetrievedFile{
			CID:         cid,
			FilePath:    cid, // Use CID as file path for now
			Size:        size,
			Type:        contentType,
			Status:      "retrieved",
			LocalPath:   localPath,
			DownloadURL: fmt.Sprintf("/api/v1/retrieval/download/%s?format=%s", cid, job.Format),
		}

		job.Files = append(job.Files, fileInfo)
		job.TotalSize += size
		job.Progress = ((i + 1) * 100) / totalFiles

		rp.updateRetrievalJob(job)
	}

	// Mark as completed
	job.Status = "completed"
	job.Message = fmt.Sprintf("Successfully retrieved %d files", len(job.Files))
	job.Progress = 100
}

// Helper methods for database operations
func (rp *RetrievalProcessor) storeRetrievalJob(job *RetrievalJob) error {
	cidsJSON, _ := json.Marshal(job.CIDs)
	filePathsJSON, _ := json.Marshal(job.FilePaths)
	filesJSON, _ := json.Marshal(job.Files)
	metadataJSON, _ := json.Marshal(job.Metadata)

	query := `
		INSERT INTO retrieval_jobs (id, backup_job_id, cids, file_paths, format, status, 
		                           progress, message, files, total_size, created_at, wallet_address, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := rp.db.Exec(query,
		job.ID, job.BackupJobID, cidsJSON, filePathsJSON, job.Format,
		job.Status, job.Progress, job.Message, filesJSON, job.TotalSize,
		job.CreatedAt, job.WalletAddress, metadataJSON,
	)

	return err
}

func (rp *RetrievalProcessor) updateRetrievalJob(job *RetrievalJob) error {
	filesJSON, _ := json.Marshal(job.Files)
	metadataJSON, _ := json.Marshal(job.Metadata)

	query := `
		UPDATE retrieval_jobs 
		SET status = $1, progress = $2, message = $3, files = $4, 
		    total_size = $5, completed_at = $6, metadata = $7
		WHERE id = $8
	`

	_, err := rp.db.Exec(query,
		job.Status, job.Progress, job.Message, filesJSON,
		job.TotalSize, job.CompletedAt, metadataJSON, job.ID,
	)

	return err
}

func (rp *RetrievalProcessor) getFilesFromBackupJob(backupJobID, walletAddress string) ([]string, error) {
	query := `
		SELECT cf.root_cid
		FROM car_files cf
		JOIN backup_jobs bj ON cf.backup_job_id = bj.id
		JOIN storage_deals sd ON bj.id = sd.backup_job_id
		JOIN wallets w ON sd.wallet_id = w.id
		WHERE bj.id = $1 AND w.address = $2
	`

	rows, err := rp.db.Query(query, backupJobID, walletAddress)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cids []string
	for rows.Next() {
		var cid string
		if err := rows.Scan(&cid); err != nil {
			continue
		}
		cids = append(cids, cid)
	}

	return cids, nil
}

func (rp *RetrievalProcessor) getCIDsForPaths(filePaths []string, walletAddress string) ([]string, error) {
	// Convert file paths to SQL IN clause
	placeholders := make([]string, len(filePaths))
	args := make([]interface{}, len(filePaths)+1)
	args[0] = walletAddress

	for i, path := range filePaths {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = path
	}

	query := fmt.Sprintf(`
		SELECT cf.root_cid
		FROM car_files cf
		JOIN backup_jobs bj ON cf.backup_job_id = bj.id
		JOIN storage_deals sd ON bj.id = sd.backup_job_id
		JOIN wallets w ON sd.wallet_id = w.id
		WHERE w.address = $1 AND cf.file_path = ANY($2)
	`, strings.Join(placeholders, ", "))

	rows, err := rp.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cids []string
	for rows.Next() {
		var cid string
		if err := rows.Scan(&cid); err != nil {
			continue
		}
		cids = append(cids, cid)
	}

	return cids, nil
}
