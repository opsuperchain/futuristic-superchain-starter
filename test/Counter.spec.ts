import { describe, it, beforeAll } from 'vitest'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import CounterArtifact from '../out/Counter.sol/Counter.json'

describe('Counter', () => {
  // Configure chain with supersim port
  const config = new StandardSuperConfig({
    901: 'http://localhost:9545', // Supersim chain A
    902: 'http://localhost:9546', // Supersim chain B
  })

  // Create wallet with Anvil's default private key
  const wallet = new SuperWallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

  // Store contract instance
  let counter: Awaited<ReturnType<typeof getSuperContract>>

  beforeAll(async () => {
    counter = await getSuperContract(
      config,
      wallet,
      CounterArtifact.abi,
      (CounterArtifact.bytecode.object) as `0x${string}`
    )
    console.log('Counter instance created at:', counter.address)

    // Explicitly deploy on both chains
    console.log('Deploying on chain 901...')
    await counter.deployManual(901)
    console.log('Deploying on chain 902...')
    await counter.deployManual(902)

    console.log('Counter deployed on both chains')
    const value901 = await counter.call(901, 'number')
    const value902 = await counter.call(902, 'number')
    console.log('Initial values - Chain 901:', value901, 'Chain 902:', value902)
  })

  it('should have initial value of 0', async () => {
    const value = await counter.call(901, 'number')
    if (Number(value) !== 0) {
      throw new Error(`Counter should start at 0, got ${value}`)
    }
  })

  it('should increment the counter', async () => {
    // Get initial value
    const initialValue = await counter.call(901, 'number')
    console.log('Initial counter value:', initialValue)

    // Increment counter
    console.log('Incrementing counter...')
    await counter.sendTx(901, 'increment')

    // Get new value
    const newValue = await counter.call(901, 'number')
    console.log('New counter value:', newValue)

    // Verify increment
    if (Number(newValue) !== Number(initialValue) + 1) {
      throw new Error(`Counter did not increment correctly. Expected ${Number(initialValue) + 1}, got ${newValue}`)
    }
  })

  it('should increment counter cross-chain from 901 to 902', async () => {
    // Get initial values on both chains
    const initialValue901 = await counter.call(901, 'number')
    const initialValue902 = await counter.call(902, 'number')
    console.log('Initial values - Chain 901:', initialValue901, 'Chain 902:', initialValue902)

    // Initiate cross-chain increment from 901 to 902
    console.log('Initiating cross-chain increment from 901 to 902...')
    await counter.sendTx(901, 'incrementOnChain', [902])

    // Wait a bit for cross-chain message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get new values
    const newValue901 = await counter.call(901, 'number')
    const newValue902 = await counter.call(902, 'number')
    console.log('New values - Chain 901:', newValue901, 'Chain 902:', newValue902)

    // Verify chain 902 was incremented
    if (Number(newValue902) !== Number(initialValue902) + 1) {
      throw new Error(`Counter on chain 902 did not increment correctly. Expected ${Number(initialValue902) + 1}, got ${newValue902}`)
    }

    // Verify chain 901 remained unchanged
    if (Number(newValue901) !== Number(initialValue901)) {
      throw new Error(`Counter on chain 901 should not have changed. Expected ${initialValue901}, got ${newValue901}`)
    }
  })
})
