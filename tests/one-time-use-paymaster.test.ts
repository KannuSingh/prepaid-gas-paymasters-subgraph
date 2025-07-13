import { assert, describe, test, clearStore, beforeAll, afterAll } from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMemberAdded } from "../src/one-time-use-paymaster";
import { createMemberAddedEvent } from "./one-time-use-paymaster-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
    beforeAll(() => {
        let poolId = BigInt.fromI32(234);
        let memberIndex = BigInt.fromI32(234);
        let identityCommitment = BigInt.fromI32(234);
        let merkleTreeRoot = BigInt.fromI32(234);
        let merkleRootIndex = BigInt.fromI32(234);
        let newMemberAddedEvent = createMemberAddedEvent(poolId, memberIndex, identityCommitment, merkleTreeRoot, merkleRootIndex);
        handleMemberAdded(newMemberAddedEvent);
    });

    afterAll(() => {
        clearStore();
    });

    // For more test scenarios, see:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

    test("MemberAdded created and stored", () => {
        assert.entityCount("MemberAdded", 1);

        // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
        assert.fieldEquals("MemberAdded", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1", "poolId", "234");
        assert.fieldEquals("MemberAdded", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1", "memberIndex", "234");
        assert.fieldEquals("MemberAdded", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1", "identityCommitment", "234");
        assert.fieldEquals("MemberAdded", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1", "merkleTreeRoot", "234");
        assert.fieldEquals("MemberAdded", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1", "merkleRootIndex", "234");

        // More assert options:
        // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
    });
});
