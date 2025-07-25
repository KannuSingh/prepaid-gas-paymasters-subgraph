import { BigInt, Bytes, log, ethereum } from "@graphprotocol/graph-ts";
import { Activity, PaymasterContract } from "../generated/schema";
import { getOrCreatePaymasterContract, updatePaymasterTreeState, generateEntityId, getNetworkConfig, ZERO_BI, ONE_BI } from "./utils";

// Helper functions that can be called from contract-specific handlers
export function processDeposited(
    contractAddress: Bytes,
    depositor: Bytes,
    commitment: BigInt,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): void {
    let paymaster = getOrCreatePaymasterContract(contractAddress, contractType, block, transaction);

    log.info("{}: Deposit - depositor: {}, commitment: {}, network: {}", [
        contractType,
        depositor.toHexString(),
        commitment.toString(),
        paymaster.network,
    ]);

    // Create DEPOSIT activity
    let network = paymaster.network;
    let entityId = generateEntityId(network, transaction.hash.toHexString(), "0");
    let activity = new Activity(entityId);
    let config = getNetworkConfig(network);

    activity.type = "DEPOSIT";
    activity.paymaster = paymaster.id;
    activity.network = network;
    activity.chainId = config.chainId;
    activity.block = block.number;
    activity.transaction = transaction.hash;
    activity.timestamp = block.timestamp;

    // Set deposit-specific fields
    activity.depositor = depositor;
    activity.commitment = commitment;
    // memberIndex and newRoot will be set by LeafInserted event

    activity.save();

    // Update paymaster total deposits
    paymaster.totalDeposit = paymaster.totalDeposit.plus(paymaster.joiningAmount);
    paymaster.lastBlock = block.number;
    paymaster.lastTimestamp = block.timestamp;
    paymaster.save();
}

export function processLeafInserted(
    contractAddress: Bytes,
    index: BigInt,
    leaf: BigInt,
    root: BigInt,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): void {
    let paymaster = getOrCreatePaymasterContract(contractAddress, contractType, block, transaction);

    log.info("{}: Leaf inserted - index: {}, leaf: {}, root: {}, network: {}", [
        contractType,
        index.toString(),
        leaf.toString(),
        root.toString(),
        paymaster.network,
    ]);

    // Update merkle tree state
    updatePaymasterTreeState(
        paymaster,
        root,
        index.mod(BigInt.fromI32(64)), // This might need adjustment based on how rootIndex works
        index, // treeSize = index + 1
        block
    );

    // Try to update the corresponding DEPOSIT activity with memberIndex and newRoot
    // Note: This assumes Deposited and LeafInserted happen in same transaction
    let network = paymaster.network;
    let depositActivityId = generateEntityId(network, transaction.hash.toHexString(), "0");
    let depositActivity = Activity.load(depositActivityId);

    if (depositActivity != null && depositActivity.type == "DEPOSIT") {
        depositActivity.memberIndex = index;
        depositActivity.newRoot = root;
        depositActivity.save();
    } else {
        log.warning("{}: Could not find corresponding DEPOSIT activity for leaf insertion", [contractType]);
    }
}

export function processOwnershipTransferred(
    contractAddress: Bytes,
    previousOwner: Bytes,
    newOwner: Bytes,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): void {
    let paymaster = getOrCreatePaymasterContract(contractAddress, contractType, block, transaction);

    log.info("{}: Ownership transferred - from: {}, to: {}, network: {}", [
        contractType,
        previousOwner.toHexString(),
        newOwner.toHexString(),
        paymaster.network,
    ]);

    // Update timestamps for tracking
    paymaster.lastBlock = block.number;
    paymaster.lastTimestamp = block.timestamp;
    paymaster.save();
}

export function processPoolDied(contractAddress: Bytes, contractType: string, block: ethereum.Block, transaction: ethereum.Transaction): void {
    let paymaster = getOrCreatePaymasterContract(contractAddress, contractType, block, transaction);

    log.info("{}: Pool died - network: {}", [contractType, paymaster.network]);

    // Mark pool as dead
    paymaster.isDead = true;
    paymaster.lastBlock = block.number;
    paymaster.lastTimestamp = block.timestamp;
    paymaster.save();
}

export function processRevenueWithdrawn(
    contractAddress: Bytes,
    withdrawAddress: Bytes,
    amount: BigInt,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): void {
    let paymaster = getOrCreatePaymasterContract(contractAddress, contractType, block, transaction);

    log.info("{}: Revenue withdrawn - recipient: {}, amount: {}, network: {}", [
        contractType,
        withdrawAddress.toHexString(),
        amount.toString(),
        paymaster.network,
    ]);

    // Create REVENUE_WITHDRAWN activity
    let network = paymaster.network;
    let entityId = generateEntityId(network, transaction.hash.toHexString(), "1"); // Use different logIndex
    let activity = new Activity(entityId);
    let config = getNetworkConfig(network);

    activity.type = "REVENUE_WITHDRAWN";
    activity.paymaster = paymaster.id;
    activity.network = network;
    activity.chainId = config.chainId;
    activity.block = block.number;
    activity.transaction = transaction.hash;
    activity.timestamp = block.timestamp;

    // Set revenue-specific fields
    activity.withdrawAddress = withdrawAddress;
    activity.amount = amount;

    activity.save();

    // Update paymaster financials
    paymaster.currentDeposit = paymaster.currentDeposit.minus(amount);
    paymaster.revenue = paymaster.revenue.plus(amount);
    paymaster.lastBlock = block.number;
    paymaster.lastTimestamp = block.timestamp;
    paymaster.save();
}

export function createUserOpSponsoredActivity(
    paymaster: PaymasterContract,
    sender: Bytes,
    userOpHash: Bytes,
    actualGasCost: BigInt,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): void {
    // Create USER_OP_SPONSORED activity
    let network = paymaster.network;
    let entityId = generateEntityId(network, transaction.hash.toHexString(), "2"); // Use different logIndex
    let activity = new Activity(entityId);
    let config = getNetworkConfig(network);

    activity.type = "USER_OP_SPONSORED";
    activity.paymaster = paymaster.id;
    activity.network = network;
    activity.chainId = config.chainId;
    activity.block = block.number;
    activity.transaction = transaction.hash;
    activity.timestamp = block.timestamp;

    // Set user operation specific fields
    activity.sender = sender;
    activity.userOpHash = userOpHash;
    activity.actualGasCost = actualGasCost;

    activity.save();
}
