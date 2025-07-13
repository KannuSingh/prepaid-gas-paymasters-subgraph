import { BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    PaymasterContract,
    Pool,
    PoolMember,
    Transaction,
    RevenueWithdrawal,
    NullifierUsage,
    MerkleRoot,
    DailyPoolStats,
    DailyGlobalStats,
    NetworkInfo,
} from "../generated/schema";

export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Network configuration
export const NETWORK_CONFIGS = new Map<string, NetworkConfig>();

class NetworkConfig {
    name: string;
    chainId: BigInt;

    constructor(name: string, chainId: BigInt) {
        this.name = name;
        this.chainId = chainId;
    }
}

// Initialize network configurations
NETWORK_CONFIGS.set("base-sepolia", new NetworkConfig("Base Sepolia", BigInt.fromI32(84532)));
NETWORK_CONFIGS.set("base", new NetworkConfig("Base", BigInt.fromI32(8453)));
NETWORK_CONFIGS.set("ethereum", new NetworkConfig("Ethereum Mainnet", BigInt.fromI32(1)));
NETWORK_CONFIGS.set("sepolia", new NetworkConfig("Sepolia", BigInt.fromI32(11155111)));

export function getNetworkConfig(network: string): NetworkConfig {
    let config = NETWORK_CONFIGS.get(network);
    if (config == null) {
        // Default fallback
        config = new NetworkConfig(network, ZERO_BI);
    }
    return config;
}

export function getOrCreateNetworkInfo(network: string, block: ethereum.Block, transaction: ethereum.Transaction): NetworkInfo {
    let networkInfo = NetworkInfo.load(network);
    let config = getNetworkConfig(network);

    if (networkInfo == null) {
        networkInfo = new NetworkInfo(network);
        networkInfo.name = config.name;
        networkInfo.chainId = config.chainId;
        networkInfo.totalPaymasters = ZERO_BI;
        networkInfo.totalPools = ZERO_BI;
        networkInfo.totalMembers = ZERO_BI;
        networkInfo.totalTransactions = ZERO_BI;
        networkInfo.totalGasSpent = ZERO_BI;
        networkInfo.totalRevenue = ZERO_BI;
        networkInfo.firstDeploymentBlock = block.number;
        networkInfo.firstDeploymentTimestamp = block.timestamp;
        networkInfo.lastActivityBlock = block.number;
        networkInfo.lastActivityTimestamp = block.timestamp;
        networkInfo.save();
    }

    return networkInfo as NetworkInfo;
}

export function getOrCreatePaymasterContract(
    address: Bytes,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): PaymasterContract {
    let network = getNetworkFromContract(address);
    let entityId = generateEntityId(network, address.toHexString());
    let paymaster = PaymasterContract.load(entityId);
    let config = getNetworkConfig(network);

    if (paymaster == null) {
        paymaster = new PaymasterContract(entityId);
        paymaster.contractType = contractType;
        paymaster.address = address;
        paymaster.network = network;
        paymaster.chainId = config.chainId;
        paymaster.totalUsersDeposit = ZERO_BI;
        paymaster.currentDeposit = ZERO_BI;
        paymaster.revenue = ZERO_BI;
        paymaster.deployedAtBlock = block.number;
        paymaster.deployedAtTransaction = transaction.hash;
        paymaster.deployedAtTimestamp = block.timestamp;
        paymaster.lastUpdatedBlock = block.number;
        paymaster.lastUpdatedTimestamp = block.timestamp;
        paymaster.save();

        // Update network info
        let networkInfo = getOrCreateNetworkInfo(network, block, transaction);
        networkInfo.totalPaymasters = networkInfo.totalPaymasters.plus(ONE_BI);
        networkInfo.lastActivityBlock = block.number;
        networkInfo.lastActivityTimestamp = block.timestamp;
        networkInfo.save();
    }

    return paymaster as PaymasterContract;
}

