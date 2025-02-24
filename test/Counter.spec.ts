import { describe, it } from 'vitest'
import { StandardSuperConfig, SuperWallet, getSuperContract } from '@superchain/js'
import CounterArtifact from '../out/Counter.sol/Counter.json'

describe('Counter', () => {
  it('should deploy the counter contract', async () => {
    // Configure chain with supersim port
    const config = new StandardSuperConfig({
      901: 'http://localhost:9545', // Supersim chain A
      902: 'http://localhost:9546', // Supersim chain B
    })

    // Create wallet with Anvil's default private key
    const wallet = new SuperWallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

    // Get contract instance
    console.log('Deploying counter contract...')
    const counter = await getSuperContract(
      config,
      wallet,
      CounterArtifact.abi,
      (CounterArtifact.bytecode.object) as `0x${string}`
    )
    console.log('Counter (counterfactually) deployed at:', counter.address)
    const counterValue = await counter.call(901, 'number')
    console.log('Counter value:', counterValue)
  })
})
