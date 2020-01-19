const MerkleTree = require('./merkleTree.js').MerkleTree
const ethers = require('ethers')

let accounts = require('./addresses.json')

let tree = new MerkleTree(accounts)
let iface = new ethers.utils.Interface(require('./TestAirdrop.json'))

accounts.map((x, i) => {
    console.log(`${i} - ${accounts[i]}`)
    let proof = tree.getHexProof(x)
    console.log(iface.functions.claim.encode([proof]))
})

console.log(`Root: ${tree.getHexRoot()}`)

// var index = 30
// console.log(`${index} - ${accounts[index]}`)
// let proof = tree.getHexProof(accounts[index])
// console.log(iface.functions.verify.encode([proof,accounts[index]]))
// var i = 8
// console.log(`${i} - ${accounts[i]}`)
// let proof = tree.getHexProof(accounts[i])
// console.log(iface.functions.claim.encode([proof]))