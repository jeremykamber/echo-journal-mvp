// filepath: src/services/encryptionService.ts
// Service for End-to-End Encryption using Web Crypto API.

const ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-256';
const ITERATIONS = 100000;
const IV_SIZE_BYTES = 12; // 96 bits for AES-GCM
const ENCRYPTION_PREFIX = '::ENC::';

// Cache keys by user ID to avoid repeated slow key derivation (PBKDF2)
const keyCache = new Map<string, CryptoKey>();
let sessionPassword: string | null = null;

/**
 * Derives a cryptographic key from a password and a salt (userId).
 * This is a slow operation (~50-100ms) and should be cached.
 */
async function deriveKey(password: string, saltString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  // Use userId as salt. Pad or hash it to ensure 16 bytes?
  // PBKDF2 can take any salt length, but 16 bytes is recommended minimum.
  // We'll hash the saltString (userId) to get a consistent bytes array.
  const saltBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(saltString));

  return window.crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: saltBuffer, // Use the hash of userId as salt
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    passwordKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plain text efficiently using a cached key.
 * Format: ::ENC::base64(iv):base64(ciphertext)
 */
export async function encryptText(text: string, userId: string): Promise<string> {
  try {
    if (!text) return text;
    const pass = sessionPassword;
    if (!pass) throw new Error('Encryption enabled but no password set');

    // Get or derive key
    let key = keyCache.get(userId);
    if (!key) {
      key = await deriveKey(pass, userId);
      keyCache.set(userId, key);
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE_BYTES));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );

    const ivB64 = arrayBufferToBase64(iv);
    const ciphertextB64 = arrayBufferToBase64(new Uint8Array(ciphertext));

    return `${ENCRYPTION_PREFIX}${ivB64}:${ciphertextB64}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

/**
 * Decrypts text using cached key.
 */
export async function decryptText(encryptedText: string, userId: string): Promise<string> {
  try {
    if (!isEncrypted(encryptedText)) return encryptedText;

    const parts = encryptedText.substring(ENCRYPTION_PREFIX.length).split(':');
    // Expect IV:Ciphertext (2 parts)
    // Previous version had Salt:IV:Ciphertext (3 parts). 
    // We should handle backward compatibility if I had released it, but I haven't.
    // But wait, user might have old data if they used the app while I was testing? 
    // No, this is first deploy of E2EE.
    if (parts.length !== 2) {
      // Check if it's the old 3-part format locally created? 
      // Just fail or return text.
      throw new Error('Invalid encryption format');
    }

    const [ivB64, ciphertextB64] = parts;
    const iv = base64ToArrayBuffer(ivB64);
    const ciphertext = base64ToArrayBuffer(ciphertextB64);

    const pass = sessionPassword;
    if (!pass) throw new Error('Password required for decryption');

    let key = keyCache.get(userId);
    if (!key) {
      key = await deriveKey(pass, userId);
      keyCache.set(userId, key);
    }

    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    // console.error('Decryption failed:', error);
    // Fail gracefully? Or re-throw?
    throw error;
  }
}

export function isEncrypted(text: string): boolean {
  return text && text.startsWith(ENCRYPTION_PREFIX);
}

// Helper functions (same as before)
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

// Session Management
export function setSessionPassword(password: string) {
  sessionPassword = password;
  // Clear cache on password change to force re-derivation
  keyCache.clear();
}

export function getCachedPassword(): string | null {
  return sessionPassword;
}

export function clearSessionPassword() {
  sessionPassword = null;
  keyCache.clear();
}
