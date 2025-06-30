#!/usr/bin/env node

// JWT Implementation Test Script
const axios = require('axios');

const GATEWAY_URL = 'http://localhost:8080';

class JWTTester {
    constructor() {
        this.token = null;
    }

    async testRegistration() {
        console.log('\n🔐 Testing User Registration...');
        try {
            const response = await axios.post(`${GATEWAY_URL}/api/v1/register`, {
                username: 'testuser',
                password: 'testpass123',
                role: 'user'
            });

            this.token = response.data.token;
            console.log('✅ Registration successful!');
            console.log(`   Token: ${this.token.substring(0, 20)}...`);
            console.log(`   User ID: ${response.data.user_id}`);
            console.log(`   Username: ${response.data.username}`);
            console.log(`   Role: ${response.data.role}`);
            return true;
        } catch (error) {
            console.log('❌ Registration failed:', error.response?.data?.error || error.message);
            return false;
        }
    }

    async testLogin() {
        console.log('\n🔑 Testing User Login...');
        try {
            const response = await axios.post(`${GATEWAY_URL}/api/v1/login`, {
                username: 'admin',
                password: 'password'
            });

            this.token = response.data.token;
            console.log('✅ Login successful!');
            console.log(`   Token: ${this.token.substring(0, 20)}...`);
            console.log(`   User ID: ${response.data.user_id}`);
            console.log(`   Username: ${response.data.username}`);
            console.log(`   Role: ${response.data.role}`);
            console.log(`   Expires: ${response.data.expires_at}`);
            return true;
        } catch (error) {
            console.log('❌ Login failed:', error.response?.data?.error || error.message);
            return false;
        }
    }

    async testProtectedEndpoint() {
        console.log('\n🛡️  Testing Protected Endpoint Access...');
        if (!this.token) {
            console.log('❌ No token available for testing');
            return false;
        }

        try {
            const response = await axios.get(`${GATEWAY_URL}/api/v1/status`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('✅ Protected endpoint access successful!');
            console.log('   Response:', response.data);
            return true;
        } catch (error) {
            console.log('❌ Protected endpoint access failed:', error.response?.data?.error || error.message);
            return false;
        }
    }

    async testUnauthorizedAccess() {
        console.log('\n🚫 Testing Unauthorized Access...');
        try {
            const response = await axios.get(`${GATEWAY_URL}/api/v1/status`);
            console.log('❌ Unauthorized access should have failed!');
            return false;
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Unauthorized access properly blocked!');
                console.log(`   Error: ${error.response.data.error}`);
                return true;
            } else {
                console.log('❌ Unexpected error:', error.message);
                return false;
            }
        }
    }

    async testInvalidToken() {
        console.log('\n🔒 Testing Invalid Token...');
        try {
            const response = await axios.get(`${GATEWAY_URL}/api/v1/status`, {
                headers: {
                    'Authorization': 'Bearer invalid_token_here'
                }
            });
            console.log('❌ Invalid token should have failed!');
            return false;
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Invalid token properly rejected!');
                console.log(`   Error: ${error.response.data.error}`);
                return true;
            } else {
                console.log('❌ Unexpected error:', error.message);
                return false;
            }
        }
    }

    async testTokenRefresh() {
        console.log('\n🔄 Testing Token Refresh...');
        if (!this.token) {
            console.log('❌ No token available for refresh testing');
            return false;
        }

        try {
            const response = await axios.post(`${GATEWAY_URL}/api/v1/refresh-token`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const newToken = response.data.token;
            console.log('✅ Token refresh successful!');
            console.log(`   Old Token: ${this.token.substring(0, 20)}...`);
            console.log(`   New Token: ${newToken.substring(0, 20)}...`);
            this.token = newToken;
            return true;
        } catch (error) {
            console.log('❌ Token refresh failed:', error.response?.data?.error || error.message);
            return false;
        }
    }

    async testProfile() {
        console.log('\n👤 Testing Profile Access...');
        if (!this.token) {
            console.log('❌ No token available for profile testing');
            return false;
        }

        try {
            const response = await axios.get(`${GATEWAY_URL}/api/v1/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('✅ Profile access successful!');
            console.log('   Profile:', response.data);
            return true;
        } catch (error) {
            console.log('❌ Profile access failed:', error.response?.data?.error || error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 JWT Authentication Test Suite');
        console.log('================================');
        
        const results = {
            unauthorized: await this.testUnauthorizedAccess(),
            invalidToken: await this.testInvalidToken(),
            login: await this.testLogin(),
            protectedAccess: await this.testProtectedEndpoint(),
            profile: await this.testProfile(),
            tokenRefresh: await this.testTokenRefresh(),
            registration: await this.testRegistration()
        };

        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
        });

        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

        if (passedTests === totalTests) {
            console.log('🎉 All JWT authentication tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Check the implementation.');
        }
    }
}

// Check if gateway is running
async function checkGatewayStatus() {
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/v1/health`);
        console.log('✅ Gateway is running and accessible');
        return true;
    } catch (error) {
        console.log('❌ Gateway is not accessible:', error.message);
        console.log('\n📝 To test JWT implementation:');
        console.log('1. Make sure Docker Desktop is running');
        console.log('2. Run: docker-compose up --build');
        console.log('3. Wait for all services to start');
        console.log('4. Run this test script again');
        return false;
    }
}

// Main execution
(async () => {
    const tester = new JWTTester();
    
    const gatewayRunning = await checkGatewayStatus();
    if (gatewayRunning) {
        await tester.runAllTests();
    }
})();
