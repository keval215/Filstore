const axios = require('axios');

async function testEngineDirectly() {
    console.log('🧪 Testing Engine Service Directly...\n');

    const testCid = 'bafybeihq6mbsd6vzdyu3emmp7dk22jqt4df7xyf7k7crw6ub6m4s2m5p2m';
    const testWallet = '0x1234567890123456789012345678901234567890';

    // Test 1: Health check
    try {
        const health = await axios.get('http://localhost:9090/api/v1/health');
        console.log('✅ Engine Health:', health.data);
    } catch (error) {
        console.log('❌ Engine Health Failed:', error.message);
        return;
    }

    // Test 2: Create retrieval job directly on engine
    try {
        console.log('\n🔄 Testing Engine Retrieval Creation...');
        const retrievalResponse = await axios.post('http://localhost:9090/api/v1/retrieval', {
            cids: [testCid],
            format: 'original'
        }, {
            headers: {
                'X-Wallet-Address': testWallet,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Engine Retrieval Creation:', retrievalResponse.data);
        
        const jobId = retrievalResponse.data.id;
        
        // Test 3: Check retrieval status
        console.log('\n📊 Testing Engine Retrieval Status...');
        const statusResponse = await axios.get(`http://localhost:9090/api/v1/retrieval/${jobId}`, {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ Engine Retrieval Status:', statusResponse.data);
        
        // Test 4: List user files
        console.log('\n📚 Testing Engine File Listing...');
        const filesResponse = await axios.get('http://localhost:9090/api/v1/retrieval/files', {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ Engine File Listing:', filesResponse.data);
        
    } catch (error) {
        console.log('❌ Engine Retrieval Test Failed:', error.response?.data || error.message);
    }

    // Test 5: Test file download endpoint
    try {
        console.log('\n📥 Testing Engine File Download...');
        const downloadResponse = await axios.get(`http://localhost:9090/api/v1/retrieval/download/${testCid}`, {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ Engine File Download Response Status:', downloadResponse.status);
    } catch (error) {
        console.log('❌ Engine File Download Failed:', error.response?.data || error.message);
    }

    // Test 6: Test file metadata endpoint
    try {
        console.log('\n📋 Testing Engine File Metadata...');
        const metadataResponse = await axios.get(`http://localhost:9090/api/v1/retrieval/metadata/${testCid}`, {
            headers: {
                'X-Wallet-Address': testWallet
            }
        });
        console.log('✅ Engine File Metadata:', metadataResponse.data);
    } catch (error) {
        console.log('❌ Engine File Metadata Failed:', error.response?.data || error.message);
    }
}

async function testGatewayWithAuth() {
    console.log('\n🔐 Testing Gateway with Authentication...\n');

    const testCid = 'bafybeihq6mbsd6vzdyu3emmp7dk22jqt4df7xyf7k7crw6ub6m4s2m5p2m';
    const testWallet = '0x1234567890123456789012345678901234567890';

    // Test gateway retrieval creation with proper headers
    try {
        console.log('🔄 Testing Gateway Retrieval Creation...');
        const response = await axios.post('http://localhost:8080/api/v1/retrieval', {
            cids: [testCid],
            format: 'original'
        }, {
            headers: {
                'X-Wallet-Address': testWallet,
                'Content-Type': 'application/json',
                'User-Agent': 'Filstore-Test/1.0'
            }
        });
        console.log('✅ Gateway Retrieval Creation:', response.data);
    } catch (error) {
        console.log('❌ Gateway Retrieval Creation Failed:', error.response?.data || error.message);
        console.log('Response Status:', error.response?.status);
        console.log('Response Headers:', error.response?.headers);
    }
}

async function runTests() {
    console.log('🚀 Starting Direct Engine Tests\n');
    console.log('=' .repeat(50));

    await testEngineDirectly();
    await testGatewayWithAuth();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Direct Engine Tests Completed!');
}

runTests().catch(console.error); 