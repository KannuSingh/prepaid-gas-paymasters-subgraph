#!/usr/bin/env node

const { execSync } = require('child_process');
const { getSupportedNetworkNames } = require('@prepaid-gas/constants');

// Get network from command line args or environment variable
const network = process.argv[2] || process.env.NETWORK || 'base-sepolia';

console.log(`🔧 Running codegen for network: ${network}`);

// Validate network
try {
    const supportedNetworks = getSupportedNetworkNames();
    if (!supportedNetworks.includes(network)) {
        console.error(`❌ Error: Network "${network}" is not supported.`);
        console.log(`✅ Supported networks: ${supportedNetworks.join(', ')}`);
        process.exit(1);
    }
} catch (error) {
    console.warn(`⚠️  Warning: Could not validate network (${error.message}). Proceeding anyway...`);
}

try {
    // Step 1: Generate configuration
    console.log(`📝 Step 1: Generating configuration for ${network}...`);
    execSync(`node scripts/generate-config.js ${network}`, { stdio: 'inherit' });
    
    // Step 2: Run graph codegen
    console.log(`⚙️  Step 2: Running graph codegen...`);
    execSync('npx graph codegen', { stdio: 'inherit' });
    
    console.log(`🎉 Codegen completed successfully for ${network}!`);
} catch (error) {
    console.error(`❌ Codegen failed: ${error.message}`);
    process.exit(1);
}
