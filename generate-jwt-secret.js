#!/usr/bin/env node

// Simple script to generate a secure JWT secret
const crypto = require('crypto');

function generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}

console.log('JWT_SECRET=' + generateJWTSecret());