export function getOrCreatePool(
    poolId: BigInt,
    paymaster: PaymasterContract,
    joiningFee: BigInt,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): Pool {
    let network = paymaster.network;
    let entityId = generateEntityId(network, paymaster.address.toHexString(), poolId.toString());
    let pool = Pool.load(entityId);
    let config = getNetworkConfig(network);

    if (pool == null) {
        pool = new Pool(entityId);
        pool.poolId = poolId;
        pool.paymaster = paymaster.id;
        pool.network = network;
        pool.chainId = config.chainId;
        pool.joiningFee = joiningFee;
        pool.totalDeposits = ZERO_BI;
        pool.memberCount = ZERO_BI;
        pool.currentMerkleRoot = ZERO_BI;
        pool.currentRootIndex = 0;
        pool.rootHistoryCount = 0;
        pool.createdAtBlock = block.number;
        pool.createdAtTransaction = transaction.hash;
        pool.createdAtTimestamp = block.timestamp;
        pool.lastUpdatedBlock = block.number;
        pool.lastUpdatedTimestamp = block.timestamp;
        pool.save();

        // Update network info
        let networkInfo = getOrCreateNetworkInfo(network, block, transaction);
        networkInfo.totalPools = networkInfo.totalPools.plus(ONE_BI);
        networkInfo.lastActivityBlock = block.number;
        networkInfo.lastActivityTimestamp = block.timestamp;
        networkInfo.save();
    }

    return pool as Pool;
}

export function createPoolMember(
    pool: Pool,
    paymaster: PaymasterContract,
    memberIndex: BigInt,
    identityCommitment: BigInt,
    merkleRoot: BigInt,
    rootIndex: i32,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): PoolMember {
    let network = pool.network;
    let entityId = generateEntityId(network, pool.id, memberIndex.toString());
    let member = new PoolMember(entityId);
    let config = getNetworkConfig(network);

    member.pool = pool.id;
    member.paymaster = paymaster.id;
    member.network = network;
    member.chainId = config.chainId;
    member.memberIndex = memberIndex;
    member.identityCommitment = identityCommitment;
    member.merkleRootWhenAdded = merkleRoot;
    member.rootIndexWhenAdded = rootIndex;
    member.addedAtBlock = block.number;
    member.addedAtTransaction = transaction.hash;
    member.addedAtTimestamp = block.timestamp;
    member.gasUsed = ZERO_BI;
    member.nullifierUsed = false;
    member.nullifier = ZERO_BI;

    member.save();

    // Update network info
    let networkInfo = getOrCreateNetworkInfo(network, block, transaction);
    networkInfo.totalMembers = networkInfo.totalMembers.plus(ONE_BI);
    networkInfo.lastActivityBlock = block.number;
    networkInfo.lastActivityTimestamp = block.timestamp;
    networkInfo.save();

    return member;
}

export function createMerkleRoot(
    pool: Pool,
    paymaster: PaymasterContract,
    root: BigInt,
    rootIndex: i32,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): MerkleRoot {
    let network = pool.network;
    let entityId = generateEntityId(network, pool.id, rootIndex.toString());
    let merkleRoot = new MerkleRoot(entityId);
    let config = getNetworkConfig(network);

    merkleRoot.pool = pool.id;
    merkleRoot.paymaster = paymaster.id;
    merkleRoot.network = network;
    merkleRoot.chainId = config.chainId;
    merkleRoot.root = root;
    merkleRoot.rootIndex = rootIndex;
    merkleRoot.createdAtBlock = block.number;
    merkleRoot.createdAtTransaction = transaction.hash;
    merkleRoot.createdAtTimestamp = block.timestamp;

    merkleRoot.save();
    return merkleRoot;
}

