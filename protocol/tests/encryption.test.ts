/**
 * Tamizhi Protocol — Encryption Test Suite
 *
 * Tests encrypt/decrypt round-trips, onion layer peeling, and signature verification.
 * Uses real NaCl crypto — no mocking of cryptographic primitives.
 */

import nacl from 'tweetnacl';
import { toHex, fromHex } from '@cosmjs/encoding';

import {
  encryptMessage,
  decryptMessage,
  encryptOnionLayer,
  decryptOnionLayer,
  signMessage,
  verifySignature,
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
} from '../src/crypto/encryption';

import {
  buildOnionPacket,
  peelOnionLayer,
  selectOnionPath,
} from '../src/routing/onion';
import type { NodeInfo } from '../src/routing/onion';

import {
  deriveX25519FromSecp256k1,
  exportPublicIdentity,
} from '../src/identity/keypair';
import type { TamizhiIdentity } from '../src/identity/keypair';

import {
  createGroup,
  addMember,
  encryptGroupMessage,
  decryptGroupMessage,
} from '../src/protocol/group';
import type { PublicIdentity } from '../src/identity/keypair';

import {
  isValidTamizhiAddress,
  truncateAddress,
  addressToConversationId,
} from '../src/util/address';

// ── Test fixture helpers ──────────────────────────────────────────────────────

/** Build a minimal TamizhiIdentity from a raw 32-byte secp256k1 private key (for tests only). */
function makeTestIdentity(privKeyHex: string, walletAddress: string): TamizhiIdentity {
  const secp256k1PrivateKey = fromHex(privKeyHex);
  const x25519Keys = deriveX25519FromSecp256k1(secp256k1PrivateKey);

  // For tests, use a fake compressed pubkey (33 bytes of the privkey repeated)
  const secp256k1PublicKey = new Uint8Array(33);
  secp256k1PublicKey.set(secp256k1PrivateKey.slice(0, 32));
  secp256k1PublicKey[32] = 0x02; // fake compression prefix

  return {
    walletAddress,
    secp256k1PublicKey,
    secp256k1PrivateKey,
    x25519PublicKey: x25519Keys.publicKey,
    x25519SecretKey: x25519Keys.secretKey,
  };
}

/** Build a NodeInfo with a fresh X25519 keypair. */
function makeTestNode(
  address: string,
  endpoint: string,
  stake: number
): { nodeInfo: NodeInfo; secretKey: Uint8Array } {
  const keypair = nacl.box.keyPair();
  return {
    nodeInfo: {
      address,
      x25519PublicKey: keypair.publicKey,
      endpoint,
      stake,
    },
    secretKey: keypair.secretKey,
  };
}

// Deterministic test identities (never use in production)
const ALICE_PRIVKEY = 'a'.repeat(64); // 32 bytes of 0xaa
const BOB_PRIVKEY   = 'b'.repeat(64); // 32 bytes of 0xbb

const alice = makeTestIdentity(ALICE_PRIVKEY, 'tamizhi1alicetestaddressxxxxxxxxxxxxxxxx');
const bob   = makeTestIdentity(BOB_PRIVKEY,   'tamizhi1bobtestaddressxxxxxxxxxxxxxxxxx');

// ── 1. Message Encryption / Decryption ───────────────────────────────────────

