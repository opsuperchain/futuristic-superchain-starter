import { useEffect, useState } from 'react'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import CounterArtifact from '../../out/Counter.sol/Counter.json'
import { Toaster, toast } from 'react-hot-toast'
import { config } from './config'
import './App.css'

function App() {
  const [counterValues, setCounterValues] = useState<{ [chainId: number]: bigint }>({})
  const [error, setError] = useState<string | null>(null)
  const [pendingTx, setPendingTx] = useState<{ [key: string]: boolean }>({})

  // Initialize contract
  const superConfig = new StandardSuperConfig(config.rpcUrls)
  const wallet = new SuperWallet(config.defaultPrivateKey)

  // Function to get contract instance
  const getCounter = async () => {
    return getSuperContract(
      superConfig,
      wallet,
      CounterArtifact.abi,
      (CounterArtifact.bytecode.object) as `0x${string}`
    )
  }

  // Function to update counter values
  const updateValues = async () => {
    try {
      const counter = await getCounter()
      const values = await Promise.all(
        config.chainIds.map(async (chainId) => {
          const value = await counter.call(chainId, 'number')
          return [chainId, value] as const
        })
      )
      setCounterValues(Object.fromEntries(values))
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
      
      {config.chainIds.map((chainId) => (
        <div key={chainId} style={{ marginBottom: '20px' }}>
          <h2>Chain {chainId}</h2>
          <p>Value: {(counterValues[chainId] || 0n).toString()}</p>
          <button 
            onClick={() => handleIncrement(chainId)}
            disabled={pendingTx[`increment-${chainId}`]}
          >
            {pendingTx[`increment-${chainId}`] ? 'Incrementing...' : 'Increment'}
          </button>
        </div>
      ))}

      <div>
        <h2>Cross-Chain Operations</h2>
        {config.chainIds.map((fromChain, i) => 
          config.chainIds.slice(i + 1).map((toChain) => (
            <div key={`${fromChain}-${toChain}`} style={{ marginBottom: '10px' }}>
              <button 
                onClick={() => handleCrossChainIncrement(fromChain, toChain)}
                disabled={pendingTx[`cross-chain-${fromChain}-${toChain}`]}
              >
                {pendingTx[`cross-chain-${fromChain}-${toChain}`] ? 'Processing...' : `Increment ${toChain} from ${fromChain}`}
              </button>
              <button 
                onClick={() => handleCrossChainIncrement(toChain, fromChain)}
                disabled={pendingTx[`cross-chain-${toChain}-${fromChain}`]}
                style={{ marginLeft: '10px' }}
              >
                {pendingTx[`cross-chain-${toChain}-${fromChain}`] ? 'Processing...' : `Increment ${fromChain} from ${toChain}`}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App
