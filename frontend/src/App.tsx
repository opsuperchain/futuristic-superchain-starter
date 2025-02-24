import { useEffect, useState } from 'react'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import CounterArtifact from '../../out/Counter.sol/Counter.json'
import './App.css'

function App() {
  const [counter901Value, setCounter901Value] = useState<bigint>(0n)
  const [counter902Value, setCounter902Value] = useState<bigint>(0n)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize contract
  const config = new StandardSuperConfig({
    901: 'http://localhost:9545',
    902: 'http://localhost:9546',
  })
  const wallet = new SuperWallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

  useEffect(() => {
    const initContract = async () => {
      try {
        const counter = await getSuperContract(
          config,
          wallet,
          CounterArtifact.abi,
          (CounterArtifact.bytecode.object) as `0x${string}`
        )

        // Get initial values
        const value901 = await counter.call(901, 'number')
        const value902 = await counter.call(902, 'number')
        
        setCounter901Value(value901)
        setCounter902Value(value902)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize contract')
        setLoading(false)
      }
    }

    initContract()
  }, [])

  const handleIncrement = async (chainId: number) => {
    try {
      setLoading(true)
      const counter = await getSuperContract(
        config,
        wallet,
        CounterArtifact.abi,
        (CounterArtifact.bytecode.object) as `0x${string}`
      )

      await counter.sendTx(chainId, 'increment')
      
      // Update values after increment
      const value901 = await counter.call(901, 'number')
      const value902 = await counter.call(902, 'number')
      
      setCounter901Value(value901)
      setCounter902Value(value902)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to increment')
    } finally {
      setLoading(false)
    }
  }

  const handleCrossChainIncrement = async (fromChain: number, toChain: number) => {
    try {
      setLoading(true)
      const counter = await getSuperContract(
        config,
        wallet,
        CounterArtifact.abi,
        (CounterArtifact.bytecode.object) as `0x${string}`
      )

      await counter.sendTx(fromChain, 'incrementOnChain', [toChain])
      
      // Poll for the value to update on the target chain
      let attempts = 0
      const maxAttempts = 20
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const value901 = await counter.call(901, 'number')
        const value902 = await counter.call(902, 'number')
        setCounter901Value(value901)
        setCounter902Value(value902)
        attempts++
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cross-chain increment')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Counter App</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Chain 901</h2>
        <p>Value: {counter901Value.toString()}</p>
        <button 
          onClick={() => handleIncrement(901)}
          disabled={loading}
        >
          Increment
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Chain 902</h2>
        <p>Value: {counter902Value.toString()}</p>
        <button 
          onClick={() => handleIncrement(902)}
          disabled={loading}
        >
          Increment
        </button>
      </div>

      <div>
        <h2>Cross-Chain Operations</h2>
        <button 
          onClick={() => handleCrossChainIncrement(901, 902)}
          disabled={loading}
        >
          Increment 902 from 901
        </button>
        <button 
          onClick={() => handleCrossChainIncrement(902, 901)}
          disabled={loading}
          style={{ marginLeft: '10px' }}
        >
          Increment 901 from 902
        </button>
      </div>
    </div>
  )
}

export default App
