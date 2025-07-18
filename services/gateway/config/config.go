package config

import (
	"os"
)

type Config struct {
	Port           string
	EngineURL      string
	BlockchainURL  string
	RedisURL       string
	PostgresURL    string
	LogLevel       string
	AllowedOrigins []string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		EngineURL:     getEnv("ENGINE_URL", "http://localhost:9090"),
		BlockchainURL: getEnv("BLOCKCHAIN_URL", "http://localhost:3001"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		PostgresURL:   getEnv("POSTGRES_URL", "postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup"),
		LogLevel:      getEnv("LOG_LEVEL", "info"),
		AllowedOrigins: []string{
			getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
