#!/usr/bin/env node

/**
 * Network Configuration Generator for Subgraph
 * 
 * This script generates network-specific subgraph configurations using
 * the @prepaid-gas/constants package to eliminate hardcoded addresses.
 * 
 * Usage:
 *   npm run generate-config <network>
 *   npm run generate-config base-sepolia
 *   npm run generate-config base
 */

const fs = require('fs');
const path = require('path');

// Import the constants package and viem
const { getNetworkPresetByName } = require('@prepaid-gas/constants');
const { createPublicClient, http } = require('viem');

// CLI argument parsing
const network = process.argv[2];

if (!network) {
  console.error('❌ Error: Network name is required');
  console.log('Usage: npm run generate-config <network>');
  console.log('Available networks:', Object.keys(NETWORK_PRESETS).join(', '));
  process.exit(1);
}

try {
  (async () => {
    await main();
  })();
} catch (error) {
  console.error('❌ Error generating configuration:', error.message);
  process.exit(1);
}

async function main() {
    // Get network configuration from constants package
    const networkConfig = getNetworkPresetByName(network);
    if (!networkConfig) {
        console.error(`❌ Error: Network "${network}" not found`);
        console.log('Available networks: base-sepolia');
        process.exit(1);
    }

    console.log(`🔧 Generating configuration for network: ${network}`);
  
  // Generate subgraph.yaml with dynamic start blocks
  await generateSubgraphYaml(networkConfig);
  
  // Generate utils configuration
  generateUtilsConfig(networkConfig);
  
  console.log('✅ Configuration generated successfully!');
  console.log(`📝 Files updated:`);
  console.log(`   - subgraph.yaml (${network})`);
  console.log(`   - src/generated-config.ts`);
}

/**
 * Generate subgraph.yaml for the specified network
 */
async function generateSubgraphYaml(networkConfig) {
  console.log('🔍 Fetching contract creation blocks...');
  
  // Create viem client for the network
  const client = createPublicClient({
    chain: getViemChain(networkConfig),
    transport: http(networkConfig.defaultRpcUrl)
  });

  // Fetch start blocks for all contracts
  const startBlocks = await getContractStartBlocks(client, networkConfig);
  
  const template = `specVersion: 1.3.0
indexerHints:
  prune: auto
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: OneTimeUsePaymaster
    network: ${networkConfig.name}
    source:
      address: "${networkConfig.paymasters.OneTimeUsePaymaster.address}"
      abi: OneTimeUsePaymaster
      startBlock: ${startBlocks.OneTimeUsePaymaster}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - PaymasterContract
        - Activity
        - UserOperation
      abis:
        - name: OneTimeUsePaymaster
          file: ./abis/OneTimeUsePaymaster.json
      eventHandlers:
        - event: Deposited(indexed address,uint256)
          handler: handleDeposited
        - event: LeafInserted(uint256,uint256,uint256)
          handler: handleLeafInserted
        - event: OwnershipTransferred(indexed address,indexed address)
          handler: handleOwnershipTransferred
        - event: PoolDied()
          handler: handlePoolDied
        - event: UserOpSponsoredWithNullifier(indexed address,indexed bytes32,uint256,uint256)
          handler: handleUserOpSponsoredWithNullifier
        - event: RevenueWithdrawn(address,uint256)
          handler: handleRevenueWithdrawn
      file: ./src/one-time-use-paymaster.ts

  - kind: ethereum
    name: GasLimitedPaymaster
    network: ${networkConfig.name}
    source:
      address: "${networkConfig.paymasters.GasLimitedPaymaster.address}"
      abi: GasLimitedPaymaster
      startBlock: ${startBlocks.GasLimitedPaymaster}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - PaymasterContract
        - Activity
        - UserOperation
      abis:
        - name: GasLimitedPaymaster
          file: ./abis/GasLimitedPaymaster.json
      eventHandlers:
        - event: Deposited(indexed address,uint256)
          handler: handleDeposited
        - event: LeafInserted(uint256,uint256,uint256)
          handler: handleLeafInserted
        - event: OwnershipTransferred(indexed address,indexed address)
          handler: handleOwnershipTransferred
        - event: PoolDied()
          handler: handlePoolDied
        - event: UserOpSponsoredWithNullifier(indexed address,indexed bytes32,uint256,uint256)
          handler: handleUserOpSponsoredWithNullifier
        - event: RevenueWithdrawn(address,uint256)
          handler: handleRevenueWithdrawn
      file: ./src/gas-limited-paymaster.ts

  - kind: ethereum
    name: CacheEnabledGasLimitedPaymaster
    network: ${networkConfig.name}
    source:
      address: "${networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.address}"
      abi: CacheEnabledGasLimitedPaymaster
      startBlock: ${startBlocks.CacheEnabledGasLimitedPaymaster}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - PaymasterContract
        - Activity
        - UserOperation
      abis:
        - name: CacheEnabledGasLimitedPaymaster
          file: ./abis/CacheEnabledGasLimitedPaymaster.json
      eventHandlers:
        - event: Deposited(indexed address,uint256)
          handler: handleDeposited
        - event: LeafInserted(uint256,uint256,uint256)
          handler: handleLeafInserted
        - event: OwnershipTransferred(indexed address,indexed address)
          handler: handleOwnershipTransferred
        - event: PoolDied()
          handler: handlePoolDied
        - event: UserOpSponsored(indexed address,indexed bytes32,uint256)
          handler: handleUserOpSponsored
        - event: RevenueWithdrawn(address,uint256)
          handler: handleRevenueWithdrawn
      file: ./src/cache-enabled-gas-limited-paymaster.ts
`;

  fs.writeFileSync('./subgraph.yaml', template);
  console.log('📄 Generated subgraph.yaml with dynamic start blocks');
}

