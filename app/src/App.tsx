import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, http } from 'wagmi'
import { bsc } from 'wagmi/chains'
// @ts-ignore - Direct import for bundler compatibility
import { LevrProvider } from 'levr-sdk/dist/esm/client/index.js'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

import { MoltApp } from './components/MoltApp'

const MOLT_CONTRACT = '0x8ECa9C65055b42f77fab74cF8265c831585AFB07' as const

const config = getDefaultConfig({
  appName: 'MoltBot',
  projectId: 'moltbot-bnb',
  chains: [bsc],
  transports: {
    [bsc.id]: http(),
  },
})

const queryClient = new QueryClient()

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <LevrProvider>
            <MoltApp clankerToken={MOLT_CONTRACT} />
          </LevrProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