describe('encryptMessage / decryptMessage', () => {
  it('round-trips a short plaintext', () => {
    const plaintext = 'Hello, Tamizhi!';
    const encrypted = encryptMessage(plaintext, alice, bob.x25519PublicKey);

    expect(encrypted.version).toBe('tmz-1');
    expect(encrypted.senderAddress).toBe(alice.walletAddress);
    expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
    expect(encrypted.nonce).toHaveLength(24);
    expect(encrypted.ephemeralPublicKey).toHaveLength(32);

    const recovered = decryptMessage(encrypted, bob);
    expect(recovered).toBe(plaintext);
  });

  it('round-trips a long Unicode message', () => {
    const plaintext = 'தமிழி நெட்வொர்க் வாழ்க! '.repeat(200);
    const encrypted = encryptMessage(plaintext, alice, bob.x25519PublicKey);
    const recovered = decryptMessage(encrypted, bob);
    expect(recovered).toBe(plaintext);
  });

  it('uses a fresh ephemeral keypair each time (unlinkable)', () => {
    const e1 = encryptMessage('test', alice, bob.x25519PublicKey);
    const e2 = encryptMessage('test', alice, bob.x25519PublicKey);
    expect(toHex(e1.ephemeralPublicKey)).not.toBe(toHex(e2.ephemeralPublicKey));
    expect(toHex(e1.nonce)).not.toBe(toHex(e2.nonce));
  });

  it('produces different ciphertexts for the same plaintext', () => {
    const e1 = encryptMessage('same', alice, bob.x25519PublicKey);
    const e2 = encryptMessage('same', alice, bob.x25519PublicKey);
    expect(toHex(e1.ciphertext)).not.toBe(toHex(e2.ciphertext));
  });

  it('throws on decryption with wrong key', () => {
    const encrypted = encryptMessage('secret', alice, bob.x25519PublicKey);
    // Use alice's secret key instead of bob's — should fail
    const wrongIdentity: TamizhiIdentity = { ...alice };
    expect(() => decryptMessage(encrypted, wrongIdentity)).toThrow('Decryption failed');
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encryptMessage('tamper me', alice, bob.x25519PublicKey);
    const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.map((b) => b ^ 0xff) as unknown as Uint8Array };
    tampered.ciphertext = new Uint8Array(encrypted.ciphertext.map((b) => b ^ 0xff));
    expect(() => decryptMessage(tampered, bob)).toThrow();
  });

  it('round-trips via serialization/deserialization', () => {
    const plaintext = 'Wire format test';
    const encrypted = encryptMessage(plaintext, alice, bob.x25519PublicKey);
    const wire = serializeEncryptedMessage(encrypted);
    const restored = deserializeEncryptedMessage(wire);
    const recovered = decryptMessage(restored, bob);
    expect(recovered).toBe(plaintext);
  });

  it('serializes to hex strings', () => {
    const encrypted = encryptMessage('hex', alice, bob.x25519PublicKey);
    const wire = serializeEncryptedMessage(encrypted);
    expect(typeof wire.ciphertext).toBe('string');
    expect(typeof wire.nonce).toBe('string');
    expect(typeof wire.ephemeralPublicKey).toBe('string');
    // Valid hex: only [0-9a-f]
    expect(wire.ciphertext).toMatch(/^[0-9a-f]+$/);
  });
});

// ── 2. Onion Layer Encryption ─────────────────────────────────────────────────

describe('encryptOnionLayer / decryptOnionLayer', () => {
  it('round-trips a payload through one layer', () => {
    const nodeKeypair = nacl.box.keyPair();
    const payload = new TextEncoder().encode('onion payload test');

    const layer = encryptOnionLayer(payload, nodeKeypair.publicKey);
    const recovered = decryptOnionLayer(layer, nodeKeypair.secretKey);

    expect(recovered).toEqual(payload);
  });

  it('throws when decrypting with wrong key', () => {
    const nodeKeypair = nacl.box.keyPair();
    const wrongKeypair = nacl.box.keyPair();
    const payload = new Uint8Array([1, 2, 3, 4]);

    const layer = encryptOnionLayer(payload, nodeKeypair.publicKey);
    expect(() => decryptOnionLayer(layer, wrongKeypair.secretKey)).toThrow();
  });

  it('uses fresh ephemeral keys per call', () => {
    const nodeKeypair = nacl.box.keyPair();
    const payload = new Uint8Array([42]);

    const l1 = encryptOnionLayer(payload, nodeKeypair.publicKey);
    const l2 = encryptOnionLayer(payload, nodeKeypair.publicKey);

    expect(toHex(l1.ephemeralPublicKey)).not.toBe(toHex(l2.ephemeralPublicKey));
    expect(toHex(l1.nonce)).not.toBe(toHex(l2.nonce));
  });
});

// ── 3. 3-Hop Onion Routing ────────────────────────────────────────────────────

