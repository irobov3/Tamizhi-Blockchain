// Minimal Keplr browser extension type declarations.
// Full types: @keplr-wallet/types (not installed to keep bundle lean).

type KeplrAlgo = 'secp256k1' | 'ed25519' | 'sr25519';

interface KeplrCurrency {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  coinGeckoId?: string;
}

interface KeplrGasPriceStep {
  low: number;
  average: number;
  high: number;
}

interface KeplrFeeCurrency extends KeplrCurrency {
  gasPriceStep?: KeplrGasPriceStep;
}

interface KeplrChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  bip44: { coinType: number };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: KeplrCurrency[];
  feeCurrencies: KeplrFeeCurrency[];
  stakeCurrency: KeplrCurrency;
  features?: string[];
}

interface KeplrKey {
  name: string;
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  bech32Address: string;
  isNanoLedger: boolean;
}

interface OfflineAminoSigner {
  getAccounts(): Promise<{ address: string; pubkey: Uint8Array; algo: KeplrAlgo }[]>;
  signAmino(signerAddress: string, signDoc: unknown): Promise<unknown>;
}

interface OfflineDirectSigner {
  getAccounts(): Promise<{ address: string; pubkey: Uint8Array; algo: KeplrAlgo }[]>;
  signDirect(signerAddress: string, signDoc: unknown): Promise<unknown>;
}

interface Keplr {
  version: string;
  enable(chainIds: string | string[]): Promise<void>;
  experimentalSuggestChain(chainInfo: KeplrChainInfo): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
  getOfflineSigner(chainId: string): OfflineAminoSigner & OfflineDirectSigner;
  getOfflineSignerOnlyAmino(chainId: string): OfflineAminoSigner;
  getOfflineSignerAuto(chainId: string): Promise<OfflineAminoSigner | OfflineDirectSigner>;
  signArbitrary(chainId: string, signer: string, data: string): Promise<{ pub_key: unknown; signature: string }>;
}

interface Window {
  keplr?: Keplr;
  leap?: Keplr; // Leap wallet — compatible API
}
