
import { useState } from 'react'
import './App.css'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js'

//const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93f642f64180aa3'

function App() {
  const [account, setAccount] = useState('')
  const [contract, setContract] = useState(null)
  const [status, setStatus] = useState('Connect MetaMask to get started')
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [donationAmounts, setDonationAmounts] = useState({})
  const [donatingCampaign, setDonatingCampaign] = useState(null)

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask.')
        return
      }

      setLoading(true)

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const donationContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      )

      setAccount(accounts[0])
      setContract(donationContract)
      setStatus('Wallet connected. Loading campaigns...')

      await loadCampaigns(donationContract)
    } catch (error) {
      console.error(error)
      setStatus(error.shortMessage || error.message || 'Wallet connection failed.')
    } finally {
      setLoading(false)
    }
  }
  async function loadCampaigns(activeContract = contract) {
    if (!activeContract) {
      setStatus('Connect MetaMask first.')
      return
    }

    try {
      setCampaignLoading(true)

      const data = await activeContract.getAllCampaigns()

      setCampaigns(
        data.map((campaign) => ({
          id: campaign.id.toString(),
          title: campaign.title,
          description: campaign.description,
          creator: campaign.creator,
          targetAmount: ethers.formatEther(campaign.targetAmount),
          totalRaised: ethers.formatEther(campaign.totalRaised),
          active: campaign.active,
        }))
      )

      setStatus('Campaigns loaded successfully.')
    } catch (error) {
      console.error(error)
      setStatus(error.shortMessage || error.message || 'Could not load campaigns.')
    } finally {
      setCampaignLoading(false)
    }
  }
  async function createCampaign(e) {
    e.preventDefault()

    if (!contract) {
      setStatus('Connect MetaMask first.')
      return
    }

    if (!title.trim() || !description.trim() || !targetAmount) {
      setStatus('Please fill in all campaign fields.')
      return
    }

    if (Number(targetAmount) <= 0 || !Number.isFinite(Number(targetAmount))) {
      setStatus('Target amount must be greater than zero.')
      return
    }

    try {
      setCreatingCampaign(true)
      setStatus('Please confirm the transaction in MetaMask...')

      const tx = await contract.createCampaign(
        title.trim(),
        description.trim(),
        ethers.parseEther(targetAmount)
      )

      setStatus('Transaction submitted. Waiting for confirmation...')
      await tx.wait()

      setTitle('')
      setDescription('')
      setTargetAmount('')

      await loadCampaigns(contract)
      setStatus('Campaign created successfully!')
    } catch (error) {
      console.error(error)
      setStatus(
        error.shortMessage ||
        error.reason ||
        error.message ||
        'Campaign creation failed.'
      )
    } finally {
      setCreatingCampaign(false)
    }
  }

  async function donateToCampaign(campaignId) {
    if (!contract) {
      setStatus('Connect MetaMask first.')
      return
    }

    const amount = donationAmounts[campaignId]

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setStatus('Enter a donation amount greater than zero.')
      return
    }

    try {
      setDonatingCampaign(campaignId)
      setStatus('Please confirm the donation in MetaMask...')

      const tx = await contract.donateToCampaign(campaignId, {
        value: ethers.parseEther(amount),
      })

      setStatus('Donation submitted. Waiting for confirmation...')
      await tx.wait()

      setDonationAmounts((previous) => ({
        ...previous,
        [campaignId]: '',
      }))

      await loadCampaigns(contract)
      setStatus('Donation successful!')
    } catch (error) {
      console.error(error)
      setStatus(
        error.shortMessage ||
        error.reason ||
        error.message ||
        'Donation failed.'
      )
    } finally {
      setDonatingCampaign(null)
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">CharityChain</div>
        <button onClick={connectWallet} disabled={loading}>
          {loading
            ? 'Connecting...'
            : account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : 'Connect Wallet'}
        </button>
      </header>

      <section className="hero">
        <p className="eyebrow">BLOCKCHAIN-POWERED GIVING</p><br />
        <h1>Small donations.<br /><br />Meaningful change.</h1>
        <p className="subtitle">
          Support charitable causes through transparent blockchain
          transactions.
        </p>
        <button className="primary-button" onClick={connectWallet}>
          {account ? 'Wallet Connected' : 'Get Started'}
        </button>
        <p className="status">{status}</p>
      </section>

      <section className="features">
        <article className="feature-card">
          <span className="feature-icon">♡</span>
          <h2>Support Causes</h2>
          <p>Help charitable initiatives receive donations.</p>
        </article>

        <article className="feature-card">
          <span className="feature-icon">◇</span>
          <h2>On-chain Records</h2>
          <p>Record supported transactions on the blockchain.</p>
        </article>

        <article className="feature-card">
          <span className="feature-icon">↗</span>
          <h2>Direct Transactions</h2>
          <p>Connect your wallet to interact with the smart contract.</p>
        </article>
      </section>
      <section className="campaigns">
        <form className="campaign-form" onSubmit={createCampaign}>
          <h2>Create a Charity Campaign</h2>

          <input
            type="text"
            placeholder="Campaign title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Campaign description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Target amount in ETH"
            min="0"
            step="any"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />

          <button type="submit" disabled={!contract || creatingCampaign}>
            {creatingCampaign ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
        <div className="campaigns-heading">
          <h2>Charity Campaigns</h2>
          <button
            type="button"
            onClick={() => loadCampaigns()}
            disabled={!contract || campaignLoading}
          >
            {campaignLoading ? 'Loading...' : 'Refresh Campaigns'}
          </button>
        </div>

        {!account ? (
          <p>Connect MetaMask to view campaigns.</p>
        ) : campaigns.length === 0 ? (
          <p>No campaigns found. Create the first campaign to get started.</p>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <article className="campaign-card" key={campaign.id}>
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>

                <p>
                  <strong>Target:</strong> {campaign.targetAmount} ETH
                </p>
                <p>
                  <strong>Total raised:</strong> {campaign.totalRaised} ETH
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  {campaign.active ? 'Active' : 'Inactive'}
                </p>
                <p className="creator-address">
                  <strong>Creator:</strong> {campaign.creator}
                </p>

                {campaign.active && (
                  <div className="donation-controls">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Donation amount in ETH"
                      value={donationAmounts[campaign.id] || ''}
                      onChange={(e) =>
                        setDonationAmounts((previous) => ({
                          ...previous,
                          [campaign.id]: e.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      onClick={() => donateToCampaign(campaign.id)}
                      disabled={donatingCampaign === campaign.id}
                    >
                      {donatingCampaign === campaign.id ? 'Processing...' : 'Donate'}
                    </button>
                  </div>
                )}

              </article>
            ))}
          </div>
        )}
      </section>
      <footer>
        <p>CharityChain · Built on Ethereum-compatible blockchain</p>
        <p className="footer-note">
          Use the local Hardhat network for development and testing.
        </p>
      </footer>
    </main>
  )
}

export default App
