const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const GATEWAY_URL = 'http://localhost:8080';
const ENGINE_URL = 'http://localhost:9090';
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');

// Test data
const testFileContent = 'This is a test file for retrieval testing. Created at: ' + new Date().toISOString();
const testWalletAddress = '0x1234567890123456789012345678901234567890';

async function createTestFile() {
    console.log('📝 Creating test file...');
    fs.writeFileSync(TEST_FILE_PATH, testFileContent);
    console.log('✅ Test file created:', TEST_FILE_PATH);
}

async function testGatewayHealth() {
    console.log('\n🏥 Testing Gateway Health...');
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/v1/health`);
        console.log('✅ Gateway is healthy:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Gateway health check failed:', error.message);
        return false;
    }
}

async function testEngineHealth() {
    console.log('\n🏥 Testing Engine Health...');
    try {
        const response = await axios.get(`${ENGINE_URL}/api/v1/health`);
        console.log('✅ Engine is healthy:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Engine health check failed:', error.message);
        return false;
    }
}

async function testFileUpload() {
    console.log('\n📤 Testing File Upload...');
    try {
        // For now, we'll simulate a file upload by creating a test file ID
        // In a real implementation, this would upload to IPFS and get a CID
        const testFileId = 'bafybeihq6mbsd6vzdyu3emmp7dk22jqt4df7xyf7k7crw6ub6m4s2m5p2m';
        console.log('✅ Test file ID created:', testFileId);
        return testFileId;
    } catch (error) {
        console.log('❌ File upload failed:', error.response?.data || error.message);
        return null;
    }
}

async function testRetrievalJobCreation(fileId) {
    console.log('\n🔄 Testing Retrieval Job Creation...');
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/v1/retrieval`, {
            cids: [fileId],
            format: 'original'
        }, {
            headers: {
                'X-Wallet-Address': testWalletAddress,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Retrieval job created:', response.data);
        return response.data.id;
    } catch (error) {
        console.log('❌ Retrieval job creation failed:', error.response?.data || error.message);
        return null;
    }
}

async function testRetrievalJobStatus(jobId) {
    console.log('\n📊 Testing Retrieval Job Status...');
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/v1/retrieval/${jobId}`, {
            headers: {
                'X-Wallet-Address': testWalletAddress
            }
        });

        console.log('✅ Retrieval job status:', response.data);
        return response.data;
    } catch (error) {
        console.log('❌ Retrieval job status check failed:', error.response?.data || error.message);
        return null;
    }
}

async function testFileRetrieval(fileId) {
    console.log('\n📥 Testing File Retrieval...');
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/v1/retrieval/download/${fileId}`, {
            headers: {
                'X-Wallet-Address': testWalletAddress
            },
            responseType: 'stream'
        });

        const outputPath = path.join(__dirname, 'retrieved-test-file.txt');
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('✅ File retrieved successfully:', outputPath);
                resolve(outputPath);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.log('❌ File retrieval failed:', error.response?.data || error.message);
        return null;
    }
}

async function testRetrievalHistory() {
    console.log('\n📚 Testing Retrieval History...');
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/v1/retrieval/files`, {
            headers: {
                'X-Wallet-Address': testWalletAddress
            }
        });

        console.log('✅ Retrieval history:', response.data);
        return response.data;
    } catch (error) {
        console.log('❌ Retrieval history failed:', error.response?.data || error.message);
        return null;
    }
}

async function cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    try {
        if (fs.existsSync(TEST_FILE_PATH)) {
            fs.unlinkSync(TEST_FILE_PATH);
            console.log('✅ Test file cleaned up');
        }
        const retrievedPath = path.join(__dirname, 'retrieved-test-file.txt');
        if (fs.existsSync(retrievedPath)) {
            fs.unlinkSync(retrievedPath);
            console.log('✅ Retrieved file cleaned up');
        }
    } catch (error) {
        console.log('⚠️ Cleanup warning:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting File Retrieval Feature Tests\n');
    console.log('=' .repeat(50));

    // Create test file
    await createTestFile();

    // Health checks
    const gatewayHealthy = await testGatewayHealth();
    const engineHealthy = await testEngineHealth();

    if (!gatewayHealthy || !engineHealthy) {
        console.log('\n❌ Services are not healthy. Please start the services first.');
        console.log('Run: docker-compose up -d');
        await cleanup();
        return;
    }

    // Test file upload
    const fileId = await testFileUpload();
    if (!fileId) {
        console.log('\n❌ File upload failed. Cannot proceed with retrieval tests.');
        await cleanup();
        return;
    }

    // Wait a moment for processing
    console.log('\n⏳ Waiting for file processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test retrieval job creation
    const jobId = await testRetrievalJobCreation(fileId);
    if (!jobId) {
        console.log('\n❌ Retrieval job creation failed.');
        await cleanup();
        return;
    }

    // Test retrieval job status
    await testRetrievalJobStatus(jobId);

    // Wait for processing
    console.log('\n⏳ Waiting for retrieval processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test file retrieval
    const retrievedPath = await testFileRetrieval(fileId);
    if (retrievedPath) {
        // Verify content
        const retrievedContent = fs.readFileSync(retrievedPath, 'utf8');
        if (retrievedContent === testFileContent) {
            console.log('✅ Retrieved file content matches original!');
        } else {
            console.log('❌ Retrieved file content does not match original');
        }
    }

    // Test retrieval history
    await testRetrievalHistory();

    // Cleanup
    await cleanup();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 File Retrieval Feature Tests Completed!');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    cleanup().then(() => process.exit(1));
});

// Run the tests
runTests().catch(console.error); 