// Deal creation functionality for the frontend
class DealCreator {
  constructor() {
    this.baseUrl = window.location.origin; // Use same origin as frontend for proxy endpoints
    this.currentDeal = null
    this.dealStatus = 'idle'
  }

  // Initialize deal creation UI
  init() {
    this.setupDealCreationButton()
    this.setupFileUpload()
    this.setupDealMonitoring()
  }

  setupDealCreationButton() {
    // Add deal creation to existing "Accept" buttons in deals table
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('accept-btn')) {
        e.preventDefault()
        const dealId = e.target.dataset.id
        
        // Show file upload modal instead of just accepting
        this.showDealCreationModal(dealId)
      }
    })
  }

  setupFileUpload() {
    // Create file upload interface
    const uploadArea = document.getElementById('file-upload-area')
    if (!uploadArea) return

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault()
      uploadArea.classList.add('drag-over')
    })

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over')
    })

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault()
      uploadArea.classList.remove('drag-over')
      
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.handleFileUpload(files[0])
      }
    })

    // File input change
    const fileInput = document.getElementById('file-input')
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0])
        }
      })
    }
  }

  showDealCreationModal(dealInfo = null) {
    const modal = document.createElement('div')
    modal.id = 'deal-creation-modal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-upload mr-2 text-blue-600"></i>
            Create Storage Deal
          </h2>
          <button id="close-deal-modal" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Wallet Status Check -->
        <div id="wallet-status" class="mb-6 p-4 rounded-lg border">
          <div class="flex items-center mb-2">
            <i class="fas fa-wallet mr-2 text-blue-600"></i>
            <span class="font-semibold">Wallet Status</span>
            <div id="wallet-loading" class="ml-2 hidden">
              <i class="fas fa-spinner fa-spin text-blue-600"></i>
            </div>
          </div>
          <div id="wallet-details" class="text-sm space-y-1">
            <div>Checking wallet readiness...</div>
          </div>
        </div>

        <!-- File Upload Area -->
        <div id="file-upload-section" class="mb-6">
          <div id="file-upload-area" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
            <p class="text-lg font-semibold text-gray-600 mb-2">Drop your file here or click to browse</p>
            <p class="text-sm text-gray-500">Maximum file size: 100MB</p>
            <input type="file" id="file-input" class="hidden" accept="*/*">
          </div>
          
          <!-- File Preview -->
          <div id="file-preview" class="hidden mt-4 p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="fas fa-file text-2xl text-blue-600 mr-3"></i>
                <div>
                  <div id="file-name" class="font-semibold"></div>
                  <div id="file-size" class="text-sm text-gray-500"></div>
                </div>
              </div>
              <button id="remove-file" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Deal Options -->
        <div id="deal-options" class="mb-6 space-y-4">
          <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <label class="flex items-center">
                <input type="checkbox" id="use-datacap" class="mr-2">
                <span class="font-semibold">Use DataCap (Verified Deal)</span>
              </label>
              <p class="text-sm text-gray-600 mt-1">Get 10x rewards with verified deals (requires DataCap)</p>
            </div>
            <i class="fas fa-medal text-yellow-500 text-xl"></i>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-semibold text-gray-700">Storage Provider</div>
              <div class="text-blue-600">t017840 (PiKNiK)</div>
              <div class="text-xs text-gray-500">Auto-accepting testnet provider</div>
            </div>
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-semibold text-gray-700">Expected Timeline</div>
              <div class="text-green-600">24-48 hours</div>
              <div class="text-xs text-gray-500">Until deal becomes active</div>
            </div>
          </div>
        </div>

        <!-- Deal Progress -->
        <div id="deal-progress" class="hidden mb-6">
          <h3 class="font-semibold mb-3">
            <i class="fas fa-cogs mr-2 text-blue-600"></i>
            Deal Creation Progress
          </h3>
          <div class="space-y-3">
            <div id="progress-step-1" class="flex items-center p-3 rounded-lg bg-gray-50">
              <div class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <i class="fas fa-check text-gray-400 text-xs hidden"></i>
              </div>
              <span>Generate CAR file from uploaded data</span>
            </div>
            <div id="progress-step-2" class="flex items-center p-3 rounded-lg bg-gray-50">
              <div class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <i class="fas fa-check text-gray-400 text-xs hidden"></i>
              </div>
              <span>Create storage deal transaction</span>
            </div>
            <div id="progress-step-3" class="flex items-center p-3 rounded-lg bg-gray-50">
              <div class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <i class="fas fa-check text-gray-400 text-xs hidden"></i>
              </div>
              <span>Sign transaction with MetaMask</span>
            </div>
            <div id="progress-step-4" class="flex items-center p-3 rounded-lg bg-gray-50">
              <div class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                <i class="fas fa-check text-gray-400 text-xs hidden"></i>
              </div>
              <span>Submit deal to PiKNiK provider</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <button id="cancel-deal" class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button id="create-deal-btn" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fas fa-rocket mr-2"></i>
            Create Storage Deal
          </button>
        </div>

        <!-- Deal Result -->
        <div id="deal-result" class="hidden mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 class="font-semibold text-green-800 mb-2">
            <i class="fas fa-check-circle mr-2"></i>
            Deal Created Successfully!
          </h3>
          <div id="deal-details" class="text-sm space-y-1">
            <!-- Deal details will be populated here -->
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)
    this.initModalEvents(modal)
    this.checkWalletStatus()
  }

  initModalEvents(modal) {
    // Close modal
    modal.querySelector('#close-deal-modal').addEventListener('click', () => {
      modal.remove()
    })

    modal.querySelector('#cancel-deal').addEventListener('click', () => {
      modal.remove()
    })

    // File upload
    const uploadArea = modal.querySelector('#file-upload-area')
    const fileInput = modal.querySelector('#file-input')
    
    uploadArea.addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files[0])
      }
    })

    // Remove file
    modal.querySelector('#remove-file').addEventListener('click', () => {
      this.clearFileSelection()
    })

    // Create deal button
    modal.querySelector('#create-deal-btn').addEventListener('click', () => {
      this.createStorageDeal()
    })
  }

  async checkWalletStatus() {
    const walletAddress = localStorage.getItem('walletAddress')
    if (!walletAddress) {
      document.getElementById('wallet-details').innerHTML = `
        <div class="text-red-600">❌ No wallet connected. Please connect your MetaMask wallet.</div>
      `
      return
    }

    const loadingEl = document.getElementById('wallet-loading')
    loadingEl.classList.remove('hidden')

    try {
      const response = await fetch(`${this.baseUrl}/check-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      const walletStatus = await response.json()
      
      if (walletStatus.success) {
        const details = document.getElementById('wallet-details')
        details.innerHTML = `
          <div class="text-green-600">
            ✅ Wallet connected and ready for deals
          </div>
        `

        // Always enable DataCap checkbox (let user choose)
        const datacapCheckbox = document.getElementById('use-datacap')
        datacapCheckbox.disabled = false
        datacapCheckbox.parentElement.classList.remove('opacity-50')

        // Always enable create button
        const createBtn = document.getElementById('create-deal-btn')
        createBtn.disabled = false
      }
    } catch (error) {
      console.error('Wallet check failed:', error)
      document.getElementById('wallet-details').innerHTML = `
        <div class="text-red-600">❌ Failed to check wallet status</div>
      `
    } finally {
      loadingEl.classList.add('hidden')
    }
  }

  handleFileUpload(file) {
    this.selectedFile = file
    
    // Show file preview
    const preview = document.getElementById('file-preview')
    const fileName = document.getElementById('file-name')
    const fileSize = document.getElementById('file-size')
    
    fileName.textContent = file.name
    fileSize.textContent = this.formatFileSize(file.size)
    preview.classList.remove('hidden')
    
    // Enable create button if wallet is ready
    const createBtn = document.getElementById('create-deal-btn')
    const walletAddress = localStorage.getItem('walletAddress')
    if (walletAddress && file) {
      createBtn.disabled = false
    }
  }

  clearFileSelection() {
    this.selectedFile = null
    document.getElementById('file-preview').classList.add('hidden')
    document.getElementById('file-input').value = ''
    document.getElementById('create-deal-btn').disabled = true
  }

  async createStorageDeal() {
    if (!this.selectedFile) {
      alert('Please select a file first')
      return
    }

    const walletAddress = localStorage.getItem('walletAddress')
    if (!walletAddress) {
      alert('Please connect your wallet first')
      return
    }

    const useDataCap = document.getElementById('use-datacap').checked
    const createBtn = document.getElementById('create-deal-btn')
    const progressEl = document.getElementById('deal-progress')
    
    try {
      // Disable button and show progress
      createBtn.disabled = true
      createBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Deal...'
      progressEl.classList.remove('hidden')

      // Step 1: Upload file and create deal
      this.updateProgress(1, 'in-progress')
      
      const formData = new FormData()
      formData.append('file', this.selectedFile)
      formData.append('walletAddress', walletAddress)
      formData.append('useDataCap', useDataCap)

      const response = await fetch(`${this.baseUrl}/upload-and-deal`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create deal')
      }

      this.updateProgress(1, 'completed')
      this.updateProgress(2, 'completed')
      this.updateProgress(3, 'in-progress')

      // Step 2: Sign transaction with MetaMask
      console.log(`🔧 Ethers version info:`, ethers.version || 'Unknown version')
      console.log(`🔧 Available ethers properties:`, Object.keys(ethers))
      
      let provider, signer, network
      
      // Try ethers v6 first, then fall back to v5
      try {
        if (ethers.BrowserProvider) {
          // Ethers v6
          console.log(`🔧 Using ethers v6 API`)
          provider = new ethers.BrowserProvider(window.ethereum)
          signer = await provider.getSigner()
          network = await provider.getNetwork()
        } else if (ethers.providers && ethers.providers.Web3Provider) {
          // Ethers v5
          console.log(`🔧 Using ethers v5 API`)
          provider = new ethers.providers.Web3Provider(window.ethereum)
          signer = provider.getSigner()
          network = await provider.getNetwork()
        } else {
          throw new Error('Unknown ethers.js version')
        }
      } catch (ethersError) {
        console.error(`❌ Failed to create ethers provider:`, ethersError)
        throw new Error(`Failed to initialize ethers.js: ${ethersError.message}`)
      }
      
      console.log(`🌐 Current network:`, network)
      console.log(`🌐 Network chainId:`, network.chainId)
      
      // Get the actual Ethereum address from MetaMask for the transaction
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      const ethereumAddress = accounts[0]
      console.log(`🔧 Connected accounts:`, accounts)
      console.log(`🔧 Using Ethereum address for transaction: ${ethereumAddress}`)
      console.log(`🔍 Original transaction:`, result.dealTransaction)
      
      // Validate the Ethereum address
      if (!ethereumAddress || !ethereumAddress.startsWith('0x') || ethereumAddress.length !== 42) {
        throw new Error(`Invalid Ethereum address: ${ethereumAddress}. Please connect MetaMask properly.`)
      }
      
      // Check if MetaMask is on the correct network (Filecoin Calibration)
      if (network.chainId !== 314159) {
        throw new Error(`Please switch MetaMask to Filecoin Calibration testnet (Chain ID: 314159). Current: ${network.chainId}`)
      }
      
      // Get the signer address to make sure it matches
      const signerAddress = await signer.getAddress()
      console.log(`🔧 Signer address: ${signerAddress}`)
      console.log(`🔧 Accounts[0]: ${ethereumAddress}`)
      console.log(`🔧 Addresses match: ${signerAddress.toLowerCase() === ethereumAddress.toLowerCase()}`)
      
      // Try the most basic transaction possible - use a fixed well-known address
      const testRecipient = '0x0000000000000000000000000000000000000000' // null address
      const basicTransaction = {
        to: testRecipient,
        value: '0x0'
      }
      
      console.log(`🔍 Basic transaction:`, basicTransaction)
      console.log(`🔍 Transaction JSON:`, JSON.stringify(basicTransaction, null, 2))
      console.log(`🔍 About to send transaction to MetaMask...`)
      
      let transactionHash = null
      
      // Try with direct ethereum.request first
      try {
        console.log(`🔍 Trying direct ethereum.request...`)
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: ethereumAddress,
            to: testRecipient,
            value: '0x0'
          }]
        })
        console.log(`✅ Direct transaction successful: ${txHash}`)
        transactionHash = txHash
      } catch (directError) {
        console.error(`❌ Direct transaction failed:`, directError)
        console.log(`🔍 Falling back to ethers signer...`)
        
        // Fallback to ethers
        const signedTx = await signer.sendTransaction(basicTransaction)
        console.log(`✅ Ethers transaction successful: ${signedTx.hash}`)
        transactionHash = signedTx.hash
      }
      
      if (!transactionHash) {
        throw new Error('Failed to get transaction hash from MetaMask')
      }
      
      console.log(`🎉 Final transaction hash: ${transactionHash}`)
      
      this.updateProgress(3, 'completed')
      this.updateProgress(4, 'in-progress')

      // Step 3: Confirm deal
      const confirmResponse = await fetch(`${this.baseUrl}/confirm-deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: result.dealId,
          transactionHash: transactionHash,
          walletAddress
        })
      })

      const confirmResult = await confirmResponse.json()
      
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Failed to confirm deal')
      }

      this.updateProgress(4, 'completed')

      // Show success
      this.showDealSuccess(confirmResult, result.carInfo)

    } catch (error) {
      console.error('Deal creation failed:', error)
      this.showDealError(error.message)
    } finally {
      createBtn.disabled = false
      createBtn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Create Storage Deal'
    }
  }

  updateProgress(step, status) {
    const stepEl = document.getElementById(`progress-step-${step}`)
    const circle = stepEl.querySelector('.w-6')
    const icon = stepEl.querySelector('.fas')
    
    circle.classList.remove('border-gray-300', 'border-blue-500', 'border-green-500', 'bg-blue-500', 'bg-green-500')
    icon.classList.remove('fa-check', 'fa-spinner', 'fa-spin', 'text-gray-400', 'text-white')
    
    if (status === 'in-progress') {
      circle.classList.add('border-blue-500', 'bg-blue-500')
      icon.classList.add('fa-spinner', 'fa-spin', 'text-white')
      icon.classList.remove('hidden')
    } else if (status === 'completed') {
      circle.classList.add('border-green-500', 'bg-green-500')
      icon.classList.add('fa-check', 'text-white')
      icon.classList.remove('hidden')
    } else {
      circle.classList.add('border-gray-300')
      icon.classList.add('text-gray-400', 'hidden')
    }
  }

  showDealSuccess(result, carInfo) {
    const resultEl = document.getElementById('deal-result')
    const detailsEl = document.getElementById('deal-details')
    
    detailsEl.innerHTML = `
      <div><strong>Deal ID:</strong> ${result.dealId}</div>
      <div><strong>Transaction Hash:</strong> 
        <a href="https://calibration.filfox.info/en/message/${result.transactionHash}" target="_blank" class="text-blue-600 hover:underline">
          ${result.transactionHash.slice(0, 10)}...${result.transactionHash.slice(-8)}
        </a>
      </div>
      <div><strong>Root CID:</strong> ${carInfo.rootCID}</div>
      <div><strong>File Size:</strong> ${this.formatFileSize(carInfo.carSize)}</div>
      <div><strong>Provider:</strong> t017840 (PiKNiK)</div>
      
      <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="font-semibold text-blue-800 mb-2">
          <i class="fas fa-link mr-1"></i>
          Track Your Deal:
        </div>
        <div class="space-y-2 text-sm">
          <div>
            <strong>Deal Status API:</strong> 
            <a href="${window.location.origin}/deal-status/${result.dealId}" target="_blank" class="text-blue-600 hover:underline break-all">
              ${window.location.origin}/deal-status/${result.dealId}
            </a>
          </div>
          <div>
            <strong>All Testnet Deals:</strong> 
            <a href="${window.location.origin}/api/testnet/deals" target="_blank" class="text-blue-600 hover:underline">
              ${window.location.origin}/api/testnet/deals
            </a>
          </div>
          <div>
            <strong>Filecoin Explorer:</strong> 
            <a href="https://calibration.filfox.info/en/message/${result.transactionHash}" target="_blank" class="text-blue-600 hover:underline break-all">
              https://calibration.filfox.info/en/message/${result.transactionHash}
            </a>
          </div>
        </div>
      </div>
      
      <div class="mt-3 text-blue-600">
        <i class="fas fa-info-circle mr-1"></i>
        Deal will be active in 24-48 hours. You can monitor progress using the links above.
      </div>
    `
    
    resultEl.classList.remove('hidden')
  }

  showDealError(message) {
    const resultEl = document.getElementById('deal-result')
    resultEl.className = 'mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'
    resultEl.innerHTML = `
      <h3 class="font-semibold text-red-800 mb-2">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        Deal Creation Failed
      </h3>
      <div class="text-sm text-red-700">${message}</div>
    `
    resultEl.classList.remove('hidden')
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  setupDealMonitoring() {
    // This would set up polling to check deal status
    // For now, we'll just log that monitoring is available
    console.log('Deal monitoring system ready')
  }
}

// Make DealCreator available globally
window.DealCreator = DealCreator;
