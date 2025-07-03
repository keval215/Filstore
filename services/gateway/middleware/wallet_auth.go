package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
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
	signature = strings.TrimPrefix(signature, "0x")
	address = strings.TrimPrefix(address, "0x")

	// Decode signature
	sigBytes, err := hexutil.Decode("0x" + signature)
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

// FaucetRequest represents a request for testnet tokens
type FaucetRequest struct {
	WalletAddress string `json:"wallet_address" binding:"required"`
}

// BalanceResponse represents wallet balance information
type BalanceResponse struct {
	Address string `json:"address"`
	Balance string `json:"balance"`
	Status  string `json:"status"`
}

// CalibrationFaucetResponse represents the response from Calibration faucet
type CalibrationFaucetResponse struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

const (
	// Try Forest Explorer faucet as next option
	CALIBRATION_FAUCET_URL = "https://forest-explorer.chainsafe.dev/faucet/calibnet"
	CALIBRATION_RPC_URL    = "https://api.calibration.node.glif.io/rpc/v1"
	CALIBRATION_EXPLORER   = "https://beryx.zondax.ch/v1/search/fil/calibration/"
)

// GetTestnetTokens handles faucet requests using Calibration testnet
func GetTestnetTokens() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req FaucetRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
			})
			return
		}

		// Validate wallet address format
		if !isValidFilecoinAddress(req.WalletAddress) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid Filecoin wallet address format",
			})
			return
		}

		// Ensure this is a testnet address
		if !ValidateTestnetAddress(req.WalletAddress) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid testnet address",
				"message": "Calibration testnet addresses must start with 't' (e.g., t1...)",
				"example": "t1abc123...",
			})
			return
		}

		// Request tokens from Calibration faucet
		success, message, err := requestCalibrationFaucet(req.WalletAddress)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to request testnet tokens",
				"details": err.Error(),
			})
			return
		}

		if !success {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Faucet request failed",
				"message": message,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":      "Testnet tokens requested successfully",
			"details":      message,
			"recipient":    req.WalletAddress,
			"network":      "Calibration Testnet",
			"note":         "Tokens should arrive within a few minutes",
			"explorer":     GetCalibrationExplorerURL(req.WalletAddress),
			"rpc_endpoint": CALIBRATION_RPC_URL,
		})
	}
}

// GetWalletBalance retrieves the balance for a given wallet address using Calibration RPC
func GetWalletBalance() gin.HandlerFunc {
	return func(c *gin.Context) {
		address := c.Param("address")
		if address == "" {
			address = c.Query("address")
		}

		if address == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Wallet address is required",
			})
			return
		}

		if !isValidFilecoinAddress(address) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid Filecoin wallet address format",
			})
			return
		}

		balance, err := getCalibrationBalance(address)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to retrieve wallet balance",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, BalanceResponse{
			Address: address,
			Balance: balance,
			Status:  "success",
		})
	}
}

// requestCalibrationFaucet requests tokens from Calibration testnet faucet
func requestCalibrationFaucet(address string) (bool, string, error) {
	// Use ChainSafe Calibration faucet - this is a working faucet
	payload := map[string]string{
		"address": address,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return false, "", fmt.Errorf("failed to marshal JSON: %v", err)
	}

	req, err := http.NewRequest("POST", CALIBRATION_FAUCET_URL, bytes.NewBuffer(jsonData))
	if err != nil {
		return false, "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Filstore-Gateway/1.0")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, "", fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", fmt.Errorf("failed to read response: %v", err)
	}

	responseText := string(body)

	if resp.StatusCode == 200 {
		return true, fmt.Sprintf("Tokens successfully requested from faucet. Response: %s", responseText), nil
	}

	return false, fmt.Sprintf("Faucet request failed with HTTP %d: %s", resp.StatusCode, responseText), nil
}