/**
 * Generate TypeScript configuration file for utils
 */
function generateUtilsConfig(networkConfig) {
  const template = `/**
 * Generated configuration file for subgraph utils
 * 
 * This file is auto-generated from @prepaid-gas/constants package.
 * Do not edit manually - run 'npm run generate-config <network>' instead.
 * 
 * Network: ${networkConfig.name}
 * Generated: ${new Date().toISOString()}
 */

import { BigInt, Bytes } from "@graphprotocol/graph-ts";

// Network configuration class
export class NetworkConfig {
    name: string;
    chainId: BigInt;

    constructor(name: string, chainId: BigInt) {
        this.name = name;
        this.chainId = chainId;
    }
}

// Contract configuration class
export class ContractConfig {
    type: string;
    network: string;
    joiningAmount: BigInt;
    scope: BigInt;
    verifier: Bytes;

    constructor(type: string, network: string, joiningAmount: BigInt, scope: BigInt, verifier: Bytes) {
        this.type = type;
        this.network = network;
        this.joiningAmount = joiningAmount;
        this.scope = scope;
        this.verifier = verifier;
    }
}

// Current network configuration
export const CURRENT_NETWORK = "${networkConfig.name}";
export const NETWORK_CHAIN_ID = BigInt.fromI32(${getChainId(networkConfig)});

// Network configurations
export const NETWORK_CONFIGS = new Map<string, NetworkConfig>();
NETWORK_CONFIGS.set("${networkConfig.name}", new NetworkConfig("${networkConfig.description || networkConfig.name}", BigInt.fromI32(${getChainId(networkConfig)})));

// Contract addresses (lowercase for lookup optimization)
export const CONTRACT_ADDRESSES = new Map<string, string>();
CONTRACT_ADDRESSES.set("${networkConfig.paymasters.GasLimitedPaymaster.address.toLowerCase()}", "GasLimitedPaymaster");
CONTRACT_ADDRESSES.set("${networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.address.toLowerCase()}", "CacheEnabledGasLimitedPaymaster");
CONTRACT_ADDRESSES.set("${networkConfig.paymasters.OneTimeUsePaymaster.address.toLowerCase()}", "OneTimeUsePaymaster");

// Contract configurations
export const CONTRACT_CONFIGS = new Map<string, ContractConfig>();

// GasLimitedPaymaster configuration
CONTRACT_CONFIGS.set(
  "${networkConfig.paymasters.GasLimitedPaymaster.address.toLowerCase()}",
  new ContractConfig(
    "GasLimitedPaymaster",
    "${networkConfig.name}",
    BigInt.fromString("${networkConfig.paymasters.GasLimitedPaymaster.joiningAmount.toString()}"),
    BigInt.fromString("${networkConfig.paymasters.GasLimitedPaymaster.scope.toString()}"),
    Bytes.fromHexString("${getVerifierAddress(networkConfig)}")
  )
);

// CacheEnabledGasLimitedPaymaster configuration
CONTRACT_CONFIGS.set(
  "${networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.address.toLowerCase()}",
  new ContractConfig(
    "CacheEnabledGasLimitedPaymaster", 
    "${networkConfig.name}",
    BigInt.fromString("${networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.joiningAmount.toString()}"),
    BigInt.fromString("${networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.scope.toString()}"),
    Bytes.fromHexString("${getVerifierAddress(networkConfig)}")
  )
);

// OneTimeUsePaymaster configuration
CONTRACT_CONFIGS.set(
  "${networkConfig.paymasters.OneTimeUsePaymaster.address.toLowerCase()}",
  new ContractConfig(
    "OneTimeUsePaymaster",
    "${networkConfig.name}",
    BigInt.fromString("${networkConfig.paymasters.OneTimeUsePaymaster.joiningAmount.toString()}"),
    BigInt.fromString("${networkConfig.paymasters.OneTimeUsePaymaster.scope.toString()}"),
    Bytes.fromHexString("${getVerifierAddress(networkConfig)}")
  )
);

// Utility constants
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Helper functions for backward compatibility
export function getNetworkConfig(network: string): NetworkConfig | null {
    return NETWORK_CONFIGS.get(network) || null;
}

export function getContractConfig(contractAddress: Bytes): ContractConfig | null {
    return CONTRACT_CONFIGS.get(contractAddress.toHexString().toLowerCase()) || null;
}

export function getContractType(contractAddress: Bytes): string | null {
    return CONTRACT_ADDRESSES.get(contractAddress.toHexString().toLowerCase()) || null;
}
`;

  // Ensure src directory exists
  if (!fs.existsSync('./src')) {
    fs.mkdirSync('./src');
  }
  
  fs.writeFileSync('./src/generated-config.ts', template);
}