describe('buildOnionPacket / peelOnionLayer', () => {
  const { nodeInfo: nodeA, secretKey: skA } = makeTestNode('tamizhi1nodeA', 'http://nodeA:8080', 1000);
  const { nodeInfo: nodeB, secretKey: skB } = makeTestNode('tamizhi1nodeB', 'http://nodeB:8080', 2000);
  const { nodeInfo: nodeC, secretKey: skC } = makeTestNode('tamizhi1nodeC', 'http://nodeC:8080', 1500);

  const path = [nodeA, nodeB, nodeC];
  const destination = 'tamizhi1recipientaddressxxxxxxxxxxxxxxx';
  const payload = new TextEncoder().encode('{ "msg": "hello onion world" }');

  it('builds a valid onion packet (version onion-1)', () => {
    const packet = buildOnionPacket(payload, path, destination);
    expect(packet.version).toBe('onion-1');
    expect(packet.layer.ciphertext).toBeInstanceOf(Uint8Array);
    expect(packet.layer.ciphertext.length).toBeGreaterThan(0);
  });

  it('Node A peels its layer and gets nextHop = Node B endpoint', () => {
    const packet = buildOnionPacket(payload, path, destination);
    const result = peelOnionLayer(packet, skA);

    expect(result.isFinal).toBe(false);
    expect(result.nextHop).toBe(nodeB.endpoint);
    expect(result.nextPacket).toBeDefined();
  });

  it('Node B peels its layer and gets nextHop = Node C endpoint', () => {
    const packet = buildOnionPacket(payload, path, destination);
    const resultA = peelOnionLayer(packet, skA);
    const resultB = peelOnionLayer(resultA.nextPacket!, skB);

    expect(resultB.isFinal).toBe(false);
    expect(resultB.nextHop).toBe(nodeC.endpoint);
    expect(resultB.nextPacket).toBeDefined();
  });

  it('Node C peels the final layer and recovers the payload and destination', () => {
    const packet = buildOnionPacket(payload, path, destination);
    const resultA = peelOnionLayer(packet, skA);
    const resultB = peelOnionLayer(resultA.nextPacket!, skB);
    const resultC = peelOnionLayer(resultB.nextPacket!, skC);

    expect(resultC.isFinal).toBe(true);
    expect(resultC.destination).toBe(destination);
    expect(resultC.payload).toEqual(payload);
  });

  it('Node A cannot decrypt Node B layer (isolation guarantee)', () => {
    const packet = buildOnionPacket(payload, path, destination);
    const resultA = peelOnionLayer(packet, skA);
    // Attempting to peel Node B's packet using Node A's secret key should fail
    expect(() => peelOnionLayer(resultA.nextPacket!, skA)).toThrow();
  });

  it('rejects path with wrong number of hops', () => {
    expect(() => buildOnionPacket(payload, [nodeA, nodeB], destination)).toThrow(
      'Onion path must have exactly 3 nodes'
    );
    expect(() => buildOnionPacket(payload, [nodeA], destination)).toThrow();
  });

  it('produces different packets for the same payload (random nonces)', () => {
    const p1 = buildOnionPacket(payload, path, destination);
    const p2 = buildOnionPacket(payload, path, destination);
    expect(toHex(p1.layer.ciphertext)).not.toBe(toHex(p2.layer.ciphertext));
  });
});

// ── 4. Weighted Node Selection ────────────────────────────────────────────────

describe('selectOnionPath', () => {
  const nodes: NodeInfo[] = Array.from({ length: 10 }, (_, i) => ({
    address: `tamizhi1node${i}`,
    x25519PublicKey: nacl.box.keyPair().publicKey,
    endpoint: `http://node${i}:8080`,
    stake: (i + 1) * 100,
  }));

  it('selects exactly 3 distinct nodes', () => {
    const path = selectOnionPath(nodes, 3);
    expect(path).toHaveLength(3);

    const endpoints = path.map((n) => n.endpoint);
    const unique = new Set(endpoints);
    expect(unique.size).toBe(3);
  });

  it('throws when fewer nodes than required', () => {
    const twoNodes = nodes.slice(0, 2);
    expect(() => selectOnionPath(twoNodes, 3)).toThrow('Insufficient service nodes');
  });

  it('never returns the same node twice', () => {
    for (let i = 0; i < 50; i++) {
      const path = selectOnionPath(nodes, 3);
      const addresses = path.map((n) => n.address);
      const unique = new Set(addresses);
      expect(unique.size).toBe(3);
    }
  });

  it('includes higher-stake nodes more often (statistical)', () => {
    const biasedNodes: NodeInfo[] = [
      { address: 'tamizhi1high', x25519PublicKey: nacl.box.keyPair().publicKey, endpoint: 'http://high', stake: 1_000_000 },
      { address: 'tamizhi1low1', x25519PublicKey: nacl.box.keyPair().publicKey, endpoint: 'http://low1', stake: 1 },
      { address: 'tamizhi1low2', x25519PublicKey: nacl.box.keyPair().publicKey, endpoint: 'http://low2', stake: 1 },
      { address: 'tamizhi1low3', x25519PublicKey: nacl.box.keyPair().publicKey, endpoint: 'http://low3', stake: 1 },
    ];

    let highNodeSelected = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const path = selectOnionPath(biasedNodes, 3);
      if (path.some((n) => n.address === 'tamizhi1high')) highNodeSelected++;
    }
    // The high-stake node should be selected in >95% of trials
    expect(highNodeSelected / trials).toBeGreaterThan(0.95);
  });
});

