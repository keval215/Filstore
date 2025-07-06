const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class DataUpdater {
    constructor() {
        this.isUpdating = false;
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.publicDir = path.join(__dirname, 'web', 'public');
        this.gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        console.log('📊 Data Updater initialized - updating every 5 minutes');
    }

    startPeriodicUpdates() {
        // Update immediately on start
        setTimeout(() => this.updateAllNetworks(), 5000); // Wait 5s for services to be ready
        
        // Then update every 5 minutes
        setInterval(() => {
            this.updateAllNetworks();
        }, this.updateInterval);
    }

    async updateAllNetworks() {
        if (this.isUpdating) {
            console.log('⏭️ Update already in progress, skipping...');
            return;
        }

        this.isUpdating = true;
        console.log('🔄 Starting background data update...');

        try {
            await Promise.all([
                this.updateNetwork('mainnet'),
                this.updateNetwork('testnet')
            ]);
            console.log('✅ Background data update completed successfully');
        } catch (error) {
            console.error('❌ Background data update failed:', error.message);
        } finally {
            this.isUpdating = false;
        }
    }

    async updateNetwork(network) {
        try {
            console.log(`📡 Fetching ${network} data from gateway...`);
            
            // Try to fetch from gateway
            const response = await this.fetchWithTimeout(
                `${this.gatewayUrl}/api/${network}/deals?limit=100`,
                10000 // 10 second timeout
            );

            if (!response.ok) {
                throw new Error(`Gateway responded with ${response.status}`);
            }

            const data = await response.json();
            
            // Add metadata
            const enrichedData = {
                ...data,
                network: network,
                timestamp: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                update_source: 'gateway',
                update_status: 'success'
            };

            // Write to file
            const filePath = path.join(this.publicDir, `deals-${network}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(enrichedData, null, 2));
            
            console.log(`✅ Updated ${network} data: ${data.deals ? data.deals.length : 0} deals`);
            
        } catch (error) {
            console.error(`⚠️ Failed to update ${network} data:`, error.message);
            
            // Update metadata in existing file to show update failure
            try {
                const filePath = path.join(this.publicDir, `deals-${network}.json`);
                const existingData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
                existingData.last_update_attempt = new Date().toISOString();
                existingData.update_status = 'failed';
                existingData.update_error = error.message;
                
                await fs.promises.writeFile(filePath, JSON.stringify(existingData, null, 2));
            } catch (metaError) {
                console.error(`Failed to update metadata for ${network}:`, metaError.message);
            }
        }
    }

    async fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'FilStore-DataUpdater/1.0'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Manual update trigger (for API endpoint)
    async triggerManualUpdate(network = null) {
        if (this.isUpdating) {
            return { status: 'already_updating' };
        }

        try {
            if (network) {
                await this.updateNetwork(network);
                return { status: 'success', network, timestamp: new Date().toISOString() };
            } else {
                await this.updateAllNetworks();
                return { status: 'success', networks: ['mainnet', 'testnet'], timestamp: new Date().toISOString() };
            }
        } catch (error) {
            return { status: 'error', error: error.message, timestamp: new Date().toISOString() };
        }
    }

    getUpdateStatus() {
        return {
            isUpdating: this.isUpdating,
            updateInterval: this.updateInterval,
            lastUpdate: new Date().toISOString()
        };
    }
}

module.exports = DataUpdater;