/**
 * Get start block for a contract (placeholder - should be configurable)
 */
function getStartBlock(networkConfig, contractType) {
  // Default start blocks - these should ideally come from the constants package
  const defaultStartBlocks = {
    'base-sepolia': {
      'OneTimeUsePaymaster': 28981339,
      'GasLimitedPaymaster': 28981338,
      'CacheEnabledGasLimitedPaymaster': 28981337
    }
  };
  
  return defaultStartBlocks[networkConfig.name]?.[contractType] || 0;
}

/**
 * Fetch contract creation blocks using viem
 */
async function getContractStartBlocks(client, networkConfig) {
  const contracts = [
    { name: 'OneTimeUsePaymaster', address: networkConfig.paymasters.OneTimeUsePaymaster.address },
    { name: 'GasLimitedPaymaster', address: networkConfig.paymasters.GasLimitedPaymaster.address },
    { name: 'CacheEnabledGasLimitedPaymaster', address: networkConfig.paymasters.CacheEnabledGasLimitedPaymaster.address }
  ];

  const startBlocks = {};

  for (const contract of contracts) {
    try {
      console.log(`  📍 Fetching creation block for ${contract.name} (${contract.address})...`);
      
      // Method 1: Check if we have a known deployment block in constants
      const knownBlock = getKnownDeploymentBlock(networkConfig, contract.name);
      if (knownBlock) {
        console.log(`  ✅ ${contract.name}: Using known block ${knownBlock}`);
        startBlocks[contract.name] = knownBlock;
        continue;
      }

      // Method 2: Try block explorer API first (faster than RPC)
      const explorerBlock = await getBlockFromExplorer(networkConfig, contract.address);
      if (explorerBlock) {
        console.log(`  ✅ ${contract.name}: Found via explorer at block ${explorerBlock}`);
        startBlocks[contract.name] = explorerBlock;
        continue;
      }
      
      // Method 3: Get the bytecode at the contract address to verify it exists
      const bytecode = await client.getCode({ address: contract.address });
      
      if (!bytecode || bytecode === '0x') {
        console.warn(`⚠️  Contract ${contract.name} not found at ${contract.address}, using fallback block`);
        startBlocks[contract.name] = getFallbackStartBlock(networkConfig, contract.name);
        continue;
      }

      // Method 4: Use optimized RPC search to find the contract creation block
      const creationBlock = await findContractCreationBlock(client, contract.address);
      startBlocks[contract.name] = creationBlock;
      
      console.log(`  ✅ ${contract.name}: Found via RPC at block ${creationBlock}`);
      
    } catch (error) {
      console.warn(`⚠️  Failed to fetch creation block for ${contract.name}, using fallback: ${error.message}`);
      startBlocks[contract.name] = getFallbackStartBlock(networkConfig, contract.name);
    }
  }

  return startBlocks;
}

