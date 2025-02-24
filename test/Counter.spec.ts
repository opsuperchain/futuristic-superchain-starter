import { describe, it, beforeAll } from 'vitest'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import { keccak256, toHex, stringToHex } from 'viem'
import CounterArtifact from '../out/Counter.sol/Counter.json'

// Helper to poll until a condition is met or timeout
async function pollUntil(condition: () => Promise<boolean>, timeout: number = 10000, interval: number = 500): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return true
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return false
}

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
    const tx = await counter.sendTx(901, 'incrementOnChain', [902])
    console.log('Cross-chain increment initiated, tx:', tx.transactionHash)

    // Poll until chain 902 value is updated
    const expectedValue = Number(initialValue902) + 1
    const valueUpdated = await pollUntil(async () => {
      const newValue = await counter.call(902, 'number')
      return Number(newValue) === expectedValue
    })
    if (!valueUpdated) {
      throw new Error(`Timed out waiting for chain 902 value to update to ${expectedValue}`)
    }

    // Verify chain 901 remained unchanged
    const newValue901 = await counter.call(901, 'number')
    if (Number(newValue901) !== Number(initialValue901)) {
      throw new Error(`Counter on chain 901 should not have changed. Expected ${initialValue901}, got ${newValue901}`)
    }

    // Get events from chain 901 to verify the callback was executed
    let foundEvent = false
    let eventValue: bigint | undefined
    const eventHash = keccak256(stringToHex('CrossChainIncrementSuccess(uint256)'))
    const unsubscribe = counter.watchEvents(901, BigInt(tx.blockNumber), (log, block) => {
      if (log.topics[0] === eventHash) {
        foundEvent = true
        eventValue = BigInt(log.data)
        console.log('Found CrossChainIncrementSuccess event with value:', eventValue, 'at block:', block.number)
      }
    })

    // Poll until we find the event
    const eventFound = await pollUntil(async () => foundEvent)
    unsubscribe()
    
    if (!eventFound) {
      throw new Error('Timed out waiting for CrossChainIncrementSuccess event')
    }

    if (eventValue === undefined || Number(eventValue) !== expectedValue) {
      throw new Error(`Event has wrong value. Expected ${expectedValue}, got ${eventValue}`)
    }
  })
})
