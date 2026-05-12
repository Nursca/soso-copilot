'use client'

import React, { ReactNode } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arbitrum, mainnet, type AppKitNetwork } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cookieToInitialState, WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error("Missing NEXT_PUBLIC_REOWN_PROJECT_ID. Get one at https://cloud.reown.com/");
}

// 2. Create a metadata object
const metadata = {
  name: 'SoSo Copilot',
  description: 'AI-powered personal finance copilot for On-Chain Retail Traders',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum]

// 3. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// 4. Create AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
  }
})

export default function AppKitProvider({
  children,
  cookies
}: {
  children: ReactNode
  cookies?: string | null
}) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as any, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as any} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