/**
 * Get known deployment block from constants (most efficient)
 */
function getKnownDeploymentBlock(networkConfig, contractType) {
  // This could be extended to include deployment blocks in the constants package
  const knownBlocks = {
    'base-sepolia': {
      'OneTimeUsePaymaster': 28981339,
      'GasLimitedPaymaster': 28981338,
      'CacheEnabledGasLimitedPaymaster': 28981337
    }
  };
  
  return knownBlocks[networkConfig.name]?.[contractType];
}

/**
 * Try to get deployment block from block explorer API
 */
async function getBlockFromExplorer(networkConfig, contractAddress) {
  const explorerApis = {
    'base-sepolia': `https://api-sepolia.basescan.org/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc`,
    'base': `https://api.basescan.org/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc`
  };

  const apiUrl = explorerApis[networkConfig.name];
  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.status === '1' && data.result && data.result.length > 0) {
      // First transaction to this address should be the deployment
      const firstTx = data.result[0];
      if (firstTx.to === '' || firstTx.to.toLowerCase() === contractAddress.toLowerCase()) {
        return parseInt(firstTx.blockNumber);
      }
    }
  } catch (error) {
    console.warn(`Could not fetch from block explorer: ${error.message}`);
  }

  return null;
}

/**
 * Binary search to find contract creation block
 */
async function findContractCreationBlock(client, contractAddress) {
  try {
    // Method 1: Try to find contract creation via transaction receipt lookup
    // This works if we can find the deployment transaction
    const creationBlock = await findDeploymentTransaction(client, contractAddress);
    if (creationBlock) {
      return creationBlock;
    }
  } catch (error) {
    console.warn(`Could not find deployment transaction, falling back to binary search: ${error.message}`);
  }

  // Method 2: Fallback to binary search if direct lookup fails
  return await binarySearchContractCreation(client, contractAddress);
}

/**
 * Find contract deployment transaction and return block number
 */
