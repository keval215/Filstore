package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000",
		"http://localhost:8080",
		"https://yourdomain.com",
		// Filecoin ecosystem services
		"https://web3.storage",
		"https://app.web3.storage",
		"https://singularity.storage",
		"https://boost.filecoin.io",
		"https://spade.storage",
		"https://cidgravity.com",
		"https://akave.ai",
		"https://filswan.com",
		// Development and testing
		"http://localhost:3001",
		"http://localhost:5000",
		"http://localhost:8081",
		// Filecoin testnet and local development
		"https://faucet.calibration.fildev.network",
		"https://calibration.fildev.network",
		"https://beryx.zondax.ch",
		"http://localhost:1234", // Local lotus node
		"http://localhost:2345", // Local lotus-miner
		"http://127.0.0.1:1234",
		"http://127.0.0.1:2345",
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
	config.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Authorization",
		"Accept",
		"X-Requested-With",
		// Filecoin/IPFS specific headers
		"X-CID",
		"X-Car-File",
		"X-Filecoin-Deal-ID",
		"X-Provider-ID",
		"X-Piece-CID",
		"X-Data-CID",
		"X-Storage-Price",
		"X-Deal-Duration",
		// API versioning and metadata
		"X-API-Version",
		"X-Client-Version",
		"X-Wallet-Address",
	}
	config.AllowCredentials = true

	return cors.New(config)
}
