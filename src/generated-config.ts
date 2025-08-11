/**
 * Generated configuration file for subgraph utils
 * 
 * This file is auto-generated from @prepaid-gas/constants package.
 * Do not edit manually - run 'npm run generate-config <network>' instead.
 * 
 * Network: base-sepolia
 * Generated: 2025-08-10T12:24:54.199Z
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
export const CURRENT_NETWORK = "base-sepolia";
export const NETWORK_CHAIN_ID = BigInt.fromI32(84532);

// Network configurations
export const NETWORK_CONFIGS = new Map<string, NetworkConfig>();
NETWORK_CONFIGS.set("base-sepolia", new NetworkConfig("Base Sepolia testnet with GasLimited, OneTimeUse and CacheEnabledGasLimited paymasters - ideal for development and testing", BigInt.fromI32(84532)));

// Contract addresses (lowercase for lookup optimization)
export const CONTRACT_ADDRESSES = new Map<string, string>();
CONTRACT_ADDRESSES.set("0xdec68496a556cee996894ac2fdc9e43f39938e62", "GasLimitedPaymaster");
CONTRACT_ADDRESSES.set("0xffe794611e59a987d8f13585248414d40a02bb58", "CacheEnabledGasLimitedPaymaster");
CONTRACT_ADDRESSES.set("0x4daca5b0a5d10853f84bb400c5232e4605bc14a0", "OneTimeUsePaymaster");

// Contract configurations
export const CONTRACT_CONFIGS = new Map<string, ContractConfig>();

// GasLimitedPaymaster configuration
CONTRACT_CONFIGS.set(
  "0xdec68496a556cee996894ac2fdc9e43f39938e62",
  new ContractConfig(
    "GasLimitedPaymaster",
    "base-sepolia",
    BigInt.fromString("100000000000000"),
    BigInt.fromString("4049863411493281632527463033697091205373305699424276163943787436912533928625"),
    Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
  )
);

// CacheEnabledGasLimitedPaymaster configuration
CONTRACT_CONFIGS.set(
  "0xffe794611e59a987d8f13585248414d40a02bb58",
  new ContractConfig(
    "CacheEnabledGasLimitedPaymaster", 
    "base-sepolia",
    BigInt.fromString("100000000000000"),
    BigInt.fromString("21337712239027152071670174334401160018347160721202232719434727113172230245419"),
    Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
  )
);

// OneTimeUsePaymaster configuration
CONTRACT_CONFIGS.set(
  "0x4daca5b0a5d10853f84bb400c5232e4605bc14a0",
  new ContractConfig(
    "OneTimeUsePaymaster",
    "base-sepolia",
    BigInt.fromString("100000000000000"),
    BigInt.fromString("4279505695869108679679209633705194792004361714689857674131402936989478177358"),
    Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
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
