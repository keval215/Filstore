package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// Store for rate limiters per IP
var limiters = make(map[string]*rate.Limiter)

func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		// Get or create limiter for this IP
		limiter, exists := limiters[ip]
		if !exists {
			// Allow 100 requests per 15 minutes
			limiter = rate.NewLimiter(rate.Every(15*time.Minute/100), 100)
			limiters[ip] = limiter
		}

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"message": "Too many requests from this IP address",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Clean up old limiters periodically
func init() {
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		
		for range ticker.C {
			// Clean up limiters that haven't been used recently
			for ip, limiter := range limiters {
				if limiter.Tokens() == float64(limiter.Burst()) {
					delete(limiters, ip)
				}
			}
		}
	}()
}
