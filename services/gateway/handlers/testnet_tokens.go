package handlers

import (
	"fmt"
	"net/http"
	"os/exec"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type TestnetTokenHandler struct {
	lotusPath string
}

type WalletInfo struct {
	Address string `json:"address"`
	Balance string `json:"balance"`
	Nonce   int    `json:"nonce"`
	Default bool   `json:"default"`
}

type SendTokenRequest struct {
	FromAddress string `json:"from_address" binding:"required"`
	ToAddress   string `json:"to_address" binding:"required"`
	Amount      string `json:"amount" binding:"required"`
}

type SendTokenResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"tx_hash,omitempty"`
	Message string `json:"message"`
}

func NewTestnetTokenHandler(lotusPath string) *TestnetTokenHandler {
	if lotusPath == "" {
		lotusPath = "./lotus" // Default path
	}
	return &TestnetTokenHandler{
		lotusPath: lotusPath,
	}
}

// ListWallets returns all wallets in the local testnet
func (h *TestnetTokenHandler) ListWallets(c *gin.Context) {
	cmd := exec.Command(h.lotusPath, "wallet", "list")
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list wallets",
			"details": err.Error(),
		})
		return
	}

	wallets := h.parseWalletList(string(output))
	c.JSON(http.StatusOK, gin.H{
		"wallets": wallets,
		"count":   len(wallets),
	})
}

// CreateWallet creates a new wallet address
func (h *TestnetTokenHandler) CreateWallet(c *gin.Context) {
	walletType := c.DefaultQuery("type", "secp256k1")

	var cmd *exec.Cmd
	if walletType == "delegated" {
		cmd = exec.Command(h.lotusPath, "wallet", "new", "delegated")
	} else {
		cmd = exec.Command(h.lotusPath, "wallet", "new")
	}

	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create wallet",
			"details": err.Error(),
		})
		return
	}

	address := strings.TrimSpace(string(output))
	c.JSON(http.StatusOK, gin.H{
		"address": address,
		"type":    walletType,
		"message": "Wallet created successfully",
	})
}

// GetBalance returns the balance of a specific wallet
func (h *TestnetTokenHandler) GetBalance(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	cmd := exec.Command(h.lotusPath, "wallet", "balance", address)
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get balance",
			"details": err.Error(),
		})
		return
	}

	balance := strings.TrimSpace(string(output))
	c.JSON(http.StatusOK, gin.H{
		"address": address,
		"balance": balance,
	})
}

// SendTokens sends FIL from one address to another
func (h *TestnetTokenHandler) SendTokens(c *gin.Context) {
	var req SendTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cmd := exec.Command(h.lotusPath, "send", "--from", req.FromAddress, req.ToAddress, req.Amount)
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, SendTokenResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to send tokens: %v", err),
		})
		return
	}

	txHash := strings.TrimSpace(string(output))
	c.JSON(http.StatusOK, SendTokenResponse{
		Success: true,
		TxHash:  txHash,
		Message: fmt.Sprintf("Successfully sent %s FIL from %s to %s", req.Amount, req.FromAddress, req.ToAddress),
	})
}

// GetPreminedWallet returns the pre-mined wallet for funding
func (h *TestnetTokenHandler) GetPreminedWallet(c *gin.Context) {
	cmd := exec.Command(h.lotusPath, "wallet", "list")
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list wallets",
			"details": err.Error(),
		})
		return
	}

	wallets := h.parseWalletList(string(output))
	var preminedWallet *WalletInfo

	for _, wallet := range wallets {
		// Look for wallet with large balance (pre-mined)
		if strings.Contains(wallet.Balance, "49999999") || wallet.Default {
			preminedWallet = &wallet
			break
		}
	}

	if preminedWallet == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "No pre-mined wallet found",
			"message": "Please ensure your local testnet is properly initialized",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"premined_wallet": preminedWallet,
		"message":         "Use this wallet to fund other addresses",
	})
}

// FundWallet provides a convenient endpoint to fund a wallet from pre-mined wallet
func (h *TestnetTokenHandler) FundWallet(c *gin.Context) {
	toAddress := c.Param("address")
	amount := c.DefaultQuery("amount", "1000")

	if toAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	// Get pre-mined wallet
	cmd := exec.Command(h.lotusPath, "wallet", "list")
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get wallets"})
		return
	}

	wallets := h.parseWalletList(string(output))
	var fromAddress string

	for _, wallet := range wallets {
		if strings.Contains(wallet.Balance, "49999999") || wallet.Default {
			fromAddress = wallet.Address
			break
		}
	}

	if fromAddress == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No pre-mined wallet found"})
		return
	}

	// Send tokens
	sendCmd := exec.Command(h.lotusPath, "send", "--from", fromAddress, toAddress, amount)
	sendOutput, err := sendCmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to send tokens",
			"details": err.Error(),
		})
		return
	}

	txHash := strings.TrimSpace(string(sendOutput))
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"tx_hash":      txHash,
		"from_address": fromAddress,
		"to_address":   toAddress,
		"amount":       amount + " FIL",
		"message":      "Tokens sent successfully",
	})
}

func (h *TestnetTokenHandler) parseWalletList(output string) []WalletInfo {
	var wallets []WalletInfo
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Address") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 4 {
			nonce, _ := strconv.Atoi(parts[3])
			wallet := WalletInfo{
				Address: parts[0],
				Balance: parts[1] + " " + parts[2],
				Nonce:   nonce,
				Default: len(parts) > 4 && parts[4] == "X",
			}
			wallets = append(wallets, wallet)
		}
	}

	return wallets
}
