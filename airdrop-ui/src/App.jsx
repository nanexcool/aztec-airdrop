import React, { Component } from 'react';
import { ethers } from 'ethers'
import ethP from './web3'
import MerkleTree from './merkleTree.js'

const unixToDateTime = stamp => new Date(stamp * 1000).toLocaleDateString("en-US") + " " + new Date(stamp * 1000).toLocaleTimeString("en-US")
const shortAddress = a => `${a.substr(0, 6)}...${a.substr(-4)}`
const addresses = require('./addresses.json')
const tree = new MerkleTree(addresses)
const dropAddress = "0x393892fDA0AbD5678D67498F3F94985b621a81E7"
const drop = new ethers.Contract(dropAddress, require('./AztecChaiAirdrop.json'), ethP)
const chaiAddress = "0x06AF07097C9Eeb7fD685c692751D5C66dB49c215"
const chai = new ethers.Contract(chaiAddress, require('./Chai.json'), ethP)
const multicallAddress = "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441"
const multi = new ethers.Contract(multicallAddress, require('./Multicall.json'), ethP)
window.drop = drop
window.chai = chai
window.addresses = addresses


class App extends Component {
  state = {
    chainId: null,
    value: "",
    connected: false,
    loaded: false,
    address: null,
    proof: null,
    included: null,
    rootHash: null,
    claimed: null,
    expires: null,
    done: null,
    sig: null,
    tx: null,
    res: null,
  }

  constructor() {
    super()
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
  }

  componentDidMount() {
    this.getNetwork()
  }

  getNetwork = async () => {
    const { chainId } = await ethP.getNetwork()
    this.setState({
      chainId
    })
    if (chainId === 1) {
      this.getAll()
    }
  }

  getAll = async () => {
    const [blockNumber, all] = await multi.aggregate([
      [chai.address, chai.interface.functions.totalSupply.encode([])],
      [chai.address, chai.interface.functions.balanceOf.encode([drop.address])],
      [drop.address, drop.interface.functions.rootHash.encode([])],
      [drop.address, drop.interface.functions.expires.encode([])],
      // [drop.address, drop.interface.functions.done.encode([window.ethereum.selectedAddress])],
    ])

    const [chaiSupply, chaiBalance, rootHash, expires, done] = all
    this.setState({
      chaiSupply: ethers.utils.formatEther(chaiSupply),
      chaiBalance: parseInt(ethers.utils.formatEther(chaiBalance), 0),
      loaded: true,
      rootHash,
      expires: unixToDateTime(expires.toString()),
      // claimed: parseInt(ethers.utils.formatUnits(claimed, 0)),
      // done: parseInt(ethers.utils.formatUnits(done, 0)),
    })
  }

  getDone = async (address) => {
    const done = await drop.done(address)
    this.setState({ done })
  }

  connect = async () => {
    try {
      const result = await window.ethereum.enable()
      this.setState({
        value: result[0],
        connected: true,
      })
      this.searchForAddress(result[0])
    } catch (e) {
      console.log(e)
    }
  }

  doClaim = async (e) => {
    e.preventDefault()
    console.log('claiming!')
    const proof = tree.getHexProof(this.state.value.toLowerCase())
    const p = new ethers.providers.Web3Provider(window.ethereum)
    const d = drop.connect(p.getSigner())
    const tx = await d.claim(proof)
    this.setState({ tx })
    const res = await tx.wait()
    this.setState({ res, tx: null })
    this.getAll()
  }

  doClaimWithSig = async (e) => {
    e.preventDefault()
    console.log('claiming by sig!')
    const p = new ethers.providers.Web3Provider(window.ethereum)
    const s = p.getSigner()
    const d = drop.connect(s)
    window.d = d
    const digest = ethers.utils.solidityKeccak256(['address', 'bytes32'], ['0x72BA1965320ab5352FD6D68235Cc3C5306a6FFA2','0x20162f371d4318f677b2dc93bdda3d26c72856293a2885c2b204f212082f0a62'])
    const sig = await s.signMessage(ethers.utils.arrayify(digest))
    console.log(sig)
    this.setState({ sig })
    const proof = tree.getHexProof(this.state.value.toLowerCase())
    const tx = await d.claimWithSig(proof,'0x72BA1965320ab5352FD6D68235Cc3C5306a6FFA2', sig)
    const res = await tx.wait()
    this.getAll()
  }

