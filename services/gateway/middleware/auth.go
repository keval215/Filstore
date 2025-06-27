package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip authentication for health endpoints
		if strings.HasSuffix(c.Request.URL.Path, "/health") {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		
		// TODO: Implement proper JWT validation
		if !validateToken(token) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", extractUserID(token))
		c.Next()
	}
}

func validateToken(token string) bool {
	// TODO: Implement JWT validation logic
	// For now, accept any non-empty token
	return token != ""
}

func extractUserID(token string) string {
	// TODO: Extract user ID from JWT token
	// For now, return a placeholder
	return "user_123"
}
