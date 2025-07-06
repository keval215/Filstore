# File Retrieval Implementation Guide

This guide explains the complete file retrieval system implementation for the Filstore service.

## 🎯 **Overview**

The file retrieval system allows users to retrieve/access files they have previously uploaded and stored on Filecoin. This is the "download" functionality that complements the upload/backup system.

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Gateway      │    │     Engine      │
│   (User UI)     │◄──►│   (API Layer)   │◄──►│  (Processing)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   IPFS/Filecoin │
                       │   (Metadata)    │    │   (File Storage)│
                       └─────────────────┘    └─────────────────┘
```

## 📁 **Files Created/Modified**

### **New Files Created:**

1. **`services/gateway/handlers/retrieval.go`** - Gateway API handlers
2. **`services/engine/processor/retrieval.go`** - Core retrieval logic
3. **`services/engine/handlers/retrieval.go`** - Engine API handlers
4. **`test_retrieval.py`** - Test script for the retrieval system

### **Modified Files:**

1. **`services/gateway/main.go`** - Added retrieval routes
2. **`services/engine/main.go`** - Added retrieval handlers and database connection
3. **`database/schema.sql`** - Added retrieval_jobs table

## 🔧 **Database Schema**

### **New Table: `retrieval_jobs`**

```sql
CREATE TABLE IF NOT EXISTS retrieval_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
    cids TEXT[] NOT NULL DEFAULT '{}',
    file_paths TEXT[] NOT NULL DEFAULT '{}',
    format VARCHAR(50) NOT NULL DEFAULT 'original',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    files JSONB,
    total_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    wallet_address VARCHAR(255) NOT NULL
);
```

### **New Indexes:**
- `idx_retrieval_jobs_status` - For querying by status
- `idx_retrieval_jobs_wallet` - For user-specific queries
- `idx_retrieval_jobs_backup_job` - For backup-related queries
- `idx_retrieval_jobs_created_at` - For time-based queries

### **New View: `retrieval_job_summary`**
Provides a summary view of retrieval jobs with related backup information.

## 🌐 **API Endpoints**

### **Gateway Endpoints (Port 8080):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/retrieval` | Start a file retrieval job |
| `GET` | `/api/v1/retrieval/:id` | Get retrieval job status |
| `POST` | `/api/v1/retrieval/:id/cancel` | Cancel a retrieval job |
| `GET` | `/api/v1/retrieval/download/:cid` | Download a specific file |
| `GET` | `/api/v1/retrieval/metadata/:cid` | Get file metadata |
| `GET` | `/api/v1/retrieval/files` | List user's files |

### **Engine Endpoints (Port 9090):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/retrieval` | Create retrieval job |
| `GET` | `/api/v1/retrieval/:id` | Get job status |
| `POST` | `/api/v1/retrieval/:id/cancel` | Cancel job |
| `GET` | `/api/v1/retrieval/download/:cid` | Download file |
| `GET` | `/api/v1/retrieval/metadata/:cid` | Get metadata |
| `GET` | `/api/v1/retrieval/files` | List files |

## 🔐 **Authentication & Security**

### **Web3 Wallet Authentication:**
- All endpoints require wallet authentication
- Wallet address is passed via `X-Wallet-Address` header
- Users can only access their own files
- Authorization checks on every request

### **Security Features:**
- Rate limiting to prevent abuse
- CORS configuration for secure cross-origin requests
- Input validation and sanitization
- Temporary file cleanup

## 📊 **Data Flow**

### **1. File Retrieval Request:**
```
User → Frontend → Gateway → Engine → Database
```

### **2. File Processing:**
```
Engine → IPFS Gateway → Download File → Process → Return to User
```

### **3. Job Tracking:**
```
Engine → Database (Store Progress) → Gateway → Frontend (Status Updates)
```

## 🚀 **How to Use**

### **Step 1: Start the Services**

```bash
# Start all services
docker-compose up -d

# Or start individual services
docker-compose up gateway engine postgres redis
```

### **Step 2: Test the System**

```bash
# Run the test script
python test_retrieval.py
```

### **Step 3: Use the API**

#### **List User Files:**
```bash
curl -X GET "http://localhost:8080/api/v1/retrieval/files" \
  -H "Authorization: Bearer <wallet-token>" \
  -H "X-Wallet-Address: f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za"
```

#### **Start Retrieval Job:**
```bash
curl -X POST "http://localhost:8080/api/v1/retrieval" \
  -H "Authorization: Bearer <wallet-token>" \
  -H "X-Wallet-Address: f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za" \
  -H "Content-Type: application/json" \
  -d '{
    "backup_job_id": "your-backup-uuid",
    "format": "original"
  }'
```

