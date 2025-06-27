package processor

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CompressRequest struct {
	Data []byte `json:"data" binding:"required"`
	Level int   `json:"level"` // 1-9, default 6
}

type CompressResponse struct {
	CompressedData []byte  `json:"compressed_data"`
	OriginalSize   int     `json:"original_size"`
	CompressedSize int     `json:"compressed_size"`
	Ratio          float64 `json:"compression_ratio"`
}

func HandleCompress(c *gin.Context) {
	var req CompressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set compression level (default: 6)
	level := req.Level
	if level < 1 || level > 9 {
		level = 6
	}

	compressed, err := CompressData(req.Data, level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Compression failed"})
		return
	}

	response := CompressResponse{
		CompressedData: compressed,
		OriginalSize:   len(req.Data),
		CompressedSize: len(compressed),
		Ratio:          float64(len(compressed)) / float64(len(req.Data)),
	}

	c.JSON(http.StatusOK, response)
}

func CompressData(data []byte, level int) ([]byte, error) {
	var buf bytes.Buffer
	
	writer, err := gzip.NewWriterLevel(&buf, level)
	if err != nil {
		return nil, err
	}
	
	_, err = writer.Write(data)
	if err != nil {
		return nil, err
	}
	
	err = writer.Close()
	if err != nil {
		return nil, err
	}
	
	return buf.Bytes(), nil
}

func DecompressData(compressedData []byte) ([]byte, error) {
	reader, err := gzip.NewReader(bytes.NewBuffer(compressedData))
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	
	return io.ReadAll(reader)
}
