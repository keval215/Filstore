-- Filecoin Backup System Database Schema
-- Run this script to set up the database tables

-- Create database (run as superuser)
-- CREATE DATABASE filecoin_backup;
-- CREATE USER filecoin_user WITH PASSWORD 'filecoin_pass';
-- GRANT ALL PRIVILEGES ON DATABASE filecoin_backup TO filecoin_user;

-- Connect to filecoin_backup database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Backup Jobs table
CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    files TEXT[] NOT NULL,
    destination VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    total_size BIGINT DEFAULT 0,
    compressed_size BIGINT DEFAULT 0,
    backup_type VARCHAR(50) DEFAULT 'manual'
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(255) UNIQUE NOT NULL,
    network VARCHAR(50) NOT NULL DEFAULT 'calibration',
    encrypted_private_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    balance DECIMAL(20,6) DEFAULT 0,
    is_funded BOOLEAN DEFAULT FALSE,
    last_balance_check TIMESTAMP WITH TIME ZONE,
    wallet_type VARCHAR(50) DEFAULT 'secp256k1'
);

-- Storage Deals table
CREATE TABLE IF NOT EXISTS storage_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id),
    miner_id VARCHAR(255) NOT NULL,
    deal_cid VARCHAR(255),
    price DECIMAL(20,6) NOT NULL,
    size BIGINT NOT NULL,
    duration INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deal_start_epoch INTEGER,
    deal_end_epoch INTEGER,
    verified_deal BOOLEAN DEFAULT FALSE
);

-- IPFS Pins table
CREATE TABLE IF NOT EXISTS ipfs_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
    cid VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pin_status VARCHAR(50) DEFAULT 'pinned'
);

-- System Configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at ON backup_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_storage_deals_status ON storage_deals(status);
CREATE INDEX IF NOT EXISTS idx_storage_deals_miner ON storage_deals(miner_id);
CREATE INDEX IF NOT EXISTS idx_storage_deals_backup_job ON storage_deals(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_ipfs_pins_cid ON ipfs_pins(cid);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Insert default configuration
INSERT INTO system_config (key, value) VALUES 
    ('default_compression_level', '6'),
    ('max_file_size', '104857600'),
    ('backup_retention_days', '30'),
    ('auto_funding_enabled', 'true'),
    ('default_deal_duration', '518400')
ON CONFLICT (key) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_backup_jobs_updated_at BEFORE UPDATE ON backup_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_deals_updated_at BEFORE UPDATE ON storage_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for backup job summaries
CREATE OR REPLACE VIEW backup_job_summary AS
SELECT 
    bj.id,
    bj.status,
    bj.created_at,
    bj.updated_at,
    bj.progress,
    bj.total_size,
    bj.compressed_size,
    COUNT(sd.id) as deal_count,
    COUNT(ip.id) as pin_count,
    w.address as wallet_address,
    w.balance as wallet_balance
FROM backup_jobs bj
LEFT JOIN storage_deals sd ON bj.id = sd.backup_job_id
LEFT JOIN ipfs_pins ip ON bj.id = ip.backup_job_id
LEFT JOIN wallets w ON sd.wallet_id = w.id
GROUP BY bj.id, w.address, w.balance;

-- Grant permissions to the filecoin_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO filecoin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO filecoin_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO filecoin_user;
