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
    console.log('Counter (counterfactually) located at:', counter.address)
    const counterValue = await counter.call(901, 'number')
    console.log('Initial counter value:', counterValue)
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
})
