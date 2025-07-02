#!/usr/bin/env node

/**
 * Storage optimization test script
 * Tests storage recommendations and cost calculations
 */

const OptimizeService = require('../services/blockchain/src/storage/optimize.service');

async function testStorageOptimization() {
    console.log('🧪 STORAGE OPTIMIZATION TEST');
    console.log('============================');
    
    const optimizeService = new OptimizeService();
    
    try {
        // Test basic optimization
        console.log('\n1. Testing basic storage optimization:');
        const fileSize = 1024 * 1024; // 1MB
        const basicOptimization = optimizeService.optimizeStorage(fileSize);
        
        console.log(`   📁 File size: ${fileSize} bytes (1MB)`);
        console.log(`   🏆 Best option: ${basicOptimization.bestOption?.provider || 'None'}`);
        console.log(`   💰 Estimated cost: $${basicOptimization.bestOption?.estimatedCost?.toFixed(6) || 'N/A'}`);
        console.log(`   📊 Qualifying providers: ${basicOptimization.qualifyingProviders}`);
        
        // Test with requirements
        console.log('\n2. Testing optimization with requirements:');
        const requirements = {
            budget: 0.001,
            minReliability: 0.95,
            preferredSpeed: 'fast',
            features: ['encryption']
        };
        
        const advancedOptimization = optimizeService.optimizeStorage(fileSize, requirements);
        console.log(`   💰 Budget: $${requirements.budget}`);
        console.log(`   🛡️  Min reliability: ${requirements.minReliability * 100}%`);
        console.log(`   ⚡ Preferred speed: ${requirements.preferredSpeed}`);
        console.log(`   🔧 Required features: ${requirements.features.join(', ')}`);
        console.log(`   🏆 Best option: ${advancedOptimization.bestOption?.provider || 'None'}`);
        console.log(`   📊 Qualifying providers: ${advancedOptimization.qualifyingProviders}`);
        
        // Test file type recommendations
        console.log('\n3. Testing file type recommendations:');
        const fileTypes = ['image', 'video', 'document', 'backup', 'code'];
        
        for (const fileType of fileTypes) {
            const typeOptimization = optimizeService.getRecommendationsByFileType(fileType, fileSize);
            console.log(`   📄 ${fileType.toUpperCase()}: Best option = ${typeOptimization.bestOption?.provider || 'None'}`);
        }
        
        // Test cost calculation
        console.log('\n4. Testing cost calculations:');
        const costs = optimizeService.calculateStorageCosts(fileSize, 30);
        console.log('   💰 Monthly costs by provider:');
        costs.forEach(cost => {
            console.log(`      ${cost.provider}: $${cost.monthlyCost.toFixed(6)} (${cost.reliability * 100}% reliable)`);
        });
        
        // Test provider comparison
        console.log('\n5. Testing provider comparison:');
        const comparison = optimizeService.compareProviders();
        console.log('   📊 Provider comparison:');
        comparison.forEach(provider => {
            console.log(`      ${provider.name}: ${provider.reliability * 100}% reliable, ${provider.speed} speed, best for: ${provider.bestFor}`);
        });
        
        console.log('\n🎉 Storage optimization test completed successfully!');
        
        return {
            basicOptimization,
            advancedOptimization,
            costs,
            comparison,
            success: true
        };
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run test if called directly
if (require.main === module) {
    testStorageOptimization()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testStorageOptimization };
