export type ChainName = "base" | "ethereum" | "arbitrum" | "optimism";

export interface GlobalOptions {
  owner?: string;
  chain?: ChainName;
  chainId?: number;
  rpcUrl?: string;
  password?: string;
  passwordStdin?: boolean;
  walletSignature?: string;
  walletSignatureStdin?: boolean;
  map: string[];
  mapFile?: string;
  allowMissing?: boolean;
  brokerSecret?: string;
  brokerSecretStdin?: boolean;
  brokerToken?: string;
  brokerTokenStdin?: boolean;
  ttlSeconds?: number;
}

export interface ResolvedCredentials {
  owner: string;
  password: string;
  walletSignature?: string;
}

export interface SecretMapping {
  envName: string;
  label: string;
}

export interface BrokerClaims {
  iat: number;
  exp: number;
  env: Record<string, string>;
}
