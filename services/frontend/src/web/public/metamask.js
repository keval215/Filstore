const FILECOIN_CALIBRATION = {
  chainId: '0x4cb2f', // 314159 in hex
  chainName: 'Filecoin Calibration testnet',
  rpcUrls: [
    'https://api.calibration.node.glif.io/rpc/v1',
    'https://filecoin-calibration.chainup.net/rpc/v1'
  ],
  nativeCurrency: {
    name: 'tFIL',
    symbol: 'tFIL',
    decimals: 18
  },
  blockExplorerUrls: ['https://calibration.filfox.info/en']
};

async function connectMetaMask() {
  if (!window.ethereum) {
    alert('MetaMask is not installed!');
    return;
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    // Dispatch walletConnected event for UI update
    window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address } }));
    // Check network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== FILECOIN_CALIBRATION.chainId) {
      // Prompt user to switch/add Filecoin Calibration
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: FILECOIN_CALIBRATION.chainId }]
        });
      } catch (switchError) {
        // If not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FILECOIN_CALIBRATION]
          });
        } else {
          const warning = document.getElementById('network-warning');
          if (warning) {
            warning.style.display = 'block';
            warning.innerHTML =
              'Please switch to Filecoin Calibration testnet in MetaMask.<br>' +
              '<span class="text-yellow-600 font-semibold">MetaMask may show a warning about chain ID mismatch. This is a known issue with Filecoin Calibration RPCs and is safe to ignore for testing. <a href="https://chainid.network/" target="_blank" class="underline text-blue-700">More info</a>.</span>';
          }
        }
      }
    } else {
      const warning = document.getElementById('network-warning');
      if (warning) warning.style.display = 'none';
    }
    // Store address in localStorage/session for backend use
    localStorage.setItem('walletAddress', address);
  } catch (err) {
    console.error(err);
    alert('Failed to connect MetaMask');
  }
}

// Listen for account/network changes and update UI
if (window.ethereum) {
  window.ethereum.on('accountsChanged', function(accounts) {
    if (accounts.length > 0) {
      window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: accounts[0] } }));
      localStorage.setItem('walletAddress', accounts[0]);
    } else {
      localStorage.removeItem('walletAddress');
      window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: null } }));
    }
  });
  window.ethereum.on('chainChanged', function(chainId) {
    window.location.reload();
  });
}

window.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('connect-wallet-btn');
  if (btn) btn.onclick = connectMetaMask;
}); 