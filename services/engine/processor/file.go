package processor

import (
	"crypto/md5"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type FileInfo struct {
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	Hash     string `json:"hash"`
	Modified string `json:"modified"`
}

func ProcessFile(filePath string) (*FileInfo, error) {
	// Get file info
	stat, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	// Calculate file hash
	hash, err := calculateMD5(filePath)
	if err != nil {
		return nil, err
	}

	return &FileInfo{
		Path:     filePath,
		Size:     stat.Size(),
		Hash:     hash,
		Modified: stat.ModTime().Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func calculateMD5(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

func ValidateFiles(files []string) ([]FileInfo, error) {
	var validFiles []FileInfo

	for _, file := range files {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			return nil, fmt.Errorf("file does not exist: %s", file)
		}

		fileInfo, err := ProcessFile(file)
		if err != nil {
			return nil, fmt.Errorf("failed to process file %s: %v", file, err)
		}

		validFiles = append(validFiles, *fileInfo)
	}

	return validFiles, nil
}

func CreateBackupArchive(files []string, outputPath string) error {
	// TODO: Implement archive creation logic
	// This could use tar, zip, or custom format
	
	// For now, create a simple directory structure
	backupDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return err
	}

	// Create a manifest file
	manifestPath := filepath.Join(backupDir, "manifest.json")
	manifest, err := os.Create(manifestPath)
	if err != nil {
		return err
	}
	defer manifest.Close()

	// Write file list to manifest
	for _, file := range files {
		fmt.Fprintf(manifest, "%s\n", file)
	}

	return nil
}
