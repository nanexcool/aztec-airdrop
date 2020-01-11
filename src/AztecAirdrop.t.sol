pragma solidity ^0.5.15;

import "ds-test/test.sol";

import "./AztecAirdrop.sol";

contract AztecAirdropTest is DSTest {
    AztecAirdrop airdrop;

    function setUp() public {
        airdrop = new AztecAirdrop();
    }

    function testFail_basic_sanity() public {
        assertTrue(false);
    }

    function test_basic_sanity() public {
        assertTrue(true);
    }
}
