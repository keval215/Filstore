# Deal Analyzer Service

This service fetches Filecoin deal data from Lotus JSON-RPC, Boost GraphQL, and Glif endpoints, ranks deals based on user preferences and provider reputation, and exposes a REST API for frontend consumption.

## Folder Structure

- `Dockerfile`         - Containerization
- `requirements.txt`   - Python dependencies
- `main.py`            - Entrypoint, REST API (FastAPI)
- `deal_fetcher.py`    - Fetches deals from Lotus/Boost/Glif
- `reputation.py`      - Provider reputation logic
- `selector.py`        - Deal selection logic
- `cache.py`           - (Optional) Caching deal data
- `config.py`          - Configuration/env
- `README.md`          - This file

## Setup

1. Build Docker image:
   ```sh
   docker build -t deal-analyzer .
   ```
2. Run the service:
   ```sh
   docker run -p 8000:8000 --env-file .env deal-analyzer
   ```
3. Endpoints:
   - `/api/deals/best` - Get best deals for user
   - `/api/deals/all` - List/filter all deals
   - `/api/providers/<address>/reputation` - Get provider reputation

## Features
- Fetches deals from mainnet and testnet (user selectable)
- Intelligent deal selection and ranking
- Provider reputation scoring
- REST API for frontend integration
- Docker-native 