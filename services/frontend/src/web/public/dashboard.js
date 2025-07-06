// Dashboard JavaScript functionality
class BackupDashboard {
    constructor() {
        this.apiBaseUrl = '/api/v1/web';
        this.authToken = localStorage.getItem('auth_token');
        this.init();
    }

    async init() {
        // Check authentication first
        if (!this.checkAuthentication()) {
            this.redirectToLogin();
            return;
        }

        // Load user info
        this.loadUserInfo();

        await this.loadDashboardData();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }

    checkAuthentication() {
        return !!this.authToken;
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    loadUserInfo() {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userInfo.username) {
            document.getElementById('username').textContent = userInfo.username;
        }
    }

    async loadDashboardData() {
        try {
            const [dashboardData, backups] = await Promise.all([
                this.fetchData('/dashboard'),
                this.fetchData('/backups')
            ]);

            this.updateStats(dashboardData.stats);
            this.updateRecentBackups(dashboardData.recentBackups);
            this.updateSystemHealth(dashboardData.systemHealth);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            
            // If unauthorized, redirect to login
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.redirectToLogin();
                return;
            }
            
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    async fetchData(endpoint) {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add auth token if available
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            headers: headers
        });

        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Unauthorized - redirecting to login');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    updateStats(stats) {
        document.getElementById('total-backups').textContent = stats.totalBackups;
        document.getElementById('successful-backups').textContent = stats.successfulBackups;
        document.getElementById('failed-backups').textContent = stats.failedBackups;
        document.getElementById('total-storage').textContent = stats.totalStorage;
    }

    updateRecentBackups(backups) {
        const container = document.getElementById('recent-backups');
        container.innerHTML = '';

        backups.forEach(backup => {
            const backupElement = this.createBackupElement(backup);
            container.appendChild(backupElement);
        });
    }

    createBackupElement(backup) {
        const div = document.createElement('div');
        div.className = 'backup-item p-4 border rounded-lg hover:shadow-md transition-all';
        
        const statusClass = this.getStatusClass(backup.status);
        const progressBar = backup.status === 'running' ? 
            `<div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div class="progress-bar h-2 rounded-full" style="width: ${backup.progress}%"></div>
            </div>` : '';

        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">${backup.name}</h3>
                    <p class="text-sm text-gray-600">${backup.size}</p>
                    <div class="flex items-center mt-1">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="text-sm capitalize ${this.getStatusTextClass(backup.status)}">${backup.status}</span>
                    </div>
                    ${progressBar}
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">${this.formatDate(backup.date)}</p>
                    <button class="text-blue-600 hover:text-blue-800 text-sm mt-1" onclick="dashboard.viewBackup('${backup.id}')">
                        View
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    updateSystemHealth(health) {
        const container = document.getElementById('system-health');
        container.innerHTML = '';

        Object.entries(health).forEach(([service, status]) => {
            const healthElement = this.createHealthElement(service, status);
            container.appendChild(healthElement);
        });
    }

    createHealthElement(service, status) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-2';
        
        const statusClass = this.getStatusClass(status);
        
        div.innerHTML = `
            <div class="flex items-center">
                <span class="status-indicator ${statusClass}"></span>
                <span class="capitalize font-medium">${service}</span>
            </div>
            <span class="text-sm capitalize ${this.getStatusTextClass(status)}">${status}</span>
        `;

        return div;
    }

    getStatusClass(status) {
        switch (status) {
            case 'healthy':
            case 'completed':
                return 'status-healthy';
            case 'running':
            case 'pending':
                return 'status-warning';
            case 'failed':
            case 'error':
                return 'status-error';
            default:
                return 'status-warning';
        }
    }

    getStatusTextClass(status) {
        switch (status) {
            case 'healthy':
            case 'completed':
                return 'text-green-600';
            case 'running':
            case 'pending':
                return 'text-yellow-600';
            case 'failed':
            case 'error':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    setupEventListeners() {
        // New backup button
        document.getElementById('new-backup-btn').addEventListener('click', () => {
            this.showBackupModal();
        });

        // Modal close buttons
        document.getElementById('cancel-backup').addEventListener('click', () => {
            this.hideBackupModal();
        });

        // Backup form submission
        document.getElementById('backup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBackup();
        });

        // Close modal when clicking outside
        document.getElementById('backup-modal').addEventListener('click', (e) => {
            if (e.target.id === 'backup-modal') {
                this.hideBackupModal();
            }
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showNotification('Settings panel coming soon!', 'info');
        });

        // Restore button - integrate with FileRetrievalManager
        document.getElementById('restore-btn').addEventListener('click', () => {
            if (window.FileRetrievalManager) {
                window.FileRetrievalManager.showRetrievalModal();
            } else {
                this.showNotification('Retrieval system not available', 'error');
            }
        });
    }

    showBackupModal() {
        const modal = document.getElementById('backup-modal');
        modal.classList.remove('hidden');
        modal.querySelector('.bg-white').classList.add('modal-enter');
    }

    hideBackupModal() {
        const modal = document.getElementById('backup-modal');
        modal.classList.add('hidden');
        this.clearBackupForm();
    }

    clearBackupForm() {
        document.getElementById('backup-name').value = '';
        document.getElementById('backup-files').value = '';
        document.getElementById('enable-compression').checked = false;
        document.getElementById('enable-encryption').checked = false;
    }

    async createBackup() {
        const name = document.getElementById('backup-name').value;
        const filesText = document.getElementById('backup-files').value;
        const compression = document.getElementById('enable-compression').checked;
        const encryption = document.getElementById('enable-encryption').checked;

        const files = filesText.split('\n').filter(file => file.trim() !== '');

        if (files.length === 0) {
            this.showNotification('Please specify at least one file or folder', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/backups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    files: files,
                    options: {
                        compression: compression,
                        encryption: encryption
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create backup');
            }

            const result = await response.json();
            this.showNotification(`Backup "${name}" created successfully!`, 'success');
            this.hideBackupModal();
            
            // Refresh the dashboard
            setTimeout(() => {
                this.loadDashboardData();
            }, 1000);

        } catch (error) {
            console.error('Error creating backup:', error);
            this.showNotification('Failed to create backup', 'error');
        }
    }

    viewBackup(backupId) {
        // TODO: Implement backup details view
        this.showNotification(`Viewing backup details for ${backupId}`, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show the notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide and remove the notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }

    startPeriodicUpdates() {
        // Update dashboard every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);

        // Update system status every 10 seconds
        setInterval(() => {
            this.updateSystemStatus();
        }, 10000);
    }

    logout() {
        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        
        // Redirect to login
        window.location.href = '/login.html';
    }
}

// Global logout function for the logout button
function logout() {
    if (window.dashboard) {
        window.dashboard.logout();
    } else {
        // Fallback if dashboard instance not available
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login.html';
    }
}

// Initialize the dashboard when the page loads
const dashboard = new BackupDashboard();
window.dashboard = dashboard; // Make it globally available

document.addEventListener('DOMContentLoaded', () => {
    // ...existing initialization code...
    const address = localStorage.getItem('walletAddress');
    if (address) {
        const el = document.getElementById('wallet-address');
        if (el) el.innerText = `Connected: ${address}`;
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N for new backup
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        dashboard.showBackupModal();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        dashboard.hideBackupModal();
    }
});
