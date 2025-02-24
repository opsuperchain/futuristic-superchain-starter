interface Config {
  defaultPrivateKey: `0x${string}`;
  chainIds: number[];
  rpcUrls: {
    [chainId: number]: string;
  };
}

const configs: { [env: string]: Config } = {
  supersim: {
    defaultPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainIds: [901, 902],
    rpcUrls: {
      901: 'http://localhost:9545',
      902: 'http://localhost:9546',
    },
  },
  devnet: {
    defaultPrivateKey: (import.meta.env.VITE_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as `0x${string}`,
    chainIds: [420120000, 420120001],
    rpcUrls: {
      420120000: 'https://interop-alpha-0.optimism.io',
      420120001: 'https://interop-alpha-1.optimism.io',
    },
  },
}

// Get environment from VITE_ENV environment variable, default to supersim
const env = import.meta.env.VITE_ENV || 'supersim'
export const config = configs[env] 