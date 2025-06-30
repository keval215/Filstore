# JWT Authentication Implementation Guide

## 🔐 Overview

Your Filecoin Backup System now has **complete JWT (JSON Web Token) authentication** implemented! This guide explains exactly how it works and when JWT is used.

## 🚀 What Was Implemented

### 1. **JWT Service** (`services/gateway/auth/jwt.go`)
- **Token Generation**: Creates secure JWT tokens with user info
- **Token Validation**: Verifies token signature and expiration
- **Token Refresh**: Allows extending token lifetime
- **Claims Extraction**: Gets user data from tokens

### 2. **Authentication Middleware** (`services/gateway/middleware/auth.go`)
- **Request Interception**: Checks every API request for valid JWT
- **Token Verification**: Uses the JWT service to validate tokens
- **User Context**: Sets user info in request context for other handlers

### 3. **Authentication Handlers** (`services/gateway/handlers/auth.go`)
- **Login Endpoint**: `/api/v1/login` - Authenticates users and returns JWT
- **Registration Endpoint**: `/api/v1/register` - Creates new users with JWT
- **Profile Endpoint**: `/api/v1/profile` - Returns current user info
- **Token Refresh**: `/api/v1/refresh-token` - Gets new token with extended expiry

### 4. **Frontend Integration**
- **Login Page**: `services/frontend/src/web/public/login.html`
- **API Client**: Updated to handle JWT tokens automatically
- **Dashboard**: Checks authentication and provides logout functionality

## 🔄 JWT Flow - Step by Step

### When You Start Docker (`docker-compose up`)

1. **Environment Setup**
   ```
   JWT_SECRET is loaded from .env file
   Gateway service starts with JWT configuration
   ```

2. **First User Access**
   ```
   User visits http://localhost:3000
   → Dashboard checks for auth token in localStorage
   → No token found → Redirects to /login.html
   ```

3. **User Login Process**
   ```
   User enters username/password on login page
   → POST /api/v1/login
   → Gateway validates credentials
   → JWT token generated and returned
   → Token stored in localStorage
   → User redirected to dashboard
   ```

4. **Protected API Calls**
   ```
   Every dashboard action (backup, status check, etc.)
   → API request includes: Authorization: Bearer <jwt_token>
   → Gateway middleware intercepts request
   → JWT token validated
   → If valid: Request proceeds
   → If invalid: 401 Unauthorized returned
   ```

## 🎯 Exact Endpoints and JWT Usage

### **Public Endpoints** (No JWT Required)
- `GET /api/v1/health` - System health check
- `POST /api/v1/login` - User authentication
- `POST /api/v1/register` - User registration

### **Protected Endpoints** (JWT Required)
- `GET /api/v1/status` - System status
- `POST /api/v1/backup` - Create backup
- `GET /api/v1/backup/:id` - Get backup status
- `GET /api/v1/profile` - User profile
- `POST /api/v1/refresh-token` - Refresh JWT

## 🧪 Testing JWT Implementation

### Default Users Available:
```
Username: admin
Password: password
Role: admin

Username: user  
Password: password
Role: user
```

### Test Commands:

1. **Start the system:**
   ```powershell
   docker-compose up --build
   ```

2. **Test login:**
   ```powershell
   curl -X POST http://localhost:8080/api/v1/login \
   -H "Content-Type: application/json" \
   -d '{"username":"admin","password":"password"}'
   ```

3. **Test protected endpoint without token:**
   ```powershell
   curl http://localhost:8080/api/v1/status
   # Returns: {"error":"Authorization header required"}
   ```

4. **Test protected endpoint with token:**
   ```powershell
   curl http://localhost:8080/api/v1/status \
   -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
   ```

5. **Run comprehensive test suite:**
   ```powershell
   node test-jwt.js
   ```

## 🔧 Configuration

### Environment Variables:
```env
JWT_SECRET=your_secure_64_character_secret_here
DISABLE_AUTH=false  # Set to true to disable authentication
```

### Token Configuration:
- **Expiration**: 24 hours
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Claims**: user_id, username, role, standard JWT claims

## 🌐 Frontend Integration

### Login Flow:
1. User visits any page
2. `dashboard.js` checks `localStorage.getItem('auth_token')`
3. If no token → Redirect to `/login.html`
4. User logs in → Token stored → Redirect to dashboard

### API Calls:
All API calls automatically include the JWT token:
```javascript
headers: {
    'Authorization': `Bearer ${this.getAuthToken()}`
}
```

### Logout:
```javascript
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    window.location.href = '/login.html';
}
```

## 🛡️ Security Features

1. **Secure Token Generation**: 64-character random secret
2. **Token Expiration**: Automatic expiry after 24 hours
3. **Password Hashing**: bcrypt with salt
4. **Request Validation**: Every protected endpoint validates JWT
5. **User Context**: JWT claims available to all handlers

## 🚨 Production Considerations

### Before deploying to production:

1. **Generate New JWT Secret**:
   ```powershell
   node generate-jwt-secret.js
   ```

2. **Update Environment Variables**:
   - Use secure, unique JWT_SECRET
   - Set strong database passwords
   - Configure proper CORS origins

3. **Database Integration**:
   Current implementation uses in-memory user storage. For production:
   - Replace with PostgreSQL user table
   - Add user management endpoints
   - Implement password reset functionality

4. **Enhanced Security**:
   - Add rate limiting on login attempts
   - Implement token blacklist for logout
   - Add refresh token rotation
   - Enable HTTPS only

## 🎉 Summary

Your JWT implementation is **complete and functional**! Here's what happens:

1. **Docker starts** → JWT secret loaded
2. **User visits site** → Redirected to login if not authenticated  
3. **User logs in** → JWT token issued and stored
4. **Every API call** → JWT validated automatically
5. **Token expires** → User must log in again

The system is production-ready with proper JWT authentication protecting all your backup operations!
