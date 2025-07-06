#!/bin/bash

# File Retrieval System Setup Script
# This script helps you set up and test the file retrieval functionality

set -e

echo "🚀 File Retrieval System Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    if ! docker-compose --version > /dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install it and try again."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Check if postgres container is running
    if ! docker ps | grep -q postgres; then
        print_warning "PostgreSQL container is not running. Starting services..."
        docker-compose up -d postgres redis
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 10
    fi
    
    # Run database initialization
    if docker-compose exec -T postgres psql -U filecoin_user -d filecoin_backup -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database is already initialized"
    else
        print_status "Running database initialization..."
        docker-compose exec -T postgres psql -U filecoin_user -d filecoin_backup < database/schema.sql
        print_success "Database initialized successfully"
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Start all services
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    # Check if services are running
    check_services
}

# Check if services are running
check_services() {
    print_status "Checking service health..."
    
    # Check Gateway
    if curl -s http://localhost:8080/api/v1/health > /dev/null; then
        print_success "Gateway is running (port 8080)"
    else
        print_error "Gateway is not responding on port 8080"
    fi
    
    # Check Engine
    if curl -s http://localhost:9090/api/v1/health > /dev/null; then
        print_success "Engine is running (port 9090)"
    else
        print_error "Engine is not responding on port 9090"
    fi
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U filecoin_user > /dev/null 2>&1; then
        print_success "PostgreSQL is running"
    else
        print_error "PostgreSQL is not responding"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is running"
    else
        print_error "Redis is not responding"
    fi
}

# Install Python dependencies
install_python_deps() {
    print_status "Installing Python dependencies..."
    
    if command -v pip3 > /dev/null 2>&1; then
        pip3 install requests
        print_success "Python dependencies installed"
    elif command -v pip > /dev/null 2>&1; then
        pip install requests
        print_success "Python dependencies installed"
    else
        print_warning "pip not found. Please install Python dependencies manually:"
        echo "  pip install requests"
    fi
}

# Run tests
run_tests() {
    print_status "Running retrieval system tests..."
    
    if [ -f "test_retrieval.py" ]; then
        if command -v python3 > /dev/null 2>&1; then
            python3 test_retrieval.py
        elif command -v python > /dev/null 2>&1; then
            python test_retrieval.py
        else
            print_error "Python not found. Cannot run tests."
        fi
    else
        print_error "test_retrieval.py not found"
    fi
}

# Show usage information
show_usage() {
    echo ""
    echo "📚 Usage Information"
    echo "==================="
    echo ""
    echo "🌐 API Endpoints:"
    echo "  Gateway (Port 8080):"
    echo "    GET  /api/v1/health                    - Health check"
    echo "    GET  /api/v1/retrieval/files          - List user files"
    echo "    POST /api/v1/retrieval                - Start retrieval job"
    echo "    GET  /api/v1/retrieval/:id            - Get job status"
    echo "    GET  /api/v1/retrieval/download/:cid  - Download file"
    echo "    GET  /api/v1/retrieval/metadata/:cid  - Get file metadata"
    echo ""
    echo "  Engine (Port 9090):"
    echo "    GET  /api/v1/health                    - Health check"
    echo "    Same endpoints as Gateway (direct access)"
    echo ""
    echo "🔧 Environment Variables:"
    echo "  POSTGRES_URL=postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup"
    echo "  IPFS_GATEWAY=https://ipfs.io"
    echo "  TEMP_DIR=/tmp/engine"
    echo "  OUTPUT_DIR=/app/output"
    echo ""
    echo "🧪 Testing:"
    echo "  python3 test_retrieval.py               - Run test suite"
    echo ""
    echo "📖 Documentation:"
    echo "  FILE_RETRIEVAL_IMPLEMENTATION.md        - Complete implementation guide"
    echo ""
}

# Main setup function
main() {
    echo "Starting File Retrieval System setup..."
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Install dependencies
    install_python_deps
    
    # Initialize database
    init_database
    
    # Start services
    start_services
    
    # Run tests
    run_tests
    
    # Show usage
    show_usage
    
    echo ""
    print_success "File Retrieval System setup completed!"
    echo ""
    echo "🎉 Your file retrieval system is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Upload some files using your existing backup system"
    echo "2. Test file retrieval using the API endpoints"
    echo "3. Integrate with your frontend application"
    echo ""
    echo "For more information, see FILE_RETRIEVAL_IMPLEMENTATION.md"
}

# Handle command line arguments
case "${1:-}" in
    "check")
        check_services
        ;;
    "test")
        run_tests
        ;;
    "start")
        start_services
        ;;
    "stop")
        print_status "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "help"|"-h"|"--help")
        echo "File Retrieval System Setup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  - Full setup (default)"
        echo "  check      - Check service health"
        echo "  test       - Run tests only"
        echo "  start      - Start services only"
        echo "  stop       - Stop services"
        echo "  restart    - Restart services"
        echo "  logs       - Show service logs"
        echo "  help       - Show this help"
        ;;
    *)
        main
        ;;
esac 