  searchForAddress = async (address) => {
    if (addresses.includes(address)) {
      const proof = tree.getHexProof(address)
      this.setState({
        address,
        proof,
        included: true
      })
    } else {
      this.setState({
        included: false
      })
    }
  }

  handleChange = (e) => {
    this.setState({
      value: e.target.value
    });
  }

  handleSubmit = (e) => {
    e.preventDefault()
    const address = this.state.value.toLowerCase()
    this.searchForAddress(address)
  }

  render() {
    return (
      <div className="container">
        <section className="section">
          <h1 className="title is-1">Hi, I'm Mariano and I want to give you 1 Chai</h1>
          <div className="columns">
            <div className="column">
              <p className="is-size-5">
                If you are one of the <strong>176 participants from over 30 countries</strong> that
                took part in the <a href="https://www.aztecprotocol.com/ignition/" target="_blank" rel="noopener noreferrer">
                  AZTEC Ignition Ceremony</a>,
            then I want to thank you by giving you 1 Chai! (
                  <a href="https://chai.money/about" target="_blank" rel="noopener noreferrer">Learn more about Chai</a>
                )
              </p>
              <p>
                Connect to this page with a Web3 Browser using the account you participated with, and <strong>claim your reward</strong>!
              </p>
              {this.state.loaded &&
                <div>
                  <p>Chai claimed: {176 - this.state.chaiBalance} out of 176</p>
                  <p>Offer expires {this.state.expires}</p>
                </div>
              }
            </div>
            <div className="column">
              <div className="box">
                <nav className="level is-mobile">
                  {window.ethereum &&
                    <button className="level-item button is-info" onClick={this.connect}>
                      {(this.state.address && this.state.connected) ? `Connected: ${shortAddress(this.state.address)}` : 'Connect Wallet'}
                    </button>
                  }
                </nav>
                {this.state.chainId === 1 ||
                  <p>Please connect to Mainnet!</p>
                }
                <form onSubmit={this.handleSubmit}>
                  <div className="field has-addons">
                    <div className="control is-expanded">
                      <input className="input" type="text" id="address" name="address" placeholder="Search for your address (0x...)" value={this.state.value} onChange={this.handleChange} />
                    </div>
                    <div className="control">
                      <input className="button is-primary" type="submit" value="Search" />
                    </div>
                  </div>
                </form>
                <br />
                {this.state.included &&
                  <div>
                    <p>Congrats! This address participated in the AZTEC Ignition Ceremony and is entitled to 1 Chai, courtesy of me :)</p>
                    <nav className="level is-mobile">
                      <input className="level-item button is-primary" onClick={this.doClaim} value="Claim 1 Chai!" readOnly />
                    </nav>
                  </div>
                }
                {this.state.included === false &&
                  <div>
                    <p>Sorry, this address is not part of the AZTEC Ignition Ceremony :(</p>
                  </div>
                }
                {
                  this.state.tx &&
                  <div>
                    <p>
                    On the way! <a href={`https://etherscan.io/tx/${this.state.tx.hash}`} target="_blank" rel="noopener noreferrer">Follow on Etherscan</a>
                    </p>
                  </div>
                }
                { this.state.res && this.state.res.status === 1 &&
                  <div>
                    <p>
                      Done! Enjoy your Chai ;)
                    </p>
                  </div>
                }
                <p className="is-hidden">
                  <input className="button is-primary" onClick={this.doClaimWithSig} value="Claim 1 Chai with signature!" readOnly />
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="columns">
            <div className="column">
              <h3 className="is-size-3">How does it work?</h3>
              <p>
                AZTEC provides a <a href="https://github.com/AztecProtocol/ignition-verification#list-of-participants">list of participants</a> that
                succesfully completed the process. I created a Merkle Tree with these addresses. The smart contract only stores a 
                Merkle Root of the tree. You send a proof stating your address is in there, and the smart contract double 
                checks and sends you 1 Chai.
              </p>
              {this.state.loaded ?
                <p style={{ wordBreak: 'break-word' }}>Root Hash: {this.state.rootHash}</p> :
                <p>Loading</p>
              }
              
              <section className="section">
              <p className="subtitle"><strong>Disclaimer!</strong> This project was built over one weekend. While the worst that can happen is that I lose {this.state.chaiBalance || 'some'} Chai, I thought it was worth mentioning. There's no audit or anything of the sort.</p>
              </section>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

export default App;
