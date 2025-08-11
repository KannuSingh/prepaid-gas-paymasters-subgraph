import { BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { PaymasterContract, Activity, UserOperation } from "../generated/schema";

// Import generated configuration
import { 
    ZERO_BI as GENERATED_ZERO_BI,
    ONE_BI as GENERATED_ONE_BI, 
    ZERO_ADDRESS as GENERATED_ZERO_ADDRESS,
    getContractConfig as GENERATED_getContractConfig,
    getContractType as GENERATED_getContractType,
    CONTRACT_CONFIGS as GENERATED_CONTRACT_CONFIGS,
    CONTRACT_ADDRESSES as GENERATED_CONTRACT_ADDRESSES
} from "./generated-config";

// Export utility constants  
export const ZERO_BI = GENERATED_ZERO_BI;
export const ONE_BI = GENERATED_ONE_BI;
export const ZERO_ADDRESS = GENERATED_ZERO_ADDRESS;

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

// Initialize network configurations (will be replaced by generated config)
export const NETWORK_CONFIGS = new Map<string, NetworkConfig>();
NETWORK_CONFIGS.set("base-sepolia", new NetworkConfig("Base Sepolia", BigInt.fromI32(84532)));
NETWORK_CONFIGS.set("base", new NetworkConfig("Base", BigInt.fromI32(8453)));
NETWORK_CONFIGS.set("ethereum", new NetworkConfig("Ethereum Mainnet", BigInt.fromI32(1)));
NETWORK_CONFIGS.set("sepolia", new NetworkConfig("Sepolia", BigInt.fromI32(11155111)));

// Contract configurations (will be replaced by generated config)
export const CONTRACT_CONFIGS = new Map<string, ContractConfig>();

// Base Sepolia contracts - these will be replaced by generated config
CONTRACT_CONFIGS.set(
    "0xDEc68496A556CeE996894ac2FDc9E43F39938e62".toLowerCase(),
    new ContractConfig(
        "GasLimitedPaymaster",
        "base-sepolia",
        BigInt.fromString("100000000000000"), // 0.0001 ETH
        BigInt.fromString("4049863411493281632527463033697091205373305699424276163943787436912533928625"),
        Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
    )
);

CONTRACT_CONFIGS.set(
    "0x4DACA5b0a5d10853F84bB400C5232E4605bc14A0".toLowerCase(),
    new ContractConfig(
        "OneTimeUsePaymaster",
        "base-sepolia",
        BigInt.fromString("100000000000000"), // 0.0001 ETH
        BigInt.fromString("4279505695869108679679209633705194792004361714689857674131402936989478177358"),
        Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
    )
);

CONTRACT_CONFIGS.set(
    "0xfFE794611e59A987D8f13585248414d40a02Bb58".toLowerCase(),
    new ContractConfig(
        "CacheEnabledGasLimitedPaymaster",
        "base-sepolia",
        BigInt.fromString("100000000000000"), // 0.0001 ETH
        BigInt.fromString("21337712239027152071670174334401160018347160721202232719434727113172230245419"),
        Bytes.fromHexString("0x6C42599435B82121794D835263C846384869502d")
    )
);

// Helper functions
export function getNetworkConfig(network: string): NetworkConfig {
    let config = NETWORK_CONFIGS.get(network);
    if (config == null) {
        config = new NetworkConfig(network, ZERO_BI);
    }
    return config;
}

export function getContractConfig(contractAddress: Bytes): ContractConfig {
    let config = CONTRACT_CONFIGS.get(contractAddress.toHexString().toLowerCase());
    if (config == null) {
        log.warning("Unknown contract address: {}, using default config", [contractAddress.toHexString()]);
        return new ContractConfig("Unknown", "base-sepolia", ZERO_BI, ZERO_BI, Bytes.fromHexString(ZERO_ADDRESS));
    }
    return config;
}

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

export function getOrCreatePaymasterContract(
    address: Bytes,
    contractType: string,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): PaymasterContract {
    // Get contract configuration
    let contractConfig = getContractConfig(address);
    let networkConfig = getNetworkConfig(contractConfig.network);
    let entityId = generateEntityId(contractConfig.network, address.toHexString());

    let paymaster = PaymasterContract.load(entityId);

    if (paymaster == null) {
        log.info("Creating new PaymasterContract entity: {}", [entityId]);

        paymaster = new PaymasterContract(entityId);
        paymaster.address = address;
        paymaster.network = contractConfig.network;
        paymaster.chainId = networkConfig.chainId;
        paymaster.contractType = contractConfig.type;
        paymaster.joiningAmount = contractConfig.joiningAmount;
        paymaster.scope = contractConfig.scope;
        paymaster.verifier = contractConfig.verifier;

        // Initialize counters (using correct schema field names)
        paymaster.totalDeposit = ZERO_BI;

        paymaster.save();
    }

    return paymaster;
}

export function getOrCreateActivity(
    paymasterAddress: Bytes,
    activityType: string,
    transactionHash: Bytes,
    logIndex: BigInt,
    block: ethereum.Block
): Activity {
    let contractConfig = getContractConfig(paymasterAddress);
    let entityId = generateEntityId(
        contractConfig.network,
        "activity",
        transactionHash.toHexString(),
        logIndex.toString()
    );

    let activity = Activity.load(entityId);

    if (activity == null) {
        activity = new Activity(entityId);
        activity.paymaster = generateEntityId(contractConfig.network, paymasterAddress.toHexString());
        activity.network = contractConfig.network;
        activity.type = activityType;
        activity.transaction = transactionHash;

        // Initialize optional fields
        activity.amount = ZERO_BI;
        activity.save();
    }

    return activity;
}

export function getOrCreateUserOperation(
    paymasterAddress: Bytes,
    userOpHash: Bytes,
    sender: Bytes,
    block: ethereum.Block
): UserOperation {
    let contractConfig = getContractConfig(paymasterAddress);
    let entityId = generateEntityId(contractConfig.network, "userop", userOpHash.toHexString());

    let userOp = UserOperation.load(entityId);

    if (userOp == null) {
        userOp = new UserOperation(entityId);
        userOp.paymaster = generateEntityId(contractConfig.network, paymasterAddress.toHexString());
        userOp.network = contractConfig.network;
        userOp.hash = userOpHash;
        userOp.sender = sender;

        // Initialize optional fields
        userOp.actualGasCost = ZERO_BI;
        userOp.save();
    }

    return userOp;
}

export function createUserOperation(
    userOpHash: Bytes,
    paymaster: PaymasterContract,
    sender: Bytes,
    actualGasCost: BigInt,
    nullifier: BigInt,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): UserOperation {
    let network = paymaster.network;
    let entityId = generateEntityId(network, userOpHash.toHexString());
    let userOp = new UserOperation(entityId);
    let config = getNetworkConfig(network);

    userOp.hash = userOpHash;
    userOp.paymaster = paymaster.id;
    userOp.network = network;
    userOp.chainId = config.chainId;
    userOp.sender = sender;
    userOp.actualGasCost = actualGasCost;
    userOp.nullifier = nullifier;
    userOp.block = block.number;
    userOp.transaction = transaction.hash;
    userOp.timestamp = block.timestamp;

    userOp.save();
    return userOp;
}

export function updatePaymasterTreeState(
    paymaster: PaymasterContract,
    newRoot: BigInt,
    newRootIndex: BigInt,
    newTreeSize: BigInt,
    block: ethereum.Block
): void {
    paymaster.root = newRoot;
    paymaster.rootIndex = newRootIndex;
    paymaster.treeSize = newTreeSize;
    paymaster.lastBlock = block.number;
    paymaster.lastTimestamp = block.timestamp;
    paymaster.save();
}
