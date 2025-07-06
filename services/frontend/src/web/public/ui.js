// UI enhancements for wallet connection and file retrieval

document.addEventListener('DOMContentLoaded', function() {
  const walletInfo = document.getElementById('wallet-info');
  const walletAddress = document.getElementById('wallet-address');
  const connectBtn = document.getElementById('connect-wallet-btn');
  const disconnectBtn = document.getElementById('disconnect-wallet-btn');
  const dashboardContent = document.getElementById('dashboard-content');
  const walletNotice = document.getElementById('wallet-required-notice');

  function updateUI(address) {
    if (address) {
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = `Connected: ${address}`;
      connectBtn.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
      dashboardContent.classList.remove('hidden');
      walletNotice.classList.add('hidden');
      
      // Initialize retrieval functionality when wallet is connected
      if (window.FileRetrievalManager) {
        window.FileRetrievalManager.init();
      }
    } else {
      walletInfo.classList.add('hidden');
      connectBtn.classList.remove('hidden');
      disconnectBtn.classList.add('hidden');
      dashboardContent.classList.add('hidden');
      walletNotice.classList.remove('hidden');
    }
  }

  // On load, check for wallet
  const stored = localStorage.getItem('walletAddress');
  updateUI(stored);

  // Disconnect logic
  disconnectBtn.onclick = function() {
    localStorage.removeItem('walletAddress');
    updateUI(null);
  };

  // Listen for wallet connect from MetaMask logic
  window.addEventListener('walletConnected', function(e) {
    updateUI(e.detail.address);
  });
});

// File Retrieval Manager Class
class FileRetrievalManager {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8080/api/v1';
    this.walletAddress = localStorage.getItem('walletAddress');
    this.retrievalJobs = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    this.walletAddress = localStorage.getItem('walletAddress');
    if (!this.walletAddress) {
      console.warn('No wallet address found for retrieval manager');
      return;
    }

