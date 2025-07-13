import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
    MemberAdded,
    MembersAdded,
    OwnershipTransferred,
    PoolCreated,
    RevenueWithdrawn,
    UserOpSponsored,
} from "../generated/OneTimeUsePaymaster/OneTimeUsePaymaster";

export function createMemberAddedEvent(
    poolId: BigInt,
    memberIndex: BigInt,
    identityCommitment: BigInt,
    merkleTreeRoot: BigInt,
    merkleRootIndex: BigInt
): MemberAdded {
    let memberAddedEvent = changetype<MemberAdded>(newMockEvent());

    memberAddedEvent.parameters = new Array();

    memberAddedEvent.parameters.push(new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId)));
    memberAddedEvent.parameters.push(new ethereum.EventParam("memberIndex", ethereum.Value.fromUnsignedBigInt(memberIndex)));
    memberAddedEvent.parameters.push(new ethereum.EventParam("identityCommitment", ethereum.Value.fromUnsignedBigInt(identityCommitment)));
    memberAddedEvent.parameters.push(new ethereum.EventParam("merkleTreeRoot", ethereum.Value.fromUnsignedBigInt(merkleTreeRoot)));
    memberAddedEvent.parameters.push(new ethereum.EventParam("merkleRootIndex", ethereum.Value.fromUnsignedBigInt(merkleRootIndex)));

    return memberAddedEvent;
}

export function createMembersAddedEvent(
    poolId: BigInt,
    startIndex: BigInt,
    identityCommitments: Array<BigInt>,
    merkleTreeRoot: BigInt,
    merkleRootIndex: BigInt
): MembersAdded {
    let membersAddedEvent = changetype<MembersAdded>(newMockEvent());

    membersAddedEvent.parameters = new Array();

    membersAddedEvent.parameters.push(new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId)));
    membersAddedEvent.parameters.push(new ethereum.EventParam("startIndex", ethereum.Value.fromUnsignedBigInt(startIndex)));
    membersAddedEvent.parameters.push(new ethereum.EventParam("identityCommitments", ethereum.Value.fromUnsignedBigIntArray(identityCommitments)));
    membersAddedEvent.parameters.push(new ethereum.EventParam("merkleTreeRoot", ethereum.Value.fromUnsignedBigInt(merkleTreeRoot)));
    membersAddedEvent.parameters.push(new ethereum.EventParam("merkleRootIndex", ethereum.Value.fromUnsignedBigInt(merkleRootIndex)));

    return membersAddedEvent;
}

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
    let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

    ownershipTransferredEvent.parameters = new Array();

    ownershipTransferredEvent.parameters.push(new ethereum.EventParam("previousOwner", ethereum.Value.fromAddress(previousOwner)));
    ownershipTransferredEvent.parameters.push(new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner)));

    return ownershipTransferredEvent;
}

export function createPoolCreatedEvent(poolId: BigInt, joiningFee: BigInt): PoolCreated {
    let poolCreatedEvent = changetype<PoolCreated>(newMockEvent());

    poolCreatedEvent.parameters = new Array();

    poolCreatedEvent.parameters.push(new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId)));
    poolCreatedEvent.parameters.push(new ethereum.EventParam("joiningFee", ethereum.Value.fromUnsignedBigInt(joiningFee)));

    return poolCreatedEvent;
}

export function createRevenueWithdrawnEvent(recipient: Address, amount: BigInt): RevenueWithdrawn {
    let revenueWithdrawnEvent = changetype<RevenueWithdrawn>(newMockEvent());

    revenueWithdrawnEvent.parameters = new Array();

    revenueWithdrawnEvent.parameters.push(new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient)));
    revenueWithdrawnEvent.parameters.push(new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount)));

    return revenueWithdrawnEvent;
}

export function createUserOpSponsoredEvent(transactionHash: Bytes, poolId: BigInt, sender: Address, actualGasCost: BigInt): UserOpSponsored {
    let userOpSponsoredEvent = changetype<UserOpSponsored>(newMockEvent());

    userOpSponsoredEvent.parameters = new Array();

    userOpSponsoredEvent.parameters.push(new ethereum.EventParam("transactionHash", ethereum.Value.fromFixedBytes(transactionHash)));
    userOpSponsoredEvent.parameters.push(new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId)));
    userOpSponsoredEvent.parameters.push(new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)));
    userOpSponsoredEvent.parameters.push(new ethereum.EventParam("actualGasCost", ethereum.Value.fromUnsignedBigInt(actualGasCost)));

    return userOpSponsoredEvent;
}
