// UI enhancements for wallet connection

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