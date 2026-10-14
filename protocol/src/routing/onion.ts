import nacl from 'tweetnacl';
import { fromHex, toHex } from '@cosmjs/encoding';
import { encryptOnionLayer, decryptOnionLayer, type OnionLayer } from '../crypto/encryption';

/**
 * A Tamizhi service/validator node that can participate in onion routing.
 */
export interface NodeInfo {
  address: string;       // tamizhi1... wallet address of node operator
  x25519PublicKey: Uint8Array; // 32 bytes — used for onion encryption
  endpoint: string;      // HTTP endpoint, e.g. "https://node1.tamizhi.network:8080"
  stake: number;         // Staked tokens — used for weighted random selection
}

/**
 * An onion-routed packet. Each layer conceals inner layers from nodes that cannot decrypt them.
 * The outermost layer is what the client sends to Node A.
 */
export interface OnionPacket {
  layer: OnionLayer;         // Encrypted blob for the current hop
  version: 'onion-1';
}

/**
 * Internal envelope structure stored inside each onion layer after decryption.
 * For intermediate nodes: nextHop is set and innerPacket contains the next layer.
 * For the final node: isFinal is true and finalPayload contains the actual message.
 */
interface OnionEnvelope {
  isFinal: boolean;
  nextHop?: string;         // endpoint of the next node
  innerPacket?: OnionPacket; // encrypted blob for the next hop
  finalPayload?: Uint8Array; // actual message bytes (only at final hop)
  destination?: string;     // recipient wallet address (only at final hop)
}

/**
 * Serialize an OnionEnvelope to bytes for encryption.
 */
function serializeEnvelope(envelope: OnionEnvelope): Uint8Array {
  const json = JSON.stringify({
    isFinal: envelope.isFinal,
    nextHop: envelope.nextHop ?? null,
    innerPacket: envelope.innerPacket
      ? {
          layer: {
            ciphertext: toHex(envelope.innerPacket.layer.ciphertext),
            nonce: toHex(envelope.innerPacket.layer.nonce),
            ephemeralPublicKey: toHex(envelope.innerPacket.layer.ephemeralPublicKey),
          },
          version: envelope.innerPacket.version,
        }
      : null,
    finalPayload: envelope.finalPayload ? toHex(envelope.finalPayload) : null,
    destination: envelope.destination ?? null,
  });
  return new TextEncoder().encode(json);
}

/**
 * Deserialize an OnionEnvelope from bytes.
 */
function deserializeEnvelope(bytes: Uint8Array): OnionEnvelope {
  const json = JSON.parse(new TextDecoder().decode(bytes));

  const envelope: OnionEnvelope = {
    isFinal: json.isFinal,
  };

  if (json.nextHop) envelope.nextHop = json.nextHop;
  if (json.destination) envelope.destination = json.destination;

  if (json.innerPacket) {
    envelope.innerPacket = {
      layer: {
        ciphertext: fromHex(json.innerPacket.layer.ciphertext),
        nonce: fromHex(json.innerPacket.layer.nonce),
        ephemeralPublicKey: fromHex(json.innerPacket.layer.ephemeralPublicKey),
      },
      version: json.innerPacket.version,
    };
  }

  if (json.finalPayload) {
    envelope.finalPayload = fromHex(json.finalPayload);
  }

  return envelope;
}

/**
 * Build a 3-hop onion packet for the given payload and node path.
 *
 * Construction order (innermost first):
 *   Layer 3 (final): encrypt(payload + destination) for Node C
 *   Layer 2: encrypt(Layer3 + Node C endpoint) for Node B
 *   Layer 1: encrypt(Layer2 + Node B endpoint) for Node A  ← outermost, sent by client
 *
 * Each node peels its layer, learns only the next hop, and forwards blindly.
 *
 * @param payload - The actual encrypted message bytes
 * @param path    - Exactly 3 NodeInfo entries [Node A, Node B, Node C]
 * @param finalDestination - Recipient wallet address (only Node C sees this)
 */
