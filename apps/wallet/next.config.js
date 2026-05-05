/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:26657',
    NEXT_PUBLIC_REST_URL: process.env.NEXT_PUBLIC_REST_URL || 'http://localhost:1317',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || 'tamizhi-testnet-1',
    NEXT_PUBLIC_EXPLORER_URL: process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://localhost:3001',
  },
};
module.exports = nextConfig;
