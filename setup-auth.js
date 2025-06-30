#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔐 Filecoin Backup - Authentication Setup');
console.log('=====================================\n');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

console.log('Choose your authentication method:\n');
console.log('1. 🚫 None (No authentication - Docker container isolation only)');
console.log('2. 🔑 Simple (API key - Perfect for local Docker deployments)');
console.log('3. 🌐 Wallet (Web3 wallet authentication - MetaMask, etc.)');
console.log('4. 🔐 JWT (Full user management - Overkill for personal use)\n');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your choice (1-4): ', (choice) => {
    let authMode = 'simple';
    let description = '';
    
    switch (choice) {
        case '1':
            authMode = 'none';
            description = 'No authentication - Direct access to all features';
            break;
        case '2':
            authMode = 'simple';
            description = 'API key authentication - Perfect for Docker deployments';
            break;
        case '3':
            authMode = 'wallet';
            description = 'Web3 wallet authentication - True decentralized auth';
            break;
        case '4':
            authMode = 'jwt';
            description = 'JWT user management - Full featured but complex';
            break;
        default:
            console.log('Invalid choice, defaulting to Simple authentication');
            authMode = 'simple';
            description = 'API key authentication - Perfect for Docker deployments';
    }
    
    console.log(`\n✅ Selected: ${description}\n`);
    
    // Update or add AUTH_MODE to .env
    const authModePattern = /^AUTH_MODE=.*/m;
    if (authModePattern.test(envContent)) {
        envContent = envContent.replace(authModePattern, `AUTH_MODE=${authMode}`);
    } else {
        envContent += `\n# Authentication Configuration\nAUTH_MODE=${authMode}\n`;
    }
    
    // Generate API key if using simple auth
    if (authMode === 'simple') {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const apiKeyPattern = /^API_KEY=.*/m;
        if (apiKeyPattern.test(envContent)) {
            envContent = envContent.replace(apiKeyPattern, `API_KEY=${apiKey}`);
        } else {
            envContent += `API_KEY=${apiKey}\n`;
        }
        console.log(`🔑 Generated API Key: ${apiKey}\n`);
    }
    
    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('📁 Configuration saved to .env file\n');
    
    // Show usage instructions
    showUsageInstructions(authMode);
    
    rl.close();
});

function showUsageInstructions(authMode) {
    console.log('🚀 Usage Instructions:');
    console.log('=====================\n');
    
    switch (authMode) {
        case 'none':
            console.log('✅ No authentication required!');
            console.log('1. Run: docker-compose up --build');
            console.log('2. Access: http://localhost:3000');
            console.log('3. All features available immediately');
            break;
            
        case 'simple':
            console.log('🔑 API Key Authentication:');
            console.log('1. Run: docker-compose up --build');
            console.log('2. API key will be shown in Docker logs');
            console.log('3. Use API key in requests: -H "X-API-Key: YOUR_KEY"');
            console.log('4. Or access frontend directly at: http://localhost:3000');
            break;
            
        case 'wallet':
            console.log('🌐 Web3 Wallet Authentication:');
            console.log('1. Run: docker-compose up --build');
            console.log('2. Access: http://localhost:3000/wallet-dashboard.html');
            console.log('3. Connect your MetaMask or Web3 wallet');
            console.log('4. Sign messages for secure operations');
            break;
            
        case 'jwt':
            console.log('🔐 JWT Authentication:');
            console.log('1. Run: docker-compose up --build');
            console.log('2. Access: http://localhost:3000/login.html');
            console.log('3. Register/login with username/password');
            console.log('4. JWT token manages your session');
            break;
    }
    
    console.log('\n💡 You can change authentication method anytime by running:');
    console.log('   node setup-auth.js\n');
}
