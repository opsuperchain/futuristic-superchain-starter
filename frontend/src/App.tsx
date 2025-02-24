import { useEffect, useState } from 'react'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import CounterArtifact from '../../out/Counter.sol/Counter.json'
import { Toaster, toast } from 'react-hot-toast'
import './App.css'

function App() {
  const [counter901Value, setCounter901Value] = useState<bigint>(0n)
  const [counter902Value, setCounter902Value] = useState<bigint>(0n)
  const [error, setError] = useState<string | null>(null)
  const [pendingTx, setPendingTx] = useState<{ [key: string]: boolean }>({})

  // Initialize contract
  const config = new StandardSuperConfig({
    901: 'http://localhost:9545',
    902: 'http://localhost:9546',
  })
  const wallet = new SuperWallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

  // Function to get contract instance
  const getCounter = async () => {
    return getSuperContract(
      config,
      wallet,
      CounterArtifact.abi,
      (CounterArtifact.bytecode.object) as `0x${string}`
    )
  }

  // Function to update counter values
  const updateValues = async () => {
    try {
      const counter = await getCounter()
      const value901 = await counter.call(901, 'number')
      const value902 = await counter.call(902, 'number')
      setCounter901Value(value901)
      setCounter902Value(value902)
    } catch (err) {
      console.error('Failed to update values:', err)
    }
  }

  // Set up polling
  useEffect(() => {
    // Initial update
    updateValues()

    // Poll every 2 seconds
    const interval = setInterval(updateValues, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleIncrement = async (chainId: number) => {
    const txKey = `increment-${chainId}`
    if (pendingTx[txKey]) return // Prevent double-clicks

    const toastId = toast.loading(`Incrementing counter on chain ${chainId}...`)
    setPendingTx(prev => ({ ...prev, [txKey]: true }))

    try {
      const counter = await getCounter()
      await counter.sendTx(chainId, 'increment')
      toast.success(`Successfully incremented counter on chain ${chainId}!`, { id: toastId })
      await updateValues() // Update values immediately after success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to increment'
      toast.error(errorMessage, { id: toastId })
      setError(errorMessage)
    } finally {
      setPendingTx(prev => ({ ...prev, [txKey]: false }))
    }
  }

  const handleCrossChainIncrement = async (fromChain: number, toChain: number) => {
    const txKey = `cross-chain-${fromChain}-${toChain}`
    if (pendingTx[txKey]) return // Prevent double-clicks

    const toastId = toast.loading(`Initiating cross-chain increment from ${fromChain} to ${toChain}...`)
    setPendingTx(prev => ({ ...prev, [txKey]: true }))

    try {
      const counter = await getCounter()
      await counter.sendTx(fromChain, 'incrementOnChain', [toChain])
      toast.success(`Cross-chain increment initiated from ${fromChain} to ${toChain}!`, { id: toastId })
      
      // Start polling more frequently for a short period
      let attempts = 0
      const pollInterval = setInterval(async () => {
        await updateValues()
        attempts++
        if (attempts >= 10) clearInterval(pollInterval)
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cross-chain increment'
      toast.error(errorMessage, { id: toastId })
      setError(errorMessage)
    } finally {
      setPendingTx(prev => ({ ...prev, [txKey]: false }))
    }
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <Toaster position="top-right" />
      <h1>Counter App</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Chain 901</h2>
        <p>Value: {counter901Value.toString()}</p>
        <button 
          onClick={() => handleIncrement(901)}
          disabled={pendingTx['increment-901']}
        >
          {pendingTx['increment-901'] ? 'Incrementing...' : 'Increment'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Chain 902</h2>
        <p>Value: {counter902Value.toString()}</p>
        <button 
          onClick={() => handleIncrement(902)}
          disabled={pendingTx['increment-902']}
        >
          {pendingTx['increment-902'] ? 'Incrementing...' : 'Increment'}
        </button>
      </div>

      <div>
        <h2>Cross-Chain Operations</h2>
        <button 
          onClick={() => handleCrossChainIncrement(901, 902)}
          disabled={pendingTx['cross-chain-901-902']}
        >
          {pendingTx['cross-chain-901-902'] ? 'Processing...' : 'Increment 902 from 901'}
        </button>
        <button 
          onClick={() => handleCrossChainIncrement(902, 901)}
          disabled={pendingTx['cross-chain-902-901']}
          style={{ marginLeft: '10px' }}
        >
          {pendingTx['cross-chain-902-901'] ? 'Processing...' : 'Increment 901 from 902'}
        </button>
      </div>
    </div>
  )
}

export default App