async function findDeploymentTransaction(client, contractAddress) {
  // Get current block to set reasonable bounds
  const latestBlock = await client.getBlockNumber();
  const searchFromBlock = latestBlock - 1000000n; // Search last 1M blocks
  
  try {
    // Look for contract creation logs or traces
    // For most contracts, we can check recent blocks more efficiently
    const recentBlocks = 10000; // Check last 10k blocks first
    const fromBlock = latestBlock - BigInt(recentBlocks);
    
    // Try to get the code and then work backwards efficiently
    let testBlock = latestBlock;
    let step = 5000n; // Start with larger steps
    
    // Quick scan with larger steps to find approximate range
    while (testBlock > fromBlock && step > 0) {
      try {
        const code = await client.getCode({ 
          address: contractAddress, 
          blockNumber: testBlock 
        });
        
        if (!code || code === '0x') {
          // Contract doesn't exist at this block yet
          break;
        }
        
        testBlock -= step;
      } catch (error) {
        testBlock -= step;
      }
    }
    
    // Now do a more precise search in the found range
    if (testBlock < latestBlock) {
      return await binarySearchInRange(client, contractAddress, testBlock, testBlock + step);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Binary search within a specific range
 */
async function binarySearchInRange(client, contractAddress, low, high) {
  let result = high;

  while (low <= high) {
    const mid = (low + high) / 2n;
    
    try {
      const code = await client.getCode({ 
        address: contractAddress, 
        blockNumber: mid 
      });
      
      if (code && code !== '0x') {
        // Contract exists at this block, try earlier
        result = mid;
        high = mid - 1n;
      } else {
        // Contract doesn't exist, try later
        low = mid + 1n;
      }
    } catch (error) {
      // If we can't fetch at this block, try later
      low = mid + 1n;
    }
  }

  return Number(result);
}

/**
 * Original binary search as fallback
 */
async function binarySearchContractCreation(client, contractAddress) {
  const latestBlock = await client.getBlockNumber();
  let low = 0n;
  let high = latestBlock;
  let result = latestBlock;

  while (low <= high) {
    const mid = (low + high) / 2n;
    
    try {
      const code = await client.getCode({ 
        address: contractAddress, 
        blockNumber: mid 
      });
      
      if (code && code !== '0x') {
        // Contract exists at this block, try earlier
        result = mid;
        high = mid - 1n;
      } else {
        // Contract doesn't exist, try later
        low = mid + 1n;
      }
    } catch (error) {
      // If we can't fetch at this block, try later
      low = mid + 1n;
    }
  }

  return Number(result);
}

/**
 * Get fallback start block if viem fails
 */
function getFallbackStartBlock(networkConfig, contractType) {
  const fallbackBlocks = {
    'base-sepolia': {
      'OneTimeUsePaymaster': 28981339,
      'GasLimitedPaymaster': 28981338,
      'CacheEnabledGasLimitedPaymaster': 28981337
    },
    'base': {
      'OneTimeUsePaymaster': 0,
      'GasLimitedPaymaster': 0,
      'CacheEnabledGasLimitedPaymaster': 0
    }
  };
  
  return fallbackBlocks[networkConfig.name]?.[contractType] || 0;
}

/**
 * Get viem chain configuration
 */
function getViemChain(networkConfig) {
  // Import viem chains
  const { baseSepolia, base, mainnet, sepolia } = require('viem/chains');
  
  const chains = {
    'base-sepolia': baseSepolia,
    'base': base,
    'ethereum': mainnet,
    'sepolia': sepolia
  };
  
  const chain = chains[networkConfig.name];
  if (!chain) {
    throw new Error(`Unsupported network: ${networkConfig.name}`);
  }
  
  return chain;
}

/**
 * Get chain ID for the network
 */
function getChainId(networkConfig) {
  const chainIds = {
    'base-sepolia': 84532,
    'base': 8453,
    'ethereum': 1,
    'sepolia': 11155111
  };
  
  return chainIds[networkConfig.name] || 1;
}

/**
 * Get verifier address (placeholder - should come from constants)
 */
function getVerifierAddress(networkConfig) {
  // This should ideally come from the constants package
  return "0x6C42599435B82121794D835263C846384869502d";
}
