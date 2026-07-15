import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosError } from 'axios';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { listConversationKeys, upsertMyChatKey } from './api';
import type {
  ChatMessage,
  ChatParticipantKey,
  ChatRole,
  SendChatMessageRequest,
} from './types';

const CHAT_E2EE_LOCAL_KEY_STORAGE = 'chat_e2ee_local_key_v1';
export const CHAT_E2EE_ALGORITHM = 'X25519_XSALSA20_POLY1305_V1';

type LocalChatKey = {
  keyId: string;
  publicKey: string;
  secretKey: string;
  algorithmVersion: string;
  createdAt: string;
};

const registeredKeyIdsByRole: Partial<Record<ChatRole, string>> = {};

function encodeBase64(bytes: Uint8Array): string {
  return naclUtil.encodeBase64(bytes);
}

function decodeBase64(value: string): Uint8Array {
  return naclUtil.decodeBase64(value);
}

function randomKeyId(): string {
  const bytes = Uint8Array.from(Crypto.getRandomBytes(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isKeyRegistrationConflict(error: unknown): boolean {
  const axiosErr = error as AxiosError<{ detail?: string; message?: string }>;
  const status = axiosErr?.response?.status;
  if (status !== 409) return false;
  // Accept any 409 from the key-registration endpoint — both explicit
  // keyIdAlreadyInUse errors and DataIntegrityViolation unique-constraint
  // violations (when re-registering a previously-revoked keyId) are 409.
  return true;
}

function createLocalChatKey(): LocalChatKey {
  const seed = Crypto.getRandomBytes(32);
  const keyPair = nacl.box.keyPair.fromSecretKey(seed);
  return {
    keyId: randomKeyId(),
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
    algorithmVersion: CHAT_E2EE_ALGORITHM,
    createdAt: new Date().toISOString(),
  };
}

async function persistLocalChatKey(key: LocalChatKey): Promise<void> {
  await AsyncStorage.setItem(CHAT_E2EE_LOCAL_KEY_STORAGE, JSON.stringify(key));
}

async function rotateLocalChatKey(): Promise<LocalChatKey> {
  const created = createLocalChatKey();
  await persistLocalChatKey(created);
  return created;
}

function isSelfKey(
  role: ChatRole,
  userId: string,
  key: ChatParticipantKey,
  localKeyId?: string,
): boolean {
  if (localKeyId && key.keyId === localKeyId) return true;
  const id = Number(userId);
  if (Number.isNaN(id)) return false;
  if (role === 'agent') {
    return key.recipientType === 'AGENT' && key.recipientId === id;
  }
  return key.recipientType === 'CLIENT_PROFILE' && key.recipientId === id;
}

function getDirectPeerKey(
  role: ChatRole,
  userId: string,
  keys: ChatParticipantKey[],
  localKeyId?: string,
): ChatParticipantKey | null {
  return keys.find((k) => !isSelfKey(role, userId, k, localKeyId) && !k.revokedAt) ?? null;
}

function isOwnMessageForDecrypt(
  role: ChatRole,
  userId: string,
  localKey: LocalChatKey,
  message: ChatMessage,
): boolean {
  if (message.senderKeyId && message.senderKeyId === localKey.keyId) {
    return true;
  }

  const numericUserId = Number(userId);
  if (Number.isNaN(numericUserId)) return false;
  if (role === 'agent') return message.senderAgentId === numericUserId;
  return message.senderClientProfileId === numericUserId;
}

function resolvePeerPublicKeyForDecrypt(
  role: ChatRole,
  userId: string,
  keysById: Map<string, ChatParticipantKey>,
  localKey: LocalChatKey,
  message: ChatMessage,
): string | null {
  const activeKeys = [...keysById.values()].filter((k) => !k.revokedAt);

  if (isOwnMessageForDecrypt(role, userId, localKey, message)) {
    const peer = getDirectPeerKey(role, userId, activeKeys, localKey.keyId);
    return peer?.publicKey ?? null;
  }

  if (message.senderKeyId) {
    const senderKey = keysById.get(message.senderKeyId);
    if (senderKey?.publicKey) return senderKey.publicKey;
  }

  // Fallback for sessions where senderKeyId lookup is temporarily missing
  // but the current peer active key is available.
  const peer = getDirectPeerKey(role, userId, activeKeys, localKey.keyId);
  return peer?.publicKey ?? null;
}

export async function getOrCreateLocalChatKey(): Promise<LocalChatKey> {
  const raw = await AsyncStorage.getItem(CHAT_E2EE_LOCAL_KEY_STORAGE);
  if (raw) {
    const parsed = JSON.parse(raw) as LocalChatKey;
    if (parsed?.keyId && parsed?.publicKey && parsed?.secretKey) {
      return parsed;
    }
  }

  const created = createLocalChatKey();
  await persistLocalChatKey(created);
  return created;
}

export async function ensureRegisteredChatKey(role: ChatRole): Promise<LocalChatKey> {
  let localKey = await getOrCreateLocalChatKey();
  if (registeredKeyIdsByRole[role] === localKey.keyId) {
    return localKey;
  }

  try {
    await upsertMyChatKey(role, {
      keyId: localKey.keyId,
      publicKey: localKey.publicKey,
      algorithmVersion: localKey.algorithmVersion,
    });
  } catch (error) {
    if (!isKeyRegistrationConflict(error)) {
      throw error;
    }

    // If keyId is already in use (e.g. account/session switched across apps),
    // rotate local key material and retry once with a fresh key id.
    localKey = await rotateLocalChatKey();
    await upsertMyChatKey(role, {
      keyId: localKey.keyId,
      publicKey: localKey.publicKey,
      algorithmVersion: localKey.algorithmVersion,
    });
  }

  registeredKeyIdsByRole[role] = localKey.keyId;
  return localKey;
}

export async function buildEncryptedMessagePayload(
  role: ChatRole,
  userId: string,
  conversationId: string,
  plaintext: string,
  dedupeKey: string,
): Promise<SendChatMessageRequest> {
  const localKey = await ensureRegisteredChatKey(role);
  const keys = await listConversationKeys(role, conversationId);

  const peerKey = getDirectPeerKey(role, userId, keys, localKey.keyId);
  if (!peerKey) {
    throw new Error('Recipient encryption key is unavailable.');
  }

  const sharedSecret = nacl.box.before(decodeBase64(peerKey.publicKey), decodeBase64(localKey.secretKey));
  const nonce = Crypto.getRandomBytes(24);
  const ciphertext = nacl.box.after(naclUtil.decodeUTF8(plaintext), nonce, sharedSecret);

  return {
    ciphertext: encodeBase64(ciphertext),
    senderKeyId: localKey.keyId,
    algorithmVersion: CHAT_E2EE_ALGORITHM,
    nonce: encodeBase64(nonce),
    dedupeKey,
  };
}

function decryptSingleMessage(
  role: ChatRole,
  userId: string,
  keysById: Map<string, ChatParticipantKey>,
  localKey: LocalChatKey,
  message: ChatMessage,
): ChatMessage {
  if (!message.ciphertext || message.algorithmVersion === 'NONE') return message;
  if (message.algorithmVersion !== CHAT_E2EE_ALGORITHM) {
    return { ...message, ciphertext: 'Encrypted message' };
  }
  if (!message.nonce) {
    return { ...message, ciphertext: 'Encrypted message' };
  }

  const peerPublicKey = resolvePeerPublicKeyForDecrypt(
    role,
    userId,
    keysById,
    localKey,
    message,
  );

  if (!peerPublicKey) {
    return { ...message, ciphertext: 'Encrypted message' };
  }

  try {
    const sharedSecret = nacl.box.before(decodeBase64(peerPublicKey), decodeBase64(localKey.secretKey));
    const opened = nacl.box.open.after(
      decodeBase64(message.ciphertext),
      decodeBase64(message.nonce),
      sharedSecret,
    );
    if (!opened) {
      return { ...message, ciphertext: 'Encrypted message' };
    }
    return {
      ...message,
      ciphertext: naclUtil.encodeUTF8(opened),
      algorithmVersion: 'NONE',
      nonce: null,
    };
  } catch {
    return { ...message, ciphertext: 'Encrypted message' };
  }
}

export async function decryptConversationMessages(
  role: ChatRole,
  userId: string,
  conversationId: string,
  messages: ChatMessage[],
): Promise<ChatMessage[]> {
  if (messages.length === 0) return messages;

  const hasEncrypted = messages.some((m) => m.algorithmVersion !== 'NONE');
  if (!hasEncrypted) return messages;

  const localKey = await ensureRegisteredChatKey(role);
  const keys = await listConversationKeys(role, conversationId);

  const keysById = new Map(keys.map((k) => [k.keyId, k]));
  return messages.map((message) => {
    try {
      return decryptSingleMessage(role, userId, keysById, localKey, message);
    } catch {
      // Never let a single bad message crash the whole conversation.
      return { ...message, ciphertext: '🔒 Message from a previous session', algorithmVersion: 'NONE', nonce: null };
    }
  });
}