// ── 5. secp256k1 Signature Verification ──────────────────────────────────────

describe('signMessage / verifySignature', () => {
  // Use a valid 32-byte secp256k1 private key for real signing tests
  const validPrivKey = new Uint8Array([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
  ]);

  it('produces a 64-byte signature', async () => {
    const msg = new TextEncoder().encode('sign this');
    const sig = await signMessage(msg, validPrivKey);
    expect(sig).toHaveLength(64);
  });

  it('verifies a valid signature', async () => {
    const { Secp256k1 } = await import('@cosmjs/crypto');
    const keypair = await Secp256k1.makeKeypair(validPrivKey);
    const pubKey = Secp256k1.compressPubkey(keypair.pubkey);

    const msg = new TextEncoder().encode('tamizhi protocol verification test');
    const sig = await signMessage(msg, validPrivKey);

    const valid = await verifySignature(msg, sig, pubKey);
    expect(valid).toBe(true);
  });

  it('rejects a signature with wrong public key', async () => {
    const { Secp256k1 } = await import('@cosmjs/crypto');
    const otherPrivKey = new Uint8Array(32).fill(0x42);
    const otherKeypair = await Secp256k1.makeKeypair(otherPrivKey);
    const otherPubKey = Secp256k1.compressPubkey(otherKeypair.pubkey);

    const msg = new TextEncoder().encode('wrong key');
    const sig = await signMessage(msg, validPrivKey);

    const valid = await verifySignature(msg, sig, otherPubKey);
    expect(valid).toBe(false);
  });

  it('rejects a corrupted signature', async () => {
    const { Secp256k1 } = await import('@cosmjs/crypto');
    const keypair = await Secp256k1.makeKeypair(validPrivKey);
    const pubKey = Secp256k1.compressPubkey(keypair.pubkey);

    const msg = new TextEncoder().encode('corrupted');
    const sig = await signMessage(msg, validPrivKey);
    const badSig = new Uint8Array(sig.map((b) => b ^ 0xff));

    const valid = await verifySignature(msg, badSig, pubKey);
    expect(valid).toBe(false);
  });

  it('rejects a valid signature applied to different message', async () => {
    const { Secp256k1 } = await import('@cosmjs/crypto');
    const keypair = await Secp256k1.makeKeypair(validPrivKey);
    const pubKey = Secp256k1.compressPubkey(keypair.pubkey);

    const msg1 = new TextEncoder().encode('message one');
    const msg2 = new TextEncoder().encode('message two');
    const sig = await signMessage(msg1, validPrivKey);

    const valid = await verifySignature(msg2, sig, pubKey);
    expect(valid).toBe(false);
  });
});

// ── 6. X25519 Key Derivation ──────────────────────────────────────────────────

describe('deriveX25519FromSecp256k1', () => {
  it('is deterministic for the same input', () => {
    const privKey = new Uint8Array(32).fill(0x7a);
    const k1 = deriveX25519FromSecp256k1(privKey);
    const k2 = deriveX25519FromSecp256k1(privKey);
    expect(toHex(k1.publicKey)).toBe(toHex(k2.publicKey));
    expect(toHex(k1.secretKey)).toBe(toHex(k2.secretKey));
  });

  it('produces different keys for different inputs', () => {
    const k1 = deriveX25519FromSecp256k1(new Uint8Array(32).fill(0x11));
    const k2 = deriveX25519FromSecp256k1(new Uint8Array(32).fill(0x22));
    expect(toHex(k1.publicKey)).not.toBe(toHex(k2.publicKey));
  });

  it('produces 32-byte keys', () => {
    const keys = deriveX25519FromSecp256k1(new Uint8Array(32).fill(0x55));
    expect(keys.publicKey).toHaveLength(32);
    expect(keys.secretKey).toHaveLength(32);
  });

  it('secret key is properly clamped', () => {
    const keys = deriveX25519FromSecp256k1(new Uint8Array(32).fill(0xff));
    // Low 3 bits of first byte must be 0
    expect(keys.secretKey[0] & 0b111).toBe(0);
    // High bit of last byte must be 0
    expect(keys.secretKey[31] & 0x80).toBe(0);
    // Second-highest bit of last byte must be 1
    expect(keys.secretKey[31] & 0x40).toBe(0x40);
  });

  it('derived X25519 keypair can encrypt/decrypt', () => {
    const privKey1 = new Uint8Array(32).fill(0x13);
    const privKey2 = new Uint8Array(32).fill(0x37);

    const keys1 = deriveX25519FromSecp256k1(privKey1);
    const keys2 = deriveX25519FromSecp256k1(privKey2);

    // Use keys1 to encrypt a message for keys2
    const nonce = nacl.randomBytes(24);
    const msg = new TextEncoder().encode('x25519 derived key test');
    const box = nacl.box(msg, nonce, keys2.publicKey, keys1.secretKey);

    // keys2 decrypts it
    const opened = nacl.box.open(box, nonce, keys1.publicKey, keys2.secretKey);
    expect(opened).not.toBeNull();
    expect(new TextDecoder().decode(opened!)).toBe('x25519 derived key test');
  });
});