    this.setupEventListeners();
    this.loadUserFiles();
    this.isInitialized = true;
    console.log('File Retrieval Manager initialized');
  }

  setupEventListeners() {
    // Setup restore button
    const restoreBtn = document.getElementById('restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => this.showRetrievalModal());
    }

    // Setup retrieval modal events
    this.setupModalEvents();
  }

  setupModalEvents() {
    // Create modal if it doesn't exist
    if (!document.getElementById('retrieval-modal')) {
      this.createRetrievalModal();
    }

    // Setup modal close events
    const modal = document.getElementById('retrieval-modal');
    const closeBtn = document.getElementById('retrieval-modal-close');
    const overlay = document.getElementById('retrieval-modal-overlay');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideRetrievalModal());
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.hideRetrievalModal());
    }
  }

  createRetrievalModal() {
    const modalHTML = `
      <div id="retrieval-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div id="retrieval-modal-overlay" class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div class="flex justify-between items-center p-6 border-b">
              <h2 class="text-2xl font-bold text-gray-800">File Retrieval</h2>
              <button id="retrieval-modal-close" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <!-- File List Section -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">Your Files</h3>
                <div id="retrieval-file-list" class="space-y-3">
                  <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Loading your files...</p>
                  </div>
                </div>
              </div>

              <!-- Retrieval Jobs Section -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">Active Retrieval Jobs</h3>
                <div id="retrieval-jobs-list" class="space-y-3">
                  <p class="text-gray-500 text-center py-4">No active retrieval jobs</p>
                </div>
              </div>

              <!-- New Retrieval Section -->
              <div class="border-t pt-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">Start New Retrieval</h3>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">File CID</label>
                    <input type="text" id="retrieval-cid-input" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Enter file CID (e.g., QmHash...)">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Format</label>
                    <select id="retrieval-format-select" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="original">Original</option>
                      <option value="car">CAR Archive</option>
                      <option value="metadata">Metadata Only</option>
                    </select>
                  </div>
                  <button id="start-retrieval-btn" 
                          class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
                    <i class="fas fa-download mr-2"></i>Start Retrieval
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup new retrieval button
    const startBtn = document.getElementById('start-retrieval-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startRetrieval());
    }
  }

  async loadUserFiles() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/retrieval/files`, {
        headers: {
          'X-Wallet-Address': this.walletAddress,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.displayUserFiles(data);
    } catch (error) {
      console.error('Failed to load user files:', error);
      this.showNotification('Failed to load files', 'error');
    }
  }

  displayUserFiles(data) {
    const fileList = document.getElementById('retrieval-file-list');
    if (!fileList) return;

    if (!data.files || data.files.length === 0) {
      fileList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-folder-open text-3xl mb-2"></i>
          <p>No files found</p>
          <p class="text-sm">Upload some files to see them here</p>
        </div>
      `;
      return;
    }

    fileList.innerHTML = data.files.map(file => `
      <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-800">${file.cid || 'Unknown'}</h4>
            <p class="text-sm text-gray-600">Size: ${this.formatFileSize(file.size || 0)}</p>
            <p class="text-sm text-gray-500">Type: ${file.content_type || 'Unknown'}</p>
          </div>
          <div class="flex space-x-2">
            <button onclick="window.FileRetrievalManager.downloadFile('${file.cid}')" 
                    class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
              <i class="fas fa-download mr-1"></i>Download
            </button>
            <button onclick="window.FileRetrievalManager.getFileMetadata('${file.cid}')" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
              <i class="fas fa-info-circle mr-1"></i>Info
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async startRetrieval() {
    const cidInput = document.getElementById('retrieval-cid-input');
    const formatSelect = document.getElementById('retrieval-format-select');
    const startBtn = document.getElementById('start-retrieval-btn');

    const cid = cidInput.value.trim();
    const format = formatSelect.value;

    if (!cid) {
      this.showNotification('Please enter a file CID', 'error');
      return;
    }

    // Disable button and show loading
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Starting...';

    try {
      const response = await fetch(`${this.apiBaseUrl}/retrieval`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': this.walletAddress,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cids: [cid],
          format: format
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.showNotification(`Retrieval started! Job ID: ${data.id}`, 'success');
      
      // Clear form
      cidInput.value = '';
      
      // Add to jobs list
      this.addRetrievalJob(data);
      
    } catch (error) {
      console.error('Failed to start retrieval:', error);
      this.showNotification('Failed to start retrieval', 'error');
    } finally {
      // Re-enable button
      startBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Start Retrieval';
    }
  }

  addRetrievalJob(job) {
    this.retrievalJobs.set(job.id, job);
    this.updateJobsList();
    
    // Start monitoring this job
    this.monitorJob(job.id);
  }

  async monitorJob(jobId) {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${this.apiBaseUrl}/retrieval/${jobId}`, {
          headers: {
            'X-Wallet-Address': this.walletAddress
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const job = await response.json();
        this.retrievalJobs.set(jobId, job);
        this.updateJobsList();

        // Continue monitoring if job is still active
        if (job.status === 'pending' || job.status === 'running') {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          // Job completed or failed
          if (job.status === 'completed') {
            this.showNotification(`Retrieval completed! Job ID: ${jobId}`, 'success');
          } else if (job.status === 'failed') {
            this.showNotification(`Retrieval failed! Job ID: ${jobId}`, 'error');
          }
        }
      } catch (error) {
        console.error('Failed to check job status:', error);
      }
    };

    checkStatus();
  }

  updateJobsList() {
    const jobsList = document.getElementById('retrieval-jobs-list');
    if (!jobsList) return;

    if (this.retrievalJobs.size === 0) {
      jobsList.innerHTML = '<p class="text-gray-500 text-center py-4">No active retrieval jobs</p>';
      return;
    }

    jobsList.innerHTML = Array.from(this.retrievalJobs.values()).map(job => `
      <div class="border rounded-lg p-4">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-800">Job ${job.id}</h4>
            <p class="text-sm text-gray-600">Status: <span class="font-medium ${this.getStatusColor(job.status)}">${job.status}</span></p>
            <p class="text-sm text-gray-500">Progress: ${job.progress || 0}%</p>
            ${job.message ? `<p class="text-sm text-gray-500">${job.message}</p>` : ''}
          </div>
          <div class="flex space-x-2">
            ${job.status === 'completed' ? 
              `<button onclick="window.FileRetrievalManager.downloadJobFiles('${job.id}')" 
                       class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                 <i class="fas fa-download mr-1"></i>Download
               </button>` : ''
            }
            ${job.status === 'pending' || job.status === 'running' ? 
              `<button onclick="window.FileRetrievalManager.cancelRetrieval('${job.id}')" 
                       class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                 <i class="fas fa-times mr-1"></i>Cancel
               </button>` : ''
            }
          </div>
        </div>
        ${job.status === 'running' ? `
          <div class="mt-3">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${job.progress || 0}%"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  async downloadFile(cid) {
    try {
      this.showNotification('Starting download...', 'info');
      
      const response = await fetch(`${this.apiBaseUrl}/retrieval/download/${cid}`, {
        headers: {
          'X-Wallet-Address': this.walletAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `file-${cid}.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.showNotification('Download completed!', 'success');
    } catch (error) {
      console.error('Failed to download file:', error);
      this.showNotification('Failed to download file', 'error');
    }
  }

  async getFileMetadata(cid) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/retrieval/metadata/${cid}`, {
        headers: {
          'X-Wallet-Address': this.walletAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();
      
      // Show metadata in a modal
      this.showMetadataModal(metadata);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      this.showNotification('Failed to get file metadata', 'error');
    }
  }

  showMetadataModal(metadata) {
    const modalHTML = `
      <div id="metadata-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div class="flex justify-between items-center p-6 border-b">
              <h2 class="text-xl font-bold text-gray-800">File Metadata</h2>
              <button onclick="this.closest('#metadata-modal').remove()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            <div class="p-6">
              <pre class="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">${JSON.stringify(metadata, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async cancelRetrieval(jobId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/retrieval/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': this.walletAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.showNotification('Retrieval cancelled successfully', 'success');
      this.retrievalJobs.delete(jobId);
      this.updateJobsList();
    } catch (error) {
      console.error('Failed to cancel retrieval:', error);
      this.showNotification('Failed to cancel retrieval', 'error');
    }
  }

  async downloadJobFiles(jobId) {
    const job = this.retrievalJobs.get(jobId);
    if (!job || !job.files) {
      this.showNotification('No files available for download', 'error');
      return;
    }

    this.showNotification('Starting batch download...', 'info');
    
    // Download each file in the job
    for (const file of job.files) {
      if (file.cid) {
        await this.downloadFile(file.cid);
      }
    }
  }

  showRetrievalModal() {
    const modal = document.getElementById('retrieval-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.loadUserFiles(); // Refresh file list
    }
  }

  hideRetrievalModal() {
    const modal = document.getElementById('retrieval-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Initialize File Retrieval Manager globally
window.FileRetrievalManager = new FileRetrievalManager(); 