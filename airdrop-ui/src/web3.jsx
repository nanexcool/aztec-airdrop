const ethers = require('ethers')
ethers.errors.setLogLevel("error")
window.ethers = ethers
const eth = window.ethereum ? 
  new ethers.providers.Web3Provider(window.ethereum) : ethers.getDefaultProvider('homestead')
window.eth = eth
export default eth
