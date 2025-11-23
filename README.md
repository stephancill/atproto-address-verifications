# Atproto Address Verifications

A Single Page Application (SPA) that demonstrates how to link a crypto address to an AT Protocol (Bluesky/Atproto) identity.

## Features

- **Sign in with Atproto**: Authenticate using OAuth (via `@atproto/oauth-client-browser`).
- **Connect Crypto Wallet**: Use [Wagmi](https://wagmi.sh) and [Viem](https://viem.sh) to connect Ethereum-compatible wallets (supports any chain).
- **EIP-712 Verification**: Sign a structured typed data claim (`VerificationClaim`) with your wallet to prove ownership.
- **ERC-7930 Interoperable Addresses**: Uses the [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930) binary format for storing chain-agnostic addresses.
- **Atproto Records**: Stores the verification proof (signature, address, block hash) as a record in your Atproto repository under the `org.chainagnostic.verification` collection.
- **Verification List**: View, verify, and manage your linked addresses directly from the app.

## Tech Stack

- **Framework**: React + Vite
- **Auth**: `@atproto/oauth-client-browser`
- **Blockchain**: `wagmi`, `viem`
- **State Management**: React Query (`@tanstack/react-query`)

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure Environment:**

   Create a `.env.local` file in the root directory:

   ```env
   VITE_APP_BASE_URL=https://<your-ngrok-id>.ngrok-free.app
   VITE_APP_NAME="Atproto Address Verifications"
   ```

   _Note: The base URL has to be tunneled when running locally (e.g. using ngrok) to allow the OAuth server to fetch the `client-metadata.json` file._

3. **Run Development Server:**

   ```bash
   pnpm dev
   ```

   The app should be running at [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Usage

1. Click "Sign In with Atproto" and enter your handle (e.g., `myself.bsky.social`).
2. Connect your wallet.
3. Click "Verify Address". You will be prompted to sign an EIP-712 message.
4. Once signed, the verification record is published to your Atproto PDS.
5. The list below will update to show your verified address, which is cryptographically verified by the client.