export function createTransaction(
    userOpHash: Bytes,
    paymaster: PaymasterContract,
    pool: Pool,
    sender: Bytes,
    actualGasCost: BigInt,
    nullifier: BigInt,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): Transaction {
    let network = paymaster.network;
    let entityId = generateEntityId(network, transaction.hash.toHexString());
    let userOp = new Transaction(entityId);
    let config = getNetworkConfig(network);

    userOp.userOpHash = userOpHash;
    userOp.paymaster = paymaster.id;
    userOp.pool = pool.id;
    userOp.network = network;
    userOp.chainId = config.chainId;
    userOp.sender = sender;
    userOp.actualGasCost = actualGasCost;
    userOp.nullifier = nullifier;
    userOp.executedAtBlock = block.number;
    userOp.executedAtTransaction = transaction.hash;
    userOp.executedAtTimestamp = block.timestamp;
    userOp.gasPrice = ZERO_BI;
    userOp.totalGasUsed = actualGasCost;

    userOp.save();

    // Update network info
    let networkInfo = getOrCreateNetworkInfo(network, block, transaction);
    networkInfo.totalTransactions = networkInfo.totalTransactions.plus(ONE_BI);
    networkInfo.totalGasSpent = networkInfo.totalGasSpent.plus(actualGasCost);
    networkInfo.lastActivityBlock = block.number;
    networkInfo.lastActivityTimestamp = block.timestamp;
    networkInfo.save();

    return userOp;
}

export function createRevenueWithdrawal(
    paymaster: PaymasterContract,
    recipient: Bytes,
    amount: BigInt,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): RevenueWithdrawal {
    let network = paymaster.network;
    let entityId = generateEntityId(network, transaction.hash.toHexString(), block.number.toString());
    let withdrawal = new RevenueWithdrawal(entityId);
    let config = getNetworkConfig(network);

    withdrawal.paymaster = paymaster.id;
    withdrawal.network = network;
    withdrawal.chainId = config.chainId;
    withdrawal.recipient = recipient;
    withdrawal.amount = amount;
    withdrawal.withdrawnAtBlock = block.number;
    withdrawal.withdrawnAtTransaction = transaction.hash;
    withdrawal.withdrawnAtTimestamp = block.timestamp;

    withdrawal.save();

    // Update network info
    let networkInfo = getOrCreateNetworkInfo(network, block, transaction);
    networkInfo.totalRevenue = networkInfo.totalRevenue.plus(amount);
    networkInfo.lastActivityBlock = block.number;
    networkInfo.lastActivityTimestamp = block.timestamp;
    networkInfo.save();

    return withdrawal;
}

export function getOrCreateNullifierUsage(
    nullifier: BigInt,
    paymaster: PaymasterContract,
    pool: Pool,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): NullifierUsage {
    let network = paymaster.network;
    let entityId = generateEntityId(network, nullifier.toString());
    let nullifierUsage = NullifierUsage.load(entityId);
    let config = getNetworkConfig(network);

    if (nullifierUsage == null) {
        nullifierUsage = new NullifierUsage(entityId);
        nullifierUsage.nullifier = nullifier;
        nullifierUsage.paymaster = paymaster.id;
        nullifierUsage.pool = pool.id;
        nullifierUsage.network = network;
        nullifierUsage.chainId = config.chainId;
        nullifierUsage.isUsed = false;
        nullifierUsage.gasUsed = ZERO_BI;
        nullifierUsage.firstUsedAtBlock = block.number;
        nullifierUsage.firstUsedAtTransaction = transaction.hash;
        nullifierUsage.firstUsedAtTimestamp = block.timestamp;
        nullifierUsage.lastUpdatedBlock = block.number;
        nullifierUsage.lastUpdatedTimestamp = block.timestamp;
        nullifierUsage.save();
    }

    return nullifierUsage as NullifierUsage;
}

export function updateDailyPoolStats(
    pool: Pool,
    block: ethereum.Block,
    newMembers: BigInt = ZERO_BI,
    transactions: BigInt = ZERO_BI,
    gasSpent: BigInt = ZERO_BI,
    revenueGenerated: BigInt = ZERO_BI
): void {
    let network = pool.network;
    let date = formatDate(block.timestamp);

    let entityId = generateEntityId(network, date, pool.id);
    let stats = DailyPoolStats.load(entityId);
    let config = getNetworkConfig(network);

    if (stats == null) {
        stats = new DailyPoolStats(entityId);
        stats.date = date;
        stats.pool = pool.id;
        stats.network = network;
        stats.chainId = config.chainId;
        stats.newMembers = ZERO_BI;
        stats.transactions = ZERO_BI;
        stats.gasSpent = ZERO_BI;
        stats.revenueGenerated = ZERO_BI;
        stats.totalMembers = pool.memberCount;
        stats.totalDeposits = pool.totalDeposits;
    }

    stats.newMembers = stats.newMembers.plus(newMembers);
    stats.transactions = stats.transactions.plus(transactions);
    stats.gasSpent = stats.gasSpent.plus(gasSpent);
    stats.revenueGenerated = stats.revenueGenerated.plus(revenueGenerated);
    stats.totalMembers = pool.memberCount;
    stats.totalDeposits = pool.totalDeposits;

    stats.save();
}

