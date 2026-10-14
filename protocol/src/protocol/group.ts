import nacl from 'tweetnacl';
import { toHex, fromHex } from '@cosmjs/encoding';
import { v4 as uuidv4 } from 'uuid';
import type { TamizhiIdentity } from '../identity/keypair';
import type { PublicIdentity } from '../identity/keypair';

/**
 * A shared symmetric key distributed to all group members.
 * Each copy is individually encrypted for its intended recipient using their X25519 public key.
 */
export interface EncryptedGroupKey {
  recipientAddress: string;
  encryptedKey: string;  // hex: nacl.secretbox key encrypted with nacl.box for the recipient
  nonce: string;         // hex
  ephemeralPublicKey: string; // hex, X25519
}

/**
 * A group messaging session. The groupKey is used for all messages in the group.
 * Only members hold the decrypted groupKey; outsiders cannot decrypt group messages.
 */
export interface GroupSession {
  groupId: string;              // 32 random bytes as hex
  members: string[];            // wallet addresses of all members (includes admin)
  adminAddress: string;         // creator / current admin
  encryptionKey: Uint8Array;    // 32-byte XSalsa20-Poly1305 shared key (never serialized plaintext)
  encryptedKeys: EncryptedGroupKey[]; // one encrypted copy per member
  createdAt: number;            // unix ms
  version: 'group-1';
}

/**
 * An encrypted group message.
 */
export interface EncryptedGroupMessage {
  groupId: string;
  ciphertext: string;  // hex
  nonce: string;       // hex
  senderAddress: string;
  timestamp: number;
  version: 'group-1';
}

/**
 * Encrypt the group's shared key for a single recipient using NaCl box.
 */
function encryptKeyForMember(
  groupKey: Uint8Array,
  recipientX25519PubKey: Uint8Array,
  recipientAddress: string
): EncryptedGroupKey {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encryptedKey = nacl.box(groupKey, nonce, recipientX25519PubKey, ephemeral.secretKey);

  return {
    recipientAddress,
    encryptedKey: toHex(encryptedKey),
    nonce: toHex(nonce),
    ephemeralPublicKey: toHex(ephemeral.publicKey),
  };
}

/**
 * Decrypt the group key from an EncryptedGroupKey using the recipient's X25519 secret key.
 */
export function decryptGroupKey(
  encryptedKey: EncryptedGroupKey,
  recipientSecretKey: Uint8Array
): Uint8Array {
  const key = nacl.box.open(
    fromHex(encryptedKey.encryptedKey),
    fromHex(encryptedKey.nonce),
    fromHex(encryptedKey.ephemeralPublicKey),
    recipientSecretKey
  );

  if (key === null) {
    throw new Error('Failed to decrypt group key: invalid secret key or corrupt data');
  }

  return key;
}

/**
 * Create a new group session.
 * The admin must supply X25519 public keys for all members (including themselves).
 * The group key is freshly generated and encrypted once per member.
 *
 * @param admin   - Identity of the group creator (admin)
 * @param memberPublicIdentities - Public identities of ALL members (including admin)
 */
export function createGroup(
  admin: TamizhiIdentity,
  memberPublicIdentities: PublicIdentity[]
): GroupSession {
  // Generate a random 32-byte shared group key
  const encryptionKey = nacl.randomBytes(nacl.secretbox.keyLength);
  const groupId = toHex(nacl.randomBytes(32));

  const encryptedKeys: EncryptedGroupKey[] = memberPublicIdentities.map((member) => {
    const memberPubKey = fromHex(member.x25519PublicKey);
    return encryptKeyForMember(encryptionKey, memberPubKey, member.walletAddress);
  });

  const members = memberPublicIdentities.map((m) => m.walletAddress);

  return {
    groupId,
    members,
    adminAddress: admin.walletAddress,
    encryptionKey,
    encryptedKeys,
    createdAt: Date.now(),
    version: 'group-1',
  };
}

