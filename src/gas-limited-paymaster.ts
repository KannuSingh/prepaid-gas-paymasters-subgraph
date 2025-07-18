import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
    PoolCreated,
    MemberAdded,
    MembersAdded,
    UserOpSponsored,
    RevenueWithdrawn,
    OwnershipTransferred,
} from "../generated/GasLimitedPaymaster/GasLimitedPaymaster";
import { Pool, PaymasterContract, NullifierUsage } from "../generated/schema";
import {
    getOrCreatePaymasterContract,
    getOrCreatePool,
    createPoolMember,
    createMerkleRoot,
    createTransaction,
    createRevenueWithdrawal,
    getOrCreateNullifierUsage,
    updateDailyPoolStats,
    updateDailyGlobalStats,
    generateEntityId,
    ZERO_BI,
    ONE_BI,
} from "./utils";

export function handlePoolCreated(event: PoolCreated): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: Pool created - poolId: {}, joiningFee: {}, network: {}", [
        event.params.poolId.toString(),
        event.params.joiningFee.toString(),
        paymaster.network,
    ]);

    let pool = getOrCreatePool(event.params.poolId, paymaster, event.params.joiningFee, event.block, event.transaction);

    // Update daily stats
    updateDailyPoolStats(pool, event.block);
    updateDailyGlobalStats(paymaster.network, event.block, ONE_BI); // new pool created
}

export function handleMemberAdded(event: MemberAdded): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: Member added - poolId: {}, memberIndex: {}, identityCommitment: {}, network: {}", [
        event.params.poolId.toString(),
        event.params.memberIndex.toString(),
        event.params.identityCommitment.toString(),
        paymaster.network,
    ]);

    let pool = Pool.load(generateEntityId(paymaster.network, paymaster.address.toHexString(), event.params.poolId.toString()));
    if (pool == null) {
        log.error("GasLimitedPaymaster: Pool not found for member addition - poolId: {}", [event.params.poolId.toString()]);
        return;
    }

    // Create pool member
    let member = createPoolMember(
        pool,
        paymaster,
        event.params.memberIndex,
        event.params.identityCommitment,
        event.params.merkleTreeRoot,
        event.params.merkleRootIndex.toI32(),
        event.block,
        event.transaction
    );

    // Update pool stats
    pool.memberCount = pool.memberCount.plus(ONE_BI);
    pool.currentMerkleRoot = event.params.merkleTreeRoot;
    pool.currentRootIndex = event.params.merkleRootIndex.toI32();
    pool.rootHistoryCount = pool.rootHistoryCount + 1;
    pool.totalDeposits = pool.totalDeposits.plus(pool.joiningFee);
    pool.lastUpdatedBlock = event.block.number;
    pool.lastUpdatedTimestamp = event.block.timestamp;
    pool.save();

    // Create merkle root entry
    createMerkleRoot(pool, paymaster, event.params.merkleTreeRoot, event.params.merkleRootIndex.toI32(), event.block, event.transaction);

    // Update paymaster total deposits
    paymaster.totalUsersDeposit = paymaster.totalUsersDeposit.plus(pool.joiningFee);
    paymaster.lastUpdatedBlock = event.block.number;
    paymaster.lastUpdatedTimestamp = event.block.timestamp;
    paymaster.save();

    // Update daily stats
    updateDailyPoolStats(pool, event.block, ONE_BI); // new member added
    updateDailyGlobalStats(paymaster.network, event.block, ZERO_BI, ONE_BI); // new member globally
}

export function handleMembersAdded(event: MembersAdded): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: Members added - poolId: {}, startIndex: {}, count: {}, network: {}", [
        event.params.poolId.toString(),
        event.params.startIndex.toString(),
        event.params.identityCommitments.length.toString(),
        paymaster.network,
    ]);

    let pool = Pool.load(generateEntityId(paymaster.network, paymaster.address.toHexString(), event.params.poolId.toString()));
    if (pool == null) {
        log.error("GasLimitedPaymaster: Pool not found for members addition - poolId: {}", [event.params.poolId.toString()]);
        return;
    }

    let membersCount = BigInt.fromI32(event.params.identityCommitments.length);
    let totalJoiningFee = pool.joiningFee.times(membersCount);

    // Create pool members
    for (let i = 0; i < event.params.identityCommitments.length; i++) {
        let memberIndex = event.params.startIndex.plus(BigInt.fromI32(i));
        let identityCommitment = event.params.identityCommitments[i];

        createPoolMember(
            pool,
            paymaster,
            memberIndex,
            identityCommitment,
            event.params.merkleTreeRoot,
            event.params.merkleRootIndex.toI32(),
            event.block,
            event.transaction
        );
    }

    // Update pool stats
    pool.memberCount = pool.memberCount.plus(membersCount);
    pool.currentMerkleRoot = event.params.merkleTreeRoot;
    pool.currentRootIndex = event.params.merkleRootIndex.toI32();
    pool.rootHistoryCount = pool.rootHistoryCount + 1;
    pool.totalDeposits = pool.totalDeposits.plus(totalJoiningFee);
    pool.lastUpdatedBlock = event.block.number;
    pool.lastUpdatedTimestamp = event.block.timestamp;
    pool.save();

    // Create merkle root entry
    createMerkleRoot(pool, paymaster, event.params.merkleTreeRoot, event.params.merkleRootIndex.toI32(), event.block, event.transaction);

    // Update paymaster total deposits
    paymaster.totalUsersDeposit = paymaster.totalUsersDeposit.plus(totalJoiningFee);
    paymaster.lastUpdatedBlock = event.block.number;
    paymaster.lastUpdatedTimestamp = event.block.timestamp;
    paymaster.save();

    // Update daily stats
    updateDailyPoolStats(pool, event.block, membersCount);
    updateDailyGlobalStats(paymaster.network, event.block, ZERO_BI, membersCount);
}

