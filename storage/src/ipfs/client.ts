import { createKuboRPCClient, KuboRPCClient } from 'kubo-rpc-client';
import { logger } from '../utils/logger';

let ipfsClient: KuboRPCClient | null = null;

function getIPFSClient(): KuboRPCClient {
  if (!ipfsClient) {
    const url = process.env.IPFS_API_URL || 'http://localhost:5001';
    ipfsClient = createKuboRPCClient({ url });
    logger.info(`IPFS client initialized with URL: ${url}`);
  }
  return ipfsClient;
}

export interface UploadResult {
  cid: string;
  size: number;
}

/**
 * Upload a buffer to IPFS and return the CID and size.
 */
export async function uploadToIPFS(buffer: Buffer, filename: string): Promise<UploadResult> {
  const client = getIPFSClient();

  try {
    logger.info(`Uploading file to IPFS: ${filename} (${buffer.length} bytes)`);

    const result = await client.add(
      {
        path: filename,
        content: buffer,
      },
      {
        pin: true,
        wrapWithDirectory: false,
      }
    );

    const cid = result.cid.toString();
    const size = Number(result.size);

    logger.info(`File uploaded to IPFS: CID=${cid}, size=${size}`);

    return { cid, size };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to upload to IPFS: ${msg}`);
    throw new Error(`IPFS upload failed: ${msg}`);
  }
}

/**
 * Retrieve a file from IPFS by its CID and return it as a Buffer.
 */
export async function getFromIPFS(cid: string): Promise<Buffer> {
  const client = getIPFSClient();

  try {
    logger.info(`Fetching from IPFS: CID=${cid}`);

    const chunks: Uint8Array[] = [];

    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    logger.info(`Fetched from IPFS: CID=${cid}, size=${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch from IPFS CID=${cid}: ${msg}`);
    throw new Error(`IPFS fetch failed: ${msg}`);
  }
}

/**
 * Pin a CID on the local IPFS node to prevent garbage collection.
 */
export async function pinCID(cid: string): Promise<void> {
  const client = getIPFSClient();

  try {
    logger.info(`Pinning CID: ${cid}`);
    await client.pin.add(cid);
    logger.info(`Pinned CID: ${cid}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to pin CID=${cid}: ${msg}`);
    throw new Error(`IPFS pin failed: ${msg}`);
  }
}

/**
 * Unpin a CID from the local IPFS node.
 */
export async function unpinCID(cid: string): Promise<void> {
  const client = getIPFSClient();

  try {
    logger.info(`Unpinning CID: ${cid}`);
    await client.pin.rm(cid);
    logger.info(`Unpinned CID: ${cid}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to unpin CID=${cid}: ${msg}`);
    throw new Error(`IPFS unpin failed: ${msg}`);
  }
}

export interface IPFSStats {
  repoSize: number;
  storageMax: number;
  numObjects: number;
  repoPath: string;
  version: string;
}

/**
 * Retrieve repository statistics from the IPFS node.
 */
export async function getIPFSStats(): Promise<IPFSStats> {
  const client = getIPFSClient();

  try {
    const [stat, version] = await Promise.all([
      client.repo.stat(),
      client.version(),
    ]);

    return {
      repoSize: Number(stat.repoSize),
      storageMax: Number(stat.storageMax),
      numObjects: Number(stat.numObjects),
      repoPath: stat.repoPath,
      version: version.version,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get IPFS stats: ${msg}`);
    throw new Error(`IPFS stats failed: ${msg}`);
  }
}

/**
 * Check whether the IPFS node is reachable and healthy.
 */
export async function checkHealth(): Promise<boolean> {
  const client = getIPFSClient();

  try {
    await client.version();
    return true;
  } catch {
    return false;
  }
}

/**
 * List all pinned CIDs on the local node.
 */
export async function listPinnedCIDs(): Promise<string[]> {
  const client = getIPFSClient();

  try {
    const pins: string[] = [];

    for await (const pin of client.pin.ls({ type: 'recursive' })) {
      pins.push(pin.cid.toString());
    }

    return pins;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to list pinned CIDs: ${msg}`);
    throw new Error(`IPFS list pins failed: ${msg}`);
  }
}
