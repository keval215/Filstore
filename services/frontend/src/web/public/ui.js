// Format price function for displaying FIL amounts (global scope)
function formatPrice(attoFIL) {
    if (!attoFIL || attoFIL === 0) return 'Free';
    
    // Keep in attoFIL but make it readable with k/M/B suffixes
    const value = parseFloat(attoFIL);
    
    if (value >= 1e12) {
        return `${(value / 1e12).toFixed(1)}T attoFIL`;
    } else if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1)}B attoFIL`;
    } else if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M attoFIL`;
    } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}k attoFIL`;
    } else {
        return `${value.toFixed(0)} attoFIL`;
    }
}

// UI enhancements for wallet connection
document.addEventListener('DOMContentLoaded', function() {
  // Force home page for debugging
  localStorage.removeItem('walletAddress');
  const home = document.getElementById('home-section');
  const dash = document.getElementById('dashboard-section');
  if (home && dash) {
    home.classList.remove('hidden');
    dash.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const walletInfo = document.getElementById('wallet-info');
  const walletAddress = document.getElementById('wallet-address');
  const connectBtn = document.getElementById('connect-wallet-btn');
  const disconnectBtn = document.getElementById('disconnect-wallet-btn');
  const walletBar = document.getElementById('wallet-bar');
  const walletBarAddress = document.getElementById('wallet-bar-address');
  const walletBarDisconnect = document.getElementById('wallet-bar-disconnect');
  const walletBarCopy = document.getElementById('wallet-bar-copy');
  const walletBarCopyFeedback = document.getElementById('wallet-bar-copy-feedback');

  // Log missing elements for debugging
  if (!walletInfo) console.error('Missing #wallet-info');
  if (!walletAddress) console.error('Missing #wallet-address');
  if (!connectBtn) console.error('Missing #connect-wallet-btn');
  if (!disconnectBtn) console.error('Missing #disconnect-wallet-btn');

  // Helper to shorten address
  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 5) + '...' + addr.slice(-4);
  }

  function updateUI(address) {
    if (!walletInfo || !walletAddress || !connectBtn || !disconnectBtn) return;
    // Wallet bar logic
    if (walletBar && walletBarAddress && walletBarDisconnect) {
      if (address) {
        walletBar.classList.remove('hidden');
        walletBarAddress.textContent = shortenAddress(address);
        walletBarAddress.title = address;
        if (walletBarCopy) walletBarCopy.disabled = false;
      } else {
        walletBar.classList.add('hidden');
        walletBarAddress.textContent = '';
        walletBarAddress.title = '';
        if (walletBarCopy) walletBarCopy.disabled = true;
      }
      if (walletBarCopyFeedback) walletBarCopyFeedback.classList.add('hidden');
    }
    // Main UI logic
    if (address) {
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = `Connected: ${address}`;
      connectBtn.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
    } else {
      walletInfo.classList.add('hidden');
      connectBtn.classList.remove('hidden');
      disconnectBtn.classList.add('hidden');
      walletAddress.textContent = 'Not Connected';
    }
  }

  // Section toggle logic (home/dashboard)
  function showSections(address) {
    const home = document.getElementById('home-section');
    const dash = document.getElementById('dashboard-section');
    if (home && dash) {
      if (address) {
        home.classList.add('hidden');
        dash.classList.remove('hidden');
      } else {
        home.classList.remove('hidden');
        dash.classList.add('hidden');
      }
    }
  }

  // Always check walletAddress on page load
  function checkWalletOnLoad() {
    const stored = localStorage.getItem('walletAddress');
    updateUI(stored);
    showSections(stored);
  }

  // Top-right disconnect button logic
  if (walletBarDisconnect) {
    walletBarDisconnect.onclick = function() {
      localStorage.removeItem('walletAddress');
      updateUI(null);
      showSections(null);
    };
  }

  // Listen for wallet connect from MetaMask logic
  window.addEventListener('walletConnected', function(e) {
    if (e.detail.address) {
      localStorage.setItem('walletAddress', e.detail.address);
    } else {
      localStorage.removeItem('walletAddress');
    }
    updateUI(e.detail.address);
    showSections(e.detail.address);
  });

  // Fallback: if wallet is disconnected, always show home
  window.addEventListener('storage', function(e) {
    if (e.key === 'walletAddress' && !e.newValue) {
      updateUI(null);
      showSections(null);
    }
  });

  // Copy to clipboard logic
  if (walletBarCopy) {
    walletBarCopy.onclick = function() {
      const addr = localStorage.getItem('walletAddress');
      if (addr) {
        navigator.clipboard.writeText(addr).then(() => {
          if (walletBarCopyFeedback) {
            walletBarCopyFeedback.classList.remove('hidden');
            setTimeout(() => walletBarCopyFeedback.classList.add('hidden'), 1200);
          }
        });
      }
    };
  }

  // Always check wallet on every page load
  checkWalletOnLoad();
});

// --- Filecoin Deals Dashboard Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const mainnetBtn = document.getElementById('mainnet-btn');
    const testnetBtn = document.getElementById('testnet-btn');
    const refreshBtn = document.getElementById('refresh-data-btn');
    const dealsTbody = document.getElementById('deals-tbody');
    const dealsLoading = document.getElementById('deals-loading');
    let currentNetwork = 'mainnet';

    async function fetchDeals(network) {
        dealsLoading.classList.remove('hidden');
        dealsTbody.innerHTML = '';
        let apiUrl = network === 'mainnet'
            ? `/api/mainnet/deals?limit=50&_=${Date.now()}`
            : `/api/testnet/deals?limit=50&_=${Date.now()}`;
        
        try {
            console.log('📊 Fetching deals from local JSON files via API:', apiUrl);
            const resp = await fetch(apiUrl);
            const data = await resp.json();
            console.log('✅ Loaded deals from JSON:', data);
            
            // Show data freshness info
            if (data.timestamp || data.last_updated) {
                const timestamp = data.timestamp || data.last_updated;
                const updateTime = new Date(timestamp).toLocaleString();
                console.log(`📅 Data last updated: ${updateTime}`);
                
                // You could show this in the UI if desired
                // const infoElement = document.getElementById('data-info');
                // if (infoElement) infoElement.textContent = `Last updated: ${updateTime}`;
            }
            
            // Render deals from JSON file
            renderDeals(data.deals || [], data);
        } catch (e) {
            console.error('❌ Failed to fetch deals:', e);
            dealsTbody.innerHTML = `<tr><td colspan="10" class="text-center text-red-500 py-4">Failed to load deals</td></tr>`;
        } finally {
            dealsLoading.classList.add('hidden');
        }
    }

    function renderDeals(deals, metadata = {}) {
        // Show all deals in scrollable container
        if (!deals.length) {
            dealsTbody.innerHTML = `<tr><td colspan="10" class="text-center text-gray-400 py-8">No deals found</td></tr>`;
            return;
        }
        
        dealsTbody.innerHTML = deals.map(deal => {
            const pieceSizeGB = (deal.piece_size / (1024 ** 3)).toFixed(2);
            const priceFIL = deal.storage_price && deal.storage_price !== '0' ?
                formatPrice(parseFloat(deal.storage_price)) : 'Free';
            const verifiedBadge = deal.verified_deal ?
                '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i>FIL+</span>' :
                '<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700"><i class="fas fa-times-circle mr-1"></i>No</span>';
            const statusClass = deal.status === 'Active' ? 'text-green-600 font-bold' :
                                deal.status === 'Pending' ? 'text-yellow-600 font-bold' :
                                'text-gray-400 font-semibold';
            const statusIcon = deal.status === 'Active' ? 'fas fa-play-circle' :
                              deal.status === 'Pending' ? 'fas fa-clock' :
                              'fas fa-pause-circle';
            return `
                <tr class="hover:bg-gray-50 transition-colors duration-200">
                    <td class="px-4 py-3 text-sm font-mono text-blue-600">#${deal.id}</td>
                    <td class="px-4 py-3 text-sm font-mono">${deal.provider}</td>
                    <td class="px-4 py-3 text-sm font-semibold">${pieceSizeGB} GB</td>
                    <td class="px-4 py-3 text-sm">${verifiedBadge}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-purple-600">${priceFIL}</td>
                    <td class="px-4 py-3 text-sm">${deal.duration_days.toFixed(1)} days</td>
                    <td class="px-4 py-3 text-sm ${statusClass}">
                        <i class="${statusIcon} mr-1"></i>${deal.status}
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-600">${deal.start_time.replace('T', ' ').slice(0, 16)}</td>
                    <td class="px-4 py-3 text-xs text-gray-600">${deal.end_time.replace('T', ' ').slice(0, 16)}</td>
                    <td class="px-4 py-3 text-center">
                        <button class="accept-btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm" data-id="${deal.id}">
                            <i class="fas fa-handshake mr-1"></i>Accept
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function refreshData() {
        if (!refreshBtn) return;
        
        // Show loading state
        const originalContent = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
        
        try {
            console.log(`🔄 Triggering manual update for ${currentNetwork}...`);
            
            // Call the backend update endpoint
            const response = await fetch(`/api/update/${currentNetwork}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Update failed with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Update result:', result);
            
            // Show success feedback briefly
            refreshBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Updated!';
            refreshBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            refreshBtn.classList.add('bg-green-500');
            
            // Wait a moment, then refresh the deals display
            setTimeout(() => {
                fetchDeals(currentNetwork);
            }, 1000);
            
        } catch (error) {
            console.error('Manual update failed:', error);
            
            // Show error feedback
            refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Failed';
            refreshBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            refreshBtn.classList.add('bg-red-500');
        }
        
        // Reset button after 3 seconds
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalContent;
            refreshBtn.classList.remove('bg-green-500', 'bg-red-500');
            refreshBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }, 3000);
    }

    mainnetBtn.addEventListener('click', () => {
        currentNetwork = 'mainnet';
        mainnetBtn.classList.add('bg-blue-600', 'text-white');
        mainnetBtn.classList.remove('bg-gray-200', 'text-blue-700');
        testnetBtn.classList.remove('bg-blue-600', 'text-white');
        testnetBtn.classList.add('bg-gray-200', 'text-blue-700');
        fetchDeals('mainnet');
    });
    testnetBtn.addEventListener('click', () => {
        currentNetwork = 'testnet';
        testnetBtn.classList.add('bg-blue-600', 'text-white');
        testnetBtn.classList.remove('bg-gray-200', 'text-blue-700');
        mainnetBtn.classList.remove('bg-blue-600', 'text-white');
        mainnetBtn.classList.add('bg-gray-200', 'text-blue-700');
        fetchDeals('testnet');
    });

    // Add refresh button event listener
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }

    // Fetch and render advisor recommendations
    async function fetchAdvisor() {
        const advisorSection = document.getElementById('advisor-section');
        const advisorContainer = document.getElementById('advisor-recommendations');
        if (!advisorSection || !advisorContainer) return;
        advisorContainer.innerHTML = '<div class="text-gray-500">Loading recommendations...</div>';
        try {
            const resp = await fetch('/api/advisor/market-analysis');
            const data = await resp.json();
            if (data.recommendations && data.recommendations.length) {
                advisorContainer.innerHTML = data.recommendations.map(rec => `
                  <div class="advisor-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 border-l-4 ${rec.priority === 'High' ? 'border-red-500' : rec.priority === 'Medium' ? 'border-yellow-500' : 'border-green-500'}">
                    <div class="flex items-center gap-2 mb-1">
                      <i class="fas fa-lightbulb text-blue-500"></i>
                      <span class="font-semibold text-lg">${rec.category}</span>
                      <span class="ml-auto px-2 py-1 rounded text-xs font-bold ${rec.priority === 'High' ? 'bg-red-100 text-red-700' : rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}">${rec.priority}</span>
                    </div>
                    <div class="text-gray-800">${rec.message}</div>
                    <div class="text-blue-700 font-semibold">${rec.action}</div>
                  </div>
                `).join('');
            } else {
                advisorContainer.innerHTML = '<div class="text-gray-500">No recommendations at this time.</div>';
            }
        } catch (e) {
            advisorContainer.innerHTML = '<div class="text-red-500">Failed to load recommendations.</div>';
        }
    }

    // Initial load
    fetchDeals(currentNetwork);
    fetchAdvisor();
});

// --- Storage Advisor Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const advisorRefreshBtn = document.getElementById('advisor-refresh-btn');
    const advisorLoading = document.getElementById('advisor-loading');
    const advisorContent = document.getElementById('advisor-content');
    const advisorError = document.getElementById('advisor-error');
    
    async function fetchStorageAdvice() {
        if (!advisorRefreshBtn) return;
        
        // Show loading state
        const originalContent = advisorRefreshBtn.innerHTML;
        advisorRefreshBtn.disabled = true;
        advisorRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        
        advisorLoading.classList.remove('hidden');
        advisorContent.classList.add('hidden');
        advisorError.classList.add('hidden');
        
        try {
            console.log('🧠 Fetching storage advisor analysis...');
            
            // Get selected time period
            const timePeriod = document.getElementById('time-period-select').value || '30';
            console.log(`📅 Using time period: ${timePeriod} days`);
            
            const response = await fetch(`/api/storage-advisor?days=${timePeriod}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Storage advisor data received:', data);
            
            if (data.success && data.analysis) {
                renderStorageAdvice(data.analysis);
                advisorContent.classList.remove('hidden');
            } else {
                throw new Error(data.error || 'Invalid response format');
            }
            
        } catch (error) {
            console.error('❌ Storage advisor failed:', error);
            document.getElementById('advisor-error-message').textContent = error.message;
            advisorError.classList.remove('hidden');
        } finally {
            advisorLoading.classList.add('hidden');
            advisorRefreshBtn.disabled = false;
            advisorRefreshBtn.innerHTML = originalContent;
        }
    }
    
    function renderStorageAdvice(analysis) {
        const insights = analysis.market_insights;
        const recommendations = analysis.recommendations;
        const framework = analysis.decision_framework;
        
        // Update analysis period indicator
        const selectedPeriod = document.getElementById('time-period-select').value || '30';
        const periodText = selectedPeriod === '7' ? '7 days' : 
                          selectedPeriod === '30' ? '30 days' : 
                          selectedPeriod === '90' ? '3 months' : 
                          selectedPeriod === '180' ? '6 months' : `${selectedPeriod} days`;
        document.getElementById('analysis-period').textContent = periodText;
        
        // Update market overview
        document.getElementById('daily-deals').textContent = insights.current_market.daily_new_deals.toLocaleString();
        document.getElementById('verified-ratio').textContent = `${insights.current_market.verified_deals_percentage.toFixed(1)}%`;
        document.getElementById('activity-level').textContent = insights.market_activity.market_activity_level;
        
        // Update pricing info
        const currentCost = insights.pricing.current_storage_cost;
        document.getElementById('current-cost').textContent = formatPrice(currentCost);
        document.getElementById('price-trend').textContent = insights.pricing.price_trend;
        document.getElementById('price-change').textContent = `${insights.pricing.price_change_percent > 0 ? '+' : ''}${insights.pricing.price_change_percent.toFixed(1)}%`;
        
        // Color code price trend
        const trendElement = document.getElementById('price-trend');
        const changeElement = document.getElementById('price-change');
        if (insights.pricing.price_trend === 'increasing') {
            trendElement.className = 'font-semibold text-red-600';
            changeElement.className = 'font-semibold text-red-600';
        } else if (insights.pricing.price_trend === 'decreasing') {
            trendElement.className = 'font-semibold text-green-600';
            changeElement.className = 'font-semibold text-green-600';
        } else {
            trendElement.className = 'font-semibold text-blue-600';
            changeElement.className = 'font-semibold text-blue-600';
        }
        
        // Update efficiency info
        document.getElementById('unique-ratio').textContent = `${(insights.data_efficiency.unique_data_ratio * 100).toFixed(1)}%`;
        document.getElementById('efficiency-level').textContent = insights.data_efficiency.data_deduplication_efficiency;
        
        // Render recommendations
        const recommendationsContainer = document.getElementById('recommendations');
        recommendationsContainer.innerHTML = recommendations.map(rec => {
            const priorityColor = rec.priority === 'High' ? 'red' : rec.priority === 'Medium' ? 'yellow' : 'blue';
            const priorityIcon = rec.priority === 'High' ? 'fas fa-exclamation-triangle' : 
                                rec.priority === 'Medium' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
            const priorityGradient = rec.priority === 'High' ? 'from-red-500 to-pink-500' : 
                                   rec.priority === 'Medium' ? 'from-yellow-500 to-orange-500' : 'from-blue-500 to-indigo-500';
            return `
                <div class="recommendation-card bg-white bg-opacity-90 backdrop-blur-sm border-l-4 border-${priorityColor}-400 rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div class="p-6">
                        <div class="flex items-start">
                            <div class="bg-gradient-to-r ${priorityGradient} p-3 rounded-full mr-4 flex-shrink-0">
                                <i class="${priorityIcon} text-white"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-${priorityColor}-100 text-${priorityColor}-700">
                                        ${rec.priority} Priority
                                    </span>
                                </div>
                                <p class="text-gray-800 mb-3 leading-relaxed">${rec.message}</p>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-700">
                                        <i class="fas fa-arrow-right mr-2 text-${priorityColor}-500"></i>
                                        <strong>Recommended Action:</strong> ${rec.action}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Render decision factors
        const factorsContainer = document.getElementById('decision-factors');
        factorsContainer.innerHTML = Object.entries(framework.decision_factors).map(([key, factor]) => `
            <div class="bg-white bg-opacity-90 backdrop-blur-sm p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                <div class="flex items-start">
                    <div class="bg-gradient-to-r from-gray-400 to-gray-500 p-2 rounded-full mr-3 flex-shrink-0">
                        <i class="fas fa-cog text-white text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800 capitalize mb-2">${key.replace('_', ' ')}</h4>
                        <p class="text-sm text-gray-600 mb-3 leading-relaxed">${factor.description}</p>
                        <span class="inline-flex items-center px-2 py-1 text-xs rounded-full ${factor.importance === 'High' ? 'bg-red-100 text-red-700' : factor.importance === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}">
                            <i class="fas fa-flag mr-1"></i>
                            ${factor.importance} Priority
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Add event listener for the advisor refresh button
    if (advisorRefreshBtn) {
        advisorRefreshBtn.addEventListener('click', fetchStorageAdvice);
    }
    
    // Add event listener for time period changes
    const timePeriodSelect = document.getElementById('time-period-select');
    if (timePeriodSelect) {
        timePeriodSelect.addEventListener('change', () => {
            console.log('📅 Time period changed, refreshing advisor data...');
            fetchStorageAdvice();
        });
    }
    
    // Auto-load advisor on page load
    setTimeout(fetchStorageAdvice, 2000);
});

// Initial load