#### **Download File:**
```bash
curl -X GET "http://localhost:8080/api/v1/retrieval/download/QmHash123?format=original" \
  -H "Authorization: Bearer <wallet-token>" \
  -H "X-Wallet-Address: f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za" \
  --output downloaded_file.jpg
```

## 🔧 **Configuration**

### **Environment Variables:**

```bash
# Database
POSTGRES_URL=postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup

# IPFS
IPFS_GATEWAY=https://ipfs.io

# Storage
TEMP_DIR=/tmp/engine
OUTPUT_DIR=/app/output

# Service Ports
GATEWAY_PORT=8080
ENGINE_PORT=9090
```

### **Database Configuration:**
- Connection pooling enabled
- Max 25 open connections
- 5 idle connections
- 5-minute connection lifetime

## 🧪 **Testing**

### **Test Script Features:**
- Health endpoint checks
- File listing functionality
- Retrieval job creation
- Status monitoring
- File metadata retrieval
- File download testing
- Job cancellation

### **Running Tests:**
```bash
# Install dependencies
pip install requests

# Run tests
python test_retrieval.py
```

## 📈 **Performance Considerations**

### **Optimizations:**
- **Caching**: Temporary file caching for 30 seconds
- **Streaming**: Direct file streaming to avoid memory issues
- **Background Processing**: Retrieval jobs run in background
- **Connection Pooling**: Database connection reuse
- **Rate Limiting**: Prevents API abuse

### **Scalability:**
- **Horizontal Scaling**: Multiple engine instances
- **Load Balancing**: Gateway can route to multiple engines
- **Database Indexing**: Optimized queries for large datasets
- **File Cleanup**: Automatic temporary file removal

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **1. Database Connection Errors:**
```
Failed to connect to database
```
**Solution**: Check PostgreSQL service is running and accessible.

#### **2. IPFS Gateway Errors:**
```
Failed to download from IPFS
```
**Solution**: Verify IPFS gateway URL and network connectivity.

#### **3. Authorization Errors:**
```
Unauthorized access to file
```
**Solution**: Ensure wallet address is correct and user owns the file.

#### **4. File Not Found:**
```
File not found
```
**Solution**: Verify CID exists and user has access permissions.

### **Debug Mode:**
Enable debug logging by setting environment variables:
```bash
export LOG_LEVEL=debug
export GIN_MODE=debug
```

## 🔮 **Future Enhancements**

### **Planned Features:**
1. **Real-time Progress**: WebSocket updates for job progress
2. **Batch Operations**: Retrieve multiple files at once
3. **File Preview**: Thumbnail generation for images
4. **Advanced Filtering**: Search and filter files
5. **Compression**: On-the-fly file compression
6. **CDN Integration**: Faster file delivery
7. **Analytics**: Usage statistics and monitoring

### **Performance Improvements:**
1. **Redis Caching**: Cache frequently accessed files
2. **Parallel Processing**: Multiple file downloads
3. **Progressive Loading**: Stream large files
4. **Smart Routing**: Route to closest IPFS gateway

## 📚 **API Reference**

### **Request/Response Examples:**

#### **Create Retrieval Job:**
```json
// Request
{
  "backup_job_id": "uuid-here",
  "cids": ["QmHash1", "QmHash2"],
  "file_paths": ["/path/to/file1", "/path/to/file2"],
  "format": "original"
}

// Response
{
  "id": "retrieval-uuid",
  "status": "pending",
  "message": "Starting file retrieval...",
  "progress": 0,
  "created_at": "2024-01-01T12:00:00Z",
  "total_files": 2
}
```

#### **Get Job Status:**
```json
// Response
{
  "id": "retrieval-uuid",
  "status": "completed",
  "progress": 100,
  "message": "Successfully retrieved 2 files",
  "created_at": "2024-01-01T12:00:00Z",
  "completed_at": "2024-01-01T12:05:00Z",
  "total_size": 1048576,
  "files": [
    {
      "cid": "QmHash1",
      "file_path": "/path/to/file1",
      "size": 524288,
      "type": "image/jpeg",
      "status": "retrieved",
      "download_url": "/api/v1/retrieval/download/QmHash1"
    }
  ]
}
```

## 🎉 **Summary**

The file retrieval system provides:

✅ **Complete File Access**: Users can retrieve any file they've uploaded
✅ **Multiple Formats**: Original, CAR, and metadata formats
✅ **Job Management**: Track and cancel retrieval operations
✅ **Security**: Wallet-based authentication and authorization
✅ **Performance**: Efficient streaming and caching
✅ **Scalability**: Designed for horizontal scaling
✅ **Monitoring**: Comprehensive status tracking
✅ **Testing**: Complete test suite for validation

This implementation completes the file storage lifecycle: **Upload → Store → Retrieve** 🚀 