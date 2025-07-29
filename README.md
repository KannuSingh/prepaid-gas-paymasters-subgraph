# Prepaid Gas Paymasters Subgraph

The Graph subgraph for indexing paymaster events and activity from the Prepaid Gas paymaster system - a privacy-preserving gas payment infrastructure using Account Abstraction (ERC-4337) and zero-knowledge proofs via Semaphore protocol.

## Overview

This subgraph provides simplified, activity-centric indexing for three types of paymaster contracts deployed on Base Sepolia:

- **OneTimeUsePaymaster** - Single-use gas credits with nullifier tracking
- **GasLimitedPaymaster** - Multi-use gas credits with consumption limits  
- **CacheEnabledGasLimitedPaymaster** - Optimized multi-use with caching for frequent users

## Architecture

### Entity Structure

The subgraph uses a simplified schema focused on activity tracking:

```
PaymasterContract (root) → Activity → UserOperation
```

### Key Entities

- **PaymasterContract** - Represents each deployed paymaster contract with financial tracking, pool state, and Merkle tree information
- **Activity** - All contract events unified into a single activity feed (deposits, sponsored operations, revenue withdrawals)
- **UserOperation** - Sponsored user operations with gas cost and nullifier tracking

### Tracked Events

**Common Events (all paymasters):**
- `Deposited` - Users joining pools by depositing joining amounts
- `LeafInserted` - Merkle tree updates when members join
- `OwnershipTransferred` - Contract ownership changes
- `PoolDied` - Pool termination events
- `RevenueWithdrawn` - Revenue withdrawals by contract owners

**Contract-Specific Events:**
- `UserOpSponsoredWithNullifier` - OneTimeUse and GasLimited sponsored operations
- `UserOpSponsored` - CacheEnabled sponsored operations (without nullifier)
- `NullifierConsumed` - CacheEnabled nullifier consumption tracking

## Development Commands

### Local Development
```bash
# Generate TypeScript types from GraphQL schema
graph codegen

# Build the subgraph
graph build

# Create and deploy locally
graph create-local
graph deploy-local
```

### Production Deployment
```bash
# Deploy to The Graph Studio
graph deploy --node https://api.studio.thegraph.com/deploy/ prepaid-gas-paymasters
```

## Network Configuration

**Target Network**: Base Sepolia (Chain ID: 84532)

**Contract Addresses:**
- OneTimeUsePaymaster: `0x4DACA5b0a5d10853F84bB400C5232E4605bc14A0`
- GasLimitedPaymaster: `0xDEc68496A556CeE996894ac2FDc9E43F39938e62`
- CacheEnabledGasLimitedPaymaster: `0xfFE794611e59A987D8f13585248414d40a02Bb58`

## Schema Design

### Activity-Centric Approach

The subgraph consolidates all contract events into a unified `Activity` entity with type discrimination:

- `DEPOSIT` - User joining pool (includes depositor, commitment, member index)
- `USER_OP_SPONSORED` - Sponsored user operation (includes sender, gas cost, nullifier)
- `REVENUE_WITHDRAWN` - Revenue withdrawal (includes withdraw address, amount)

### Financial Tracking

Each `PaymasterContract` entity maintains:
- `totalDeposit` - Cumulative user deposits
- `currentDeposit` - Current EntryPoint balance
- `revenue` - Calculated revenue (difference between total and current deposits)


## Query Patterns

### Pool Activity
```graphql
query GetPoolActivity($paymasterAddress: String!) {
  paymasterContract(id: $paymasterAddress) {
    address
    contractType
    treeSize
    revenue
    activities(orderBy: timestamp, orderDirection: desc) {
      type
      timestamp
      depositor
      sender
      actualGasCost
    }
  }
}
```

### Recent Sponsored Operations
```graphql
query GetSponsoredOperations {
  activities(
    where: { type: USER_OP_SPONSORED }
    orderBy: timestamp
    orderDirection: desc
    first: 100
  ) {
    paymaster { address }
    sender
    actualGasCost
    timestamp
  }
}
```
