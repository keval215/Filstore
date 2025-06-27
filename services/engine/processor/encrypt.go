package processor

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

type EncryptRequest struct {
	Data []byte `json:"data" binding:"required"`
	Key  string `json:"key" binding:"required"`
}

type EncryptResponse struct {
	EncryptedData []byte `json:"encrypted_data"`
	Success       bool   `json:"success"`
}

func HandleEncrypt(c *gin.Context) {
	var req EncryptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encrypted, err := EncryptData(req.Data, req.Key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption failed"})
		return
	}

	response := EncryptResponse{
		EncryptedData: encrypted,
		Success:       true,
	}

	c.JSON(http.StatusOK, response)
}

func EncryptData(data []byte, key string) ([]byte, error) {
	// Ensure key is 32 bytes for AES-256
	keyBytes := make([]byte, 32)
	copy(keyBytes, []byte(key))

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, err
	}

	// Generate a random IV
	ciphertext := make([]byte, aes.BlockSize+len(data))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], data)

	return ciphertext, nil
}

func DecryptData(ciphertext []byte, key string) ([]byte, error) {
	// Ensure key is 32 bytes for AES-256
	keyBytes := make([]byte, 32)
	copy(keyBytes, []byte(key))

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, err
	}

	if len(ciphertext) < aes.BlockSize {
		return nil, err
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return ciphertext, nil
}