// getCalibrationBalance retrieves balance using Calibration RPC
func getCalibrationBalance(address string) (string, error) {
	// RPC request payload for Filecoin.WalletBalance
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "Filecoin.WalletBalance",
		"params":  []string{address},
		"id":      1,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %v", err)
	}

	req, err := http.NewRequest("POST", CALIBRATION_RPC_URL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	var rpcResponse struct {
		Result string `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rpcResponse); err != nil {
		return "", fmt.Errorf("failed to decode response: %v", err)
	}

	if rpcResponse.Error != nil {
		return "", fmt.Errorf("RPC error: %s", rpcResponse.Error.Message)
	}

	return formatFilBalance(rpcResponse.Result), nil
}

// formatFilBalance converts attoFIL to human-readable FIL
func formatFilBalance(attoFil string) string {
	if attoFil == "0" || attoFil == "" {
		return "0 FIL"
	}

	// For production, you might want to convert attoFIL to FIL
	// 1 FIL = 10^18 attoFIL
	// For now, return both for clarity
	if len(attoFil) > 18 {
		// Rough conversion: divide by 10^18
		return fmt.Sprintf("%s attoFIL (~%.6f FIL)", attoFil, parseAttoFIL(attoFil))
	}

	return fmt.Sprintf("%s attoFIL", attoFil)
}

// parseAttoFIL converts attoFIL string to approximate FIL value
func parseAttoFIL(attoFil string) float64 {
	// Simple conversion for display purposes
	// In production, use big.Int for precise arithmetic
	if len(attoFil) <= 18 {
		return 0.0
	}

	// Take first few digits and convert
	if len(attoFil) > 6 {
		whole := attoFil[:len(attoFil)-18]
		decimal := attoFil[len(attoFil)-18 : len(attoFil)-12] // 6 decimal places

		var result float64
		fmt.Sscanf(whole+"."+decimal, "%f", &result)
		return result
	}

	return 0.0
}

// isValidFilecoinAddress validates Filecoin or EVM address format
func isValidFilecoinAddress(address string) bool {
	// Accept EVM addresses (0x...)
	if strings.HasPrefix(address, "0x") && len(address) == 42 {
		return true
	}
	// Filecoin addresses start with f (mainnet) or t (testnet) followed by 1,2,3,4
	patterns := []string{
		`^[ft]1[a-zA-Z0-9]{38,39}$`, // f1/t1 addresses (secp256k1) - can be 38 or 39 chars
		`^[ft]2[a-zA-Z0-9]{38,39}$`, // f2/t2 addresses (Actor) - can be 38 or 39 chars
		`^[ft]3[a-zA-Z0-9]{84,86}$`, // f3/t3 addresses (BLS) - can vary slightly
		`^[ft]4[a-fA-F0-9]{38,40}$`, // f4/t4 addresses (Ethereum-compatible, hex only)
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, address)
		if matched {
			return true
		}
	}
	return false
}

// VerifyAddressOnCalibration verifies an address exists on Calibration testnet
func VerifyAddressOnCalibration(address string) (bool, error) {
	// Use Beryx explorer API to verify address
	explorerURL := CALIBRATION_EXPLORER + address

	req, err := http.NewRequest("GET", explorerURL, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create explorer request: %v", err)
	}

	req.Header.Set("User-Agent", "Filstore-Gateway/1.0")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to query explorer: %v", err)
	}
	defer resp.Body.Close()

	// If we get a 200 response, the address exists
	if resp.StatusCode == 200 {
		return true, nil
	}

	return false, fmt.Errorf("address not found on Calibration testnet (HTTP %d)", resp.StatusCode)
}

// GetCalibrationExplorerURL returns the explorer URL for an address
func GetCalibrationExplorerURL(address string) string {
	return "https://beryx.zondax.ch/address/" + address + "?network=calibration"
}

// ValidateTestnetAddress specifically validates testnet addresses (starting with 't') or EVM addresses
func ValidateTestnetAddress(address string) bool {
	if strings.HasPrefix(address, "0x") && len(address) == 42 {
		return true
	}
	if !strings.HasPrefix(address, "t") {
		return false
	}
	return isValidFilecoinAddress(address)
}
