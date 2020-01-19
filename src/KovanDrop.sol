// Built by @nanexcool - 2020

pragma solidity ^0.5.15;

contract KovanDrop {

    // all of these constants will one day be `immutable` ;)
    bytes32 public constant rootHash = 0x20162f371d4318f677b2dc93bdda3d26c72856293a2885c2b204f212082f0a62;
    // expires Thursday, January 30, 2020 12:00:00 AM GMT
    uint256 public constant expires = 1580342400;
    address public constant owner = 0x72BA1965320ab5352FD6D68235Cc3C5306a6FFA2;
    uint256 public claimed;
    mapping (address => uint256) public done;

    function claim(bytes32[] calldata proof) external {
        require(now < expires, "experiment is over!");
        require(verify(proof, msg.sender), "nope!");

        done[msg.sender]++;
        claimed++;
    }

    function claimWithSig(bytes32[] calldata proof, address recipient, bytes calldata sig) external {
        require(now < expires, "experiment is over!");
        address who = recover(recipient, sig);
        require(who != address(0), "not address 0");
        require(verify(proof, who), "nope!");

        done[who]++;
        claimed++;
    }

    // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/cryptography/ECDSA.sol
    function recover(address recipient, bytes memory sig) public pure returns (address) {
        if (sig.length != 65) {
            return (address(0));
        }
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }

        if (v != 27 && v != 28) {
            return address(0);
        }
        return ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(recipient, rootHash)))),
            v, r, s
        );
    }

    // https://rstormsf.github.io/slides-merkleairdrop/#/14
    function verify(bytes32[] memory proof, address who) public pure returns (bool) {
        bytes32 computedHash = keccak256(abi.encodePacked(who));

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
            computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
            computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == rootHash;
    }
}
