const axios = require('axios');

// Test the basic endpoints without authentication
async function testBasicEndpoints() {
    console.log('🧪 Testing Basic Endpoints...\n');

    // Test Gateway Health
    try {
        const gatewayHealth = await axios.get('http://localhost:8080/api/v1/health');
        console.log('✅ Gateway Health:', gatewayHealth.data);
    } catch (error) {
        console.log('❌ Gateway Health Failed:', error.message);
    }

    // Test Engine Health
    try {
        const engineHealth = await axios.get('http://localhost:9090/api/v1/health');
        console.log('✅ Engine Health:', engineHealth.data);
    } catch (error) {
        console.log('❌ Engine Health Failed:', error.message);
    }

    // Test Gateway Status
    try {
        const gatewayStatus = await axios.get('http://localhost:8080/api/v1/status');
        console.log('✅ Gateway Status:', gatewayStatus.data);
    } catch (error) {
        console.log('❌ Gateway Status Failed:', error.message);
    }
}

// Test retrieval endpoints with mock data
async function testRetrievalEndpoints() {
    console.log('\n🔄 Testing Retrieval Endpoints...\n');

    const testWallet = '0x1234567890123456789012345678901234567890';
    const testCid = 'bafybeihq6mbsd6vzdyu3emmp7dk22jqt4df7xyf7k7crw6ub6m4s2m5p2m';

    // Test retrieval creation (this will likely fail due to auth, but let's see the error)
    try {
        const retrievalResponse = await axios.post('http://localhost:8080/api/v1/retrieval', {
            cids: [testCid],
            format: 'original'
        }, {
            headers: {
                'X-Wallet-Address': testWallet,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Retrieval Creation:', retrievalResponse.data);
    } catch (error) {
        console.log('❌ Retrieval Creation Failed:', error.response?.data || error.message);
    }

    // Test retrieval status (this should work with just wallet address)
    try {
        const statusResponse = await axios.get(`http://localhost:8080/api/v1/retrieval/test-id`, {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ Retrieval Status:', statusResponse.data);
    } catch (error) {
        console.log('❌ Retrieval Status Failed:', error.response?.data || error.message);
    }

    // Test file listing
    try {
        const filesResponse = await axios.get('http://localhost:8080/api/v1/retrieval/files', {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ File Listing:', filesResponse.data);
    } catch (error) {
        console.log('❌ File Listing Failed:', error.response?.data || error.message);
    }
}

// Test engine endpoints directly
async function testEngineEndpoints() {
    console.log('\n⚙️ Testing Engine Endpoints Directly...\n');

    const testCid = 'bafybeihq6mbsd6vzdyu3emmp7dk22jqt4df7xyf7k7crw6ub6m4s2m5p2m';

    // Test engine retrieval creation
    try {
        const engineResponse = await axios.post('http://localhost:9090/api/v1/retrieval', {
            cids: [testCid],
            format: 'original'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Engine Retrieval Creation:', engineResponse.data);
    } catch (error) {
        console.log('❌ Engine Retrieval Creation Failed:', error.response?.data || error.message);
    }

    // Test engine retrieval status
    try {
        const engineStatus = await axios.get('http://localhost:9090/api/v1/retrieval/test-id');
        console.log('✅ Engine Retrieval Status:', engineStatus.data);
    } catch (error) {
        console.log('❌ Engine Retrieval Status Failed:', error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Simple Endpoint Tests\n');
    console.log('=' .repeat(50));

    await testBasicEndpoints();
    await testRetrievalEndpoints();
    await testEngineEndpoints();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Simple Endpoint Tests Completed!');
}

runTests().catch(console.error); 