/**
 * Add a new member to an existing group session.
 * Only the admin can add members.
 * Returns an updated GroupSession with the new member's encrypted key appended.
 *
 * @param group       - Current group session (must include plaintext encryptionKey)
 * @param newMember   - Public identity of the new member
 * @param admin       - Admin identity (must match group.adminAddress)
 */
export function addMember(
  group: GroupSession,
  newMember: PublicIdentity,
  admin: TamizhiIdentity
): GroupSession {
  if (admin.walletAddress !== group.adminAddress) {
    throw new Error('Only the group admin can add members');
  }

  if (group.members.includes(newMember.walletAddress)) {
    throw new Error(`${newMember.walletAddress} is already a member of this group`);
  }

  const newEncryptedKey = encryptKeyForMember(
    group.encryptionKey,
    fromHex(newMember.x25519PublicKey),
    newMember.walletAddress
  );

  return {
    ...group,
    members: [...group.members, newMember.walletAddress],
    encryptedKeys: [...group.encryptedKeys, newEncryptedKey],
  };
}

/**
 * Remove a member from the group.
 * NOTE: This does NOT re-key the group. For forward secrecy after removal,
 * the admin should call createGroup() with the remaining members.
 */
export function removeMember(
  group: GroupSession,
  memberAddress: string,
  admin: TamizhiIdentity
): GroupSession {
  if (admin.walletAddress !== group.adminAddress) {
    throw new Error('Only the group admin can remove members');
  }

  return {
    ...group,
    members: group.members.filter((m) => m !== memberAddress),
    encryptedKeys: group.encryptedKeys.filter((k) => k.recipientAddress !== memberAddress),
  };
}

/**
 * Encrypt a plaintext message for the group using the shared symmetric key.
 * Uses nacl.secretbox (XSalsa20-Poly1305) with a fresh random nonce.
 */
export function encryptGroupMessage(
  content: string,
  group: GroupSession,
  senderAddress: string
): EncryptedGroupMessage {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const plaintext = new TextEncoder().encode(content);
  const ciphertext = nacl.secretbox(plaintext, nonce, group.encryptionKey);

  return {
    groupId: group.groupId,
    ciphertext: toHex(ciphertext),
    nonce: toHex(nonce),
    senderAddress,
    timestamp: Date.now(),
    version: 'group-1',
  };
}

/**
 * Decrypt a group message using the shared group key.
 */
export function decryptGroupMessage(
  msg: EncryptedGroupMessage,
  group: GroupSession
): string {
  if (msg.groupId !== group.groupId) {
    throw new Error('Message group ID does not match session group ID');
  }

  const plaintext = nacl.secretbox.open(
    fromHex(msg.ciphertext),
    fromHex(msg.nonce),
    group.encryptionKey
  );

  if (plaintext === null) {
    throw new Error('Group message decryption failed: invalid key or corrupt ciphertext');
  }

  return new TextDecoder().decode(plaintext);
}

/**
 * Reconstruct a GroupSession from a serialized form (e.g., stored in a database).
 * The caller must separately decrypt the encryptionKey using their own encrypted copy.
 */
export function loadGroupSession(
  serialized: Omit<GroupSession, 'encryptionKey'> & { encryptionKey?: Uint8Array },
  myIdentity: TamizhiIdentity
): GroupSession {
  if (serialized.encryptionKey) {
    return serialized as GroupSession;
  }

  // Find our encrypted key entry
  const myEncryptedKey = serialized.encryptedKeys.find(
    (k) => k.recipientAddress === myIdentity.walletAddress
  );

  if (!myEncryptedKey) {
    throw new Error(`No encrypted group key found for ${myIdentity.walletAddress}`);
  }

  const encryptionKey = decryptGroupKey(myEncryptedKey, myIdentity.x25519SecretKey);

  return {
    ...serialized,
    encryptionKey,
  };
}
