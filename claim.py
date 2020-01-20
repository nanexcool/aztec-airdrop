import json
from itertools import zip_longest
import click
from eth_account.messages import encode_defunct
from eth_utils import encode_hex, decode_hex
from web3.auto import w3
from web3.middleware import construct_sign_and_send_raw_middleware

AIRDROP_ADDRESS = '0x393892fDA0AbD5678D67498F3F94985b621a81E7'
AIRDROP_ABI = json.load(open('airdrop-ui/src/AztecChaiAirdrop.json'))


class MerkleTree:
    def __init__(self, elements):
        self.elements = sorted(set(w3.keccak(hexstr=el) for el in elements))
        self.layers = get_layers(self.elements)

    @property
    def root(self):
        return self.layers[-1][0]

    def get_proof(self, el):
        el = w3.keccak(hexstr=el)
        idx = self.elements.index(el)
        proof = []
        for layer in self.layers:
            pair_idx = idx + 1 if idx % 2 == 0 else idx - 1
            if pair_idx < len(layer):
                proof.append(encode_hex(layer[pair_idx]))
            idx //= 2
        return proof


def get_layers(elements):
    layers = [elements]
    while len(layers[-1]) > 1:
        layers.append(get_next_layer(layers[-1]))
    return layers


def get_next_layer(elements):
    return [combined_hash(a, b) for a, b in zip_longest(elements[::2], elements[1::2])]


def combined_hash(a, b):
    if a is None:
        return b
    if b is None:
        return a
    return w3.keccak(b''.join(sorted([a, b])))


def main():
    print('aztec-airdrop python cli')
    addresses = json.load(open('addresses.json'))
    tree = MerkleTree(addresses)
    airdrop = w3.eth.contract(AIRDROP_ADDRESS, abi=AIRDROP_ABI)
    assert tree.root == airdrop.caller().rootHash()
    address = click.prompt('enter eth address')
    proof = tree.get_proof(address)
    print('proof:', proof)
    if click.confirm('y - claim using participating address, n - claim with signature using relay address'):
        account = w3.eth.account.from_key(click.prompt('enter participating priv', hide_input=True))
        w3.middleware_onion.add(construct_sign_and_send_raw_middleware(account))
        tx = airdrop.functions.claim(proof).transact({'from': account.address})
        print(f'tx sent {encode_hex(tx)}')
    else:
        account = w3.eth.account.from_key(click.prompt('enter participating priv', hide_input=True))
        message = w3.soliditySha3(['address', 'bytes32'], [account.address, tree.root])
        signature = account.sign_message(encode_defunct(message)).signature
        print(f'signature: {encode_hex(signature)}')
        relay = w3.eth.account.from_key(click.prompt('enter relay priv', hide_input=True))
        w3.middleware_onion.add(construct_sign_and_send_raw_middleware(relay))
        tx = airdrop.functions.claimWithSig(proof, account.address, signature).transact({'from': relay.address})
        print(f'tx sent {encode_hex(tx)}')


if __name__ == "__main__":
    main()
