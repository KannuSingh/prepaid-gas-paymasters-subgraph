import {
  MemberAdded as MemberAddedEvent,
  MembersAdded as MembersAddedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PoolCreated as PoolCreatedEvent,
  RevenueWithdrawn as RevenueWithdrawnEvent,
  UserOpSponsored as UserOpSponsoredEvent
} from "../generated/GasLimitedPaymaster/GasLimitedPaymaster"
import {
  MemberAdded,
  MembersAdded,
  OwnershipTransferred,
  PoolCreated,
  RevenueWithdrawn,
  UserOpSponsored
} from "../generated/schema"

export function handleMemberAdded(event: MemberAddedEvent): void {
  let entity = new MemberAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.memberIndex = event.params.memberIndex
  entity.identityCommitment = event.params.identityCommitment
  entity.merkleTreeRoot = event.params.merkleTreeRoot
  entity.merkleRootIndex = event.params.merkleRootIndex

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMembersAdded(event: MembersAddedEvent): void {
  let entity = new MembersAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.startIndex = event.params.startIndex
  entity.identityCommitments = event.params.identityCommitments
  entity.merkleTreeRoot = event.params.merkleTreeRoot
  entity.merkleRootIndex = event.params.merkleRootIndex

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolCreated(event: PoolCreatedEvent): void {
  let entity = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.joiningFee = event.params.joiningFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRevenueWithdrawn(event: RevenueWithdrawnEvent): void {
  let entity = new RevenueWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUserOpSponsored(event: UserOpSponsoredEvent): void {
  let entity = new UserOpSponsored(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.userOpHash = event.params.userOpHash
  entity.poolId = event.params.poolId
  entity.sender = event.params.sender
  entity.actualGasCost = event.params.actualGasCost
  entity.nullifier = event.params.nullifier

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