export function handleUserOpSponsored(event: UserOpSponsored): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: UserOp sponsored - userOpHash: {}, poolId: {}, sender: {}, actualGasCost: {}, nullifier: {}, network: {}", [
        event.params.userOpHash.toHexString(),
        event.params.poolId.toString(),
        event.params.sender.toHexString(),
        event.params.actualGasCost.toString(),
        event.params.nullifier.toString(),
        paymaster.network,
    ]);

    let pool = Pool.load(generateEntityId(paymaster.network, paymaster.address.toHexString(), event.params.poolId.toString()));
    if (pool == null) {
        log.error("GasLimitedPaymaster: Pool not found for UserOp - poolId: {}", [event.params.poolId.toString()]);
        return;
    }

    let nullifier = event.params.nullifier;

    // Create user operation
    createTransaction(
        event.params.userOpHash,
        paymaster,
        pool,
        event.params.sender,
        event.params.actualGasCost,
        nullifier,
        event.block,
        event.transaction
    );

    // Update pool deposits (reduce by actual gas cost)
    pool.totalDeposits = pool.totalDeposits.minus(event.params.actualGasCost);
    pool.lastUpdatedBlock = event.block.number;
    pool.lastUpdatedTimestamp = event.block.timestamp;
    pool.save();

    // Update paymaster total deposits
    paymaster.totalUsersDeposit = paymaster.totalUsersDeposit.minus(event.params.actualGasCost);
    paymaster.lastUpdatedBlock = event.block.number;
    paymaster.lastUpdatedTimestamp = event.block.timestamp;
    paymaster.save();

    // Update nullifier usage for gas tracking
    let nullifierUsage = getOrCreateNullifierUsage(nullifier, paymaster, pool, event.block, event.transaction);
    nullifierUsage.gasUsed = nullifierUsage.gasUsed.plus(event.params.actualGasCost);
    nullifierUsage.lastUpdatedBlock = event.block.number;
    nullifierUsage.lastUpdatedTimestamp = event.block.timestamp;
    nullifierUsage.save();

    // Update daily stats
    updateDailyPoolStats(pool, event.block, ZERO_BI, ONE_BI, event.params.actualGasCost);
    updateDailyGlobalStats(paymaster.network, event.block, ZERO_BI, ZERO_BI, ONE_BI, event.params.actualGasCost);
}

export function handleRevenueWithdrawn(event: RevenueWithdrawn): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: Revenue withdrawn - recipient: {}, amount: {}, network: {}", [
        event.params.recipient.toHexString(),
        event.params.amount.toString(),
        paymaster.network,
    ]);

    // Create revenue withdrawal record
    createRevenueWithdrawal(paymaster, event.params.recipient, event.params.amount, event.block, event.transaction);

    // Update paymaster current deposit (reduced by withdrawal)
    paymaster.currentDeposit = paymaster.currentDeposit.minus(event.params.amount);
    paymaster.revenue = paymaster.currentDeposit.minus(paymaster.totalUsersDeposit);
    paymaster.lastUpdatedBlock = event.block.number;
    paymaster.lastUpdatedTimestamp = event.block.timestamp;
    paymaster.save();

    // Update daily stats
    updateDailyGlobalStats(paymaster.network, event.block, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.params.amount);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    let paymaster = getOrCreatePaymasterContract(event.address, "GasLimited", event.block, event.transaction);

    log.info("GasLimitedPaymaster: Ownership transferred - from: {}, to: {}, network: {}", [
        event.params.previousOwner.toHexString(),
        event.params.newOwner.toHexString(),
        paymaster.network,
    ]);

    paymaster.lastUpdatedBlock = event.block.number;
    paymaster.lastUpdatedTimestamp = event.block.timestamp;
    paymaster.save();
}