export function buildOnionPacket(
  payload: Uint8Array,
  path: NodeInfo[],
  finalDestination: string
): OnionPacket {
  if (path.length !== 3) {
    throw new Error(`Onion path must have exactly 3 nodes, got ${path.length}`);
  }

  const [nodeA, nodeB, nodeC] = path;

  // ── Layer 3 (innermost): final delivery ──────────────────────────────────
  const finalEnvelope: OnionEnvelope = {
    isFinal: true,
    finalPayload: payload,
    destination: finalDestination,
  };
  const finalBytes = serializeEnvelope(finalEnvelope);
  const layer3 = encryptOnionLayer(finalBytes, nodeC.x25519PublicKey);
  const packet3: OnionPacket = { layer: layer3, version: 'onion-1' };

  // ── Layer 2: forward to Node C ───────────────────────────────────────────
  const midEnvelope: OnionEnvelope = {
    isFinal: false,
    nextHop: nodeC.endpoint,
    innerPacket: packet3,
  };
  const midBytes = serializeEnvelope(midEnvelope);
  const layer2 = encryptOnionLayer(midBytes, nodeB.x25519PublicKey);
  const packet2: OnionPacket = { layer: layer2, version: 'onion-1' };

  // ── Layer 1 (outermost): forward to Node B ───────────────────────────────
  const outerEnvelope: OnionEnvelope = {
    isFinal: false,
    nextHop: nodeB.endpoint,
    innerPacket: packet2,
  };
  const outerBytes = serializeEnvelope(outerEnvelope);
  const layer1 = encryptOnionLayer(outerBytes, nodeA.x25519PublicKey);

  return { layer: layer1, version: 'onion-1' };
}

/**
 * Peel one layer of the onion packet using this node's X25519 secret key.
 *
 * Returns:
 * - payload: the inner bytes (either the next OnionPacket or the final message)
 * - nextHop: the endpoint to forward to (undefined if isFinal)
 * - isFinal: true if this is the destination node
 * - destination: recipient wallet address (only present if isFinal)
 */
export function peelOnionLayer(
  packet: OnionPacket,
  nodeSecretKey: Uint8Array
): {
  payload: Uint8Array;
  nextHop?: string;
  nextPacket?: OnionPacket;
  isFinal: boolean;
  destination?: string;
} {
  const decrypted = decryptOnionLayer(packet.layer, nodeSecretKey);
  const envelope = deserializeEnvelope(decrypted);

  if (envelope.isFinal) {
    if (!envelope.finalPayload) {
      throw new Error('Final onion layer missing payload');
    }
    return {
      payload: envelope.finalPayload,
      isFinal: true,
      destination: envelope.destination,
    };
  }

  if (!envelope.nextHop || !envelope.innerPacket) {
    throw new Error('Intermediate onion layer missing nextHop or innerPacket');
  }

  return {
    payload: serializeEnvelope({ isFinal: false, innerPacket: envelope.innerPacket }),
    nextHop: envelope.nextHop,
    nextPacket: envelope.innerPacket,
    isFinal: false,
  };
}

/**
 * Select `count` distinct nodes from the available list, weighted by stake.
 * Higher-stake nodes are more likely to be chosen, but selection is still random.
 * No node is selected twice.
 */
export function selectOnionPath(nodes: NodeInfo[], count: number = 3): NodeInfo[] {
  if (nodes.length < count) {
    throw new Error(
      `Need at least ${count} nodes for onion routing, only ${nodes.length} available`
    );
  }

  const selected: NodeInfo[] = [];
  const remaining = [...nodes];

  for (let i = 0; i < count; i++) {
    const totalStake = remaining.reduce((sum, n) => sum + n.stake, 0);
    let pick = Math.random() * totalStake;

    let chosenIndex = 0;
    for (let j = 0; j < remaining.length; j++) {
      pick -= remaining[j].stake;
      if (pick <= 0) {
        chosenIndex = j;
        break;
      }
    }

    selected.push(remaining[chosenIndex]);
    remaining.splice(chosenIndex, 1);
  }

  return selected;
}

/**
 * Shuffle an array in place using Fisher-Yates (for testing / uniform random selection).
 */
export function shuffleNodes(nodes: NodeInfo[]): NodeInfo[] {
  const arr = [...nodes];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