export function updateDailyGlobalStats(
    network: string,
    block: ethereum.Block,
    newPools: BigInt = ZERO_BI,
    newMembers: BigInt = ZERO_BI,
    transactions: BigInt = ZERO_BI,
    gasSpent: BigInt = ZERO_BI,
    revenueGenerated: BigInt = ZERO_BI
): void {
    let date = formatDate(block.timestamp);

    let entityId = generateEntityId(network, date);
    let stats = DailyGlobalStats.load(entityId);
    let config = getNetworkConfig(network);

    if (stats == null) {
        stats = new DailyGlobalStats(entityId);
        stats.date = date;
        stats.network = network;
        stats.chainId = config.chainId;
        stats.newPools = ZERO_BI;
        stats.totalNewMembers = ZERO_BI;
        stats.totalTransactions = ZERO_BI;
        stats.totalGasSpent = ZERO_BI;
        stats.totalRevenueGenerated = ZERO_BI;
        stats.totalActivePools = ZERO_BI;
        stats.totalMembers = ZERO_BI;
    }

    stats.newPools = stats.newPools.plus(newPools);
    stats.totalNewMembers = stats.totalNewMembers.plus(newMembers);
    stats.totalTransactions = stats.totalTransactions.plus(transactions);
    stats.totalGasSpent = stats.totalGasSpent.plus(gasSpent);
    stats.totalRevenueGenerated = stats.totalRevenueGenerated.plus(revenueGenerated);

    stats.save();
}

export function formatDate(timestamp: BigInt): string {
    // Convert timestamp to milliseconds for JavaScript Date
    let timestampMs = timestamp.toI32() * 1000;
    let date = new Date(timestampMs);
    return date.toISOString().split("T")[0];
}

// Contract address to network mapping
const CONTRACT_TO_NETWORK = new Map<string, string>();

// Initialize contract mappings for all supported networks
CONTRACT_TO_NETWORK.set("0x3BEeC075aC5A77fFE0F9ee4bbb3DCBd07fA93fbf".toLowerCase(), "base-sepolia"); // GasLimitedPaymaster
CONTRACT_TO_NETWORK.set("0x243A735115F34BD5c0F23a33a444a8d26e31E2E7".toLowerCase(), "base-sepolia"); // OneTimeUsePaymaster

// Add more networks as needed
// CONTRACT_TO_NETWORK.set("0x...".toLowerCase(), "base"); // Base mainnet
// CONTRACT_TO_NETWORK.set("0x...".toLowerCase(), "ethereum"); // Ethereum mainnet
// CONTRACT_TO_NETWORK.set("0x...".toLowerCase(), "sepolia"); // Sepolia testnet

export function getNetworkFromContract(contractAddress: Bytes): string {
    let network = CONTRACT_TO_NETWORK.get(contractAddress.toHexString().toLowerCase());
    if (network == null) {
        // Default fallback - you might want to handle this differently
        log.warning("Unknown contract address: {}, defaulting to base-sepolia", [contractAddress.toHexString()]);
        return "base-sepolia";
    }
    return network;
}

// Generate unique cross-chain entity IDs
export function generateEntityId(network: string, part1: string, part2: string = "", part3: string = ""): string {
    let id = network + "-" + part1;
    if (part2 !== "") {
        id = id + "-" + part2;
    }
    if (part3 !== "") {
        id = id + "-" + part3;
    }
    return id;
}
