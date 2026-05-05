export const config = {
  rpcUrl: __ENV.RPC_URL || 'http://localhost:26657',
  restUrl: __ENV.REST_URL || 'http://localhost:1317',
  chainId: __ENV.CHAIN_ID || 'tamizhi-local-1',
  denom: 'utmz',
  gasPrice: '1000utmz',

  // Test wallet mnemonics (pre-funded in localnet genesis)
  // In real tests these would come from env vars
  testMnemonics: [
    'test test test test test test test test test test test junk',
  ],
};
