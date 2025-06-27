package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SystemStatus struct {
	Gateway    ServiceStatus `json:"gateway"`
	Engine     ServiceStatus `json:"engine"`
	Blockchain ServiceStatus `json:"blockchain"`
	Database   ServiceStatus `json:"database"`
	Redis      ServiceStatus `json:"redis"`
}

type ServiceStatus struct {
	Status      string `json:"status"`
	LastChecked string `json:"last_checked"`
	Version     string `json:"version"`
	Uptime      string `json:"uptime"`
}

func Status(c *gin.Context) {
	status := SystemStatus{
		Gateway: ServiceStatus{
			Status:      "healthy",
			LastChecked: "2025-06-26T10:00:00Z",
			Version:     "1.0.0",
			Uptime:      "5h 30m",
		},
		Engine: checkEngineStatus(),
		Blockchain: checkBlockchainStatus(),
		Database: checkDatabaseStatus(),
		Redis: checkRedisStatus(),
	}

	c.JSON(http.StatusOK, status)
}

func checkEngineStatus() ServiceStatus {
	// Check engine service health
	resp, err := http.Get("http://engine:9090/health")
	if err != nil {
		return ServiceStatus{Status: "unhealthy", LastChecked: "now"}
	}
	defer resp.Body.Close()

	var engineStatus ServiceStatus
	json.NewDecoder(resp.Body).Decode(&engineStatus)
	return engineStatus
}

func checkBlockchainStatus() ServiceStatus {
	// Check blockchain service health
	resp, err := http.Get("http://blockchain:3001/health")
	if err != nil {
		return ServiceStatus{Status: "unhealthy", LastChecked: "now"}
	}
	defer resp.Body.Close()

	var blockchainStatus ServiceStatus
	json.NewDecoder(resp.Body).Decode(&blockchainStatus)
	return blockchainStatus
}

func checkDatabaseStatus() ServiceStatus {
	// TODO: Implement database health check
	return ServiceStatus{
		Status:      "healthy",
		LastChecked: "now",
		Version:     "15.0",
		Uptime:      "5h 30m",
	}
}

func checkRedisStatus() ServiceStatus {
	// TODO: Implement Redis health check
	return ServiceStatus{
		Status:      "healthy",
		LastChecked: "now",
		Version:     "7.0",
		Uptime:      "5h 30m",
	}
}
