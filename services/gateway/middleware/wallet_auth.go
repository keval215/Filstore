package middleware

import (
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
)

// WalletAuth middleware for Web3 wallet-based authentication
// This is the ONLY authentication method - pure Web3
func WalletAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip authentication for health endpoints
		if strings.HasSuffix(c.Request.URL.Path, "/health") {
			c.Next()
			return
		}

		// Check if this is a write operation that requires signing
		if isWriteOperation(c.Request.Method, c.Request.URL.Path) {
			if err := validateWalletSignature(c); err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   err.Error(),
					"message": "Web3 wallet signature required for this operation",
				})
				c.Abort()
				return
			}
		} else {
			// For read operations, just check wallet address is provided
			walletAddress := c.GetHeader("X-Wallet-Address")
			if walletAddress != "" {
				c.Set("wallet_address", walletAddress)
				c.Set("authenticated", true)
			}
		}

		c.Next()
	}
}

func isWriteOperation(method, path string) bool {
	// Require signature for sensitive operations
	writeOperations := []string{
		"POST /api/v1/backup",
		"DELETE /api/v1/backup",
		"PUT /api/v1/backup",
		"POST /api/v1/upload",
		"POST /api/v1/restore",
	}

	operation := method + " " + path
	for _, writeOp := range writeOperations {
		if strings.Contains(operation, writeOp) {
			return true
		}
	}
	return false
}

func validateWalletSignature(c *gin.Context) error {
	// Get wallet address and signature from headers
	walletAddress := c.GetHeader("X-Wallet-Address")
	signature := c.GetHeader("X-Wallet-Signature")
	message := c.GetHeader("X-Signed-Message")

	if walletAddress == "" || signature == "" || message == "" {
		return fmt.Errorf("Web3 wallet authentication required: missing wallet address, signature, or signed message")
	}

	// Verify the signature
	if !verifyEthereumSignature(walletAddress, message, signature) {
		return fmt.Errorf("invalid Web3 wallet signature")
	}

	// Set wallet context
	c.Set("wallet_address", walletAddress)
	c.Set("authenticated", true)

	return nil
}

// verifyEthereumSignature verifies an Ethereum-style signature
// This works for any Ethereum-compatible wallet (MetaMask, Coinbase, etc.)
// and is compatible with Filecoin since it uses the same cryptography
func verifyEthereumSignature(address, message, signature string) bool {
	// Remove 0x prefix if present
	if strings.HasPrefix(signature, "0x") {
		signature = signature[2:]
	}
	if strings.HasPrefix(address, "0x") {
		address = address[2:]
	}

	// Decode signature
	sigBytes, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}

	// Ethereum signatures are 65 bytes long
	if len(sigBytes) != 65 {
		return false
	}

	// Ethereum uses recovery ID 27/28, but we need 0/1
	if sigBytes[64] >= 27 {
		sigBytes[64] -= 27
	}

	// Hash the message using Ethereum's signed message format
	// This is the standard format that MetaMask and other wallets use
	hash := crypto.Keccak256Hash([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)))

	// Recover public key from signature
	pubKey, err := crypto.SigToPub(hash.Bytes(), sigBytes)
	if err != nil {
		return false
	}

	// Get address from public key
	recoveredAddr := crypto.PubkeyToAddress(*pubKey)
	expectedAddr := strings.ToLower(address)
	actualAddr := strings.ToLower(recoveredAddr.Hex()[2:]) // Remove 0x prefix

	return expectedAddr == actualAddr
}
