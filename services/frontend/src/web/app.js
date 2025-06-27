const express = require('express');
const path = require('path');

const router = express.Router();

// Dashboard routes
router.get('/dashboard', (req, res) => {
  res.json({
    stats: {
      totalBackups: 25,
      successfulBackups: 23,
      failedBackups: 2,
      totalStorage: '45.6GB',
      lastBackup: '2025-06-26T10:30:00Z'
    },
    recentBackups: [
      {
        id: 'backup_001',
        name: 'Documents',
        status: 'completed',
        size: '1.2GB',
        date: '2025-06-26T10:30:00Z'
      },
      {
        id: 'backup_002',
        name: 'Projects',
        status: 'running',
        progress: 65,
        size: '2.8GB',
        date: '2025-06-26T09:15:00Z'
      }
    ],
    systemHealth: {
      gateway: 'healthy',
      engine: 'healthy',
      blockchain: 'healthy',
      storage: 'healthy'
    }
  });
});

// Backup management
router.get('/backups', (req, res) => {
  const mockBackups = [
    {
      id: 'backup_001',
      name: 'Documents Backup',
      files: ['document1.pdf', 'document2.docx', 'spreadsheet.xlsx'],
      size: '1.2GB',
      status: 'completed',
      progress: 100,
      created: '2025-06-26T10:30:00Z',
      updated: '2025-06-26T10:45:00Z',
      destination: 'filecoin://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    },
    {
      id: 'backup_002',
      name: 'Project Files',
      files: ['src/', 'package.json', 'README.md'],
      size: '2.8GB',
      status: 'running',
      progress: 65,
      created: '2025-06-26T09:15:00Z',
      updated: '2025-06-26T10:00:00Z',
      destination: 'pending'
    },
    {
      id: 'backup_003',
      name: 'Media Files',
      files: ['photos/', 'videos/', 'audio/'],
      size: '15.4GB',
      status: 'failed',
      progress: 30,
      created: '2025-06-25T18:00:00Z',
      updated: '2025-06-25T18:30:00Z',
      error: 'Network timeout during upload',
      destination: 'failed'
    }
  ];

  res.json(mockBackups);
});

// Create new backup
router.post('/backups', (req, res) => {
  const { name, files, options } = req.body;

  if (!name || !files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Name and files array are required' });
  }

  const newBackup = {
    id: 'backup_' + Date.now(),
    name: name,
    files: files,
    status: 'pending',
    progress: 0,
    created: new Date().toISOString(),
    options: options || {}
  };

  res.json({
    success: true,
    backup: newBackup,
    message: 'Backup created successfully'
  });
});

// Get specific backup
router.get('/backups/:id', (req, res) => {
  const { id } = req.params;

  const backup = {
    id: id,
    name: 'Sample Backup',
    files: ['file1.txt', 'file2.pdf'],
    size: '1.2GB',
    status: 'completed',
    progress: 100,
    created: '2025-06-26T10:30:00Z',
    updated: '2025-06-26T10:45:00Z',
    destination: 'filecoin://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    logs: [
      { timestamp: '2025-06-26T10:30:00Z', level: 'info', message: 'Backup started' },
      { timestamp: '2025-06-26T10:32:00Z', level: 'info', message: 'Files compressed' },
      { timestamp: '2025-06-26T10:35:00Z', level: 'info', message: 'Upload to IPFS completed' },
      { timestamp: '2025-06-26T10:45:00Z', level: 'info', message: 'Backup completed successfully' }
    ]
  };

  res.json(backup);
});

// Settings management
router.get('/settings', (req, res) => {
  const settings = {
    general: {
      defaultDestination: 'filecoin',
      compression: true,
      encryption: false,
      notifications: true
    },
    storage: {
      maxFileSize: '100MB',
      retentionPeriod: 30,
      redundancy: 2
    },
    filecoin: {
      nodeUrl: 'https://api.node.glif.io/rpc/v1',
      walletAddress: 'f1abc123...',
      defaultDuration: 180
    },
    notifications: {
      email: 'user@example.com',
      webhookUrl: '',
      enableBackupComplete: true,
      enableBackupFailed: true
    }
  };

  res.json(settings);
});

// Update settings
router.put('/settings', (req, res) => {
  const updates = req.body;

  res.json({
    success: true,
    message: 'Settings updated successfully',
    updated: Object.keys(updates)
  });
});

// System statistics
router.get('/stats', (req, res) => {
  const stats = {
    overview: {
      totalBackups: 25,
      successfulBackups: 23,
      failedBackups: 2,
      totalStorage: '45.6GB',
      storageUsed: '32.1GB',
      storageAvailable: '13.5GB'
    },
    timeline: [
      { date: '2025-06-20', backups: 3, storage: '5.2GB' },
      { date: '2025-06-21', backups: 2, storage: '3.1GB' },
      { date: '2025-06-22', backups: 4, storage: '7.8GB' },
      { date: '2025-06-23', backups: 1, storage: '2.3GB' },
      { date: '2025-06-24', backups: 5, storage: '9.4GB' },
      { date: '2025-06-25', backups: 3, storage: '6.7GB' },
      { date: '2025-06-26', backups: 7, storage: '11.1GB' }
    ],
    fileTypes: [
      { type: 'Documents', count: 45, size: '12.3GB' },
      { type: 'Images', count: 123, size: '8.7GB' },
      { type: 'Videos', count: 12, size: '18.9GB' },
      { type: 'Archives', count: 8, size: '5.7GB' }
    ]
  };

  res.json(stats);
});

module.exports = router;