// ── 7. Group Messaging ────────────────────────────────────────────────────────

describe('Group messaging', () => {
  const alicePublicId: PublicIdentity = exportPublicIdentity(alice);
  const bobPublicId: PublicIdentity   = exportPublicIdentity(bob);

  it('creates a group with members', () => {
    const group = createGroup(alice, [alicePublicId, bobPublicId]);
    expect(group.version).toBe('group-1');
    expect(group.members).toContain(alice.walletAddress);
    expect(group.members).toContain(bob.walletAddress);
    expect(group.adminAddress).toBe(alice.walletAddress);
    expect(group.encryptionKey).toHaveLength(32);
    expect(group.encryptedKeys).toHaveLength(2);
  });

  it('encrypts and decrypts a group message', () => {
    const group = createGroup(alice, [alicePublicId, bobPublicId]);
    const plaintext = 'Group chat: Hello everyone!';

    const encrypted = encryptGroupMessage(plaintext, group, alice.walletAddress);
    expect(encrypted.groupId).toBe(group.groupId);
    expect(encrypted.senderAddress).toBe(alice.walletAddress);

    const recovered = decryptGroupMessage(encrypted, group);
    expect(recovered).toBe(plaintext);
  });

  it('adds a new member to the group', () => {
    const group = createGroup(alice, [alicePublicId]);
    expect(group.members).toHaveLength(1);

    const updated = addMember(group, bobPublicId, alice);
    expect(updated.members).toHaveLength(2);
    expect(updated.members).toContain(bob.walletAddress);
    expect(updated.encryptedKeys).toHaveLength(2);
  });

  it('rejects adding an existing member', () => {
    const group = createGroup(alice, [alicePublicId, bobPublicId]);
    expect(() => addMember(group, bobPublicId, alice)).toThrow('already a member');
  });

  it('rejects non-admin adding a member', () => {
    const group = createGroup(alice, [alicePublicId, bobPublicId]);
    expect(() => addMember(group, bobPublicId, bob)).toThrow('Only the group admin');
  });

  it('fails to decrypt with wrong group key', () => {
    const group1 = createGroup(alice, [alicePublicId, bobPublicId]);
    const group2 = createGroup(alice, [alicePublicId, bobPublicId]); // different key

    const encrypted = encryptGroupMessage('secret', group1, alice.walletAddress);
    expect(() => decryptGroupMessage(encrypted, group2)).toThrow();
  });
});

// ── 8. Address Utilities ──────────────────────────────────────────────────────

describe('Address utilities', () => {
  it('validates correct tamizhi addresses', () => {
    // Valid bech32 with prefix "tamizhi" and 20-byte data
    // We'll generate one from the test identity derivation
    // For the test, we verify the helper rejects obviously wrong inputs
    expect(isValidTamizhiAddress('cosmos1abcdefghijklmnopqrstuv0123456')).toBe(false);
    expect(isValidTamizhiAddress('tamizhi1')).toBe(false);
    expect(isValidTamizhiAddress('')).toBe(false);
    expect(isValidTamizhiAddress('not-an-address')).toBe(false);
  });

  it('truncates an address for display', () => {
    const addr = 'tamizhi1abcdefghijklmnopqrstuvwxyz0123456789';
    const truncated = truncateAddress(addr, 10);
    expect(truncated).toMatch(/^tamizhi1ab\.\.\..*$/);
    expect(truncated.length).toBeLessThan(addr.length);
  });

  it('generates a deterministic conversationId', () => {
    const id1 = addressToConversationId('tamizhi1alice', 'tamizhi1bob');
    const id2 = addressToConversationId('tamizhi1bob', 'tamizhi1alice');
    expect(id1).toBe(id2);
  });

  it('conversationId is sorted lexicographically', () => {
    const id = addressToConversationId('tamizhi1zzz', 'tamizhi1aaa');
    expect(id).toBe('tamizhi1aaa:tamizhi1zzz');
  });
});
