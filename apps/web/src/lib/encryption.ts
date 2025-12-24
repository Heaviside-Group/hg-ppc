/**
 * AES-256-GCM encryption utilities for secure token storage.
 *
 * Used to encrypt OAuth tokens before storing in the database.
 * The Python worker uses a compatible implementation for decryption.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard IV length
const AUTH_TAG_LENGTH = 16

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @returns Object containing base64-encoded encrypted blob, IV, and auth tag
 */
export function encrypt(plaintext: string): {
  encryptedBlob: string
  iv: string
  authTag: string
} {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  return {
    encryptedBlob: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

/**
 * Decrypt an encrypted blob using AES-256-GCM.
 *
 * @param encryptedBlob - Base64-encoded encrypted data
 * @param iv - Base64-encoded initialization vector
 * @param authTag - Base64-encoded authentication tag
 * @returns Decrypted plaintext string
 */
export function decrypt(
  encryptedBlob: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  let decrypted = decipher.update(Buffer.from(encryptedBlob, 'base64'))
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Encrypt a JavaScript object as JSON.
 *
 * @param data - Object to encrypt
 * @returns Encrypted result
 */
export function encryptJson<T extends object>(data: T): {
  encryptedBlob: string
  iv: string
  authTag: string
} {
  return encrypt(JSON.stringify(data))
}

/**
 * Decrypt an encrypted blob back to a JavaScript object.
 *
 * @param encryptedBlob - Base64-encoded encrypted data
 * @param iv - Base64-encoded initialization vector
 * @param authTag - Base64-encoded authentication tag
 * @returns Decrypted object
 */
export function decryptJson<T>(
  encryptedBlob: string,
  iv: string,
  authTag: string
): T {
  const plaintext = decrypt(encryptedBlob, iv, authTag)
  return JSON.parse(plaintext) as T
}

/**
 * Get the encryption key from environment variable.
 * Key must be a 64-character hex string (32 bytes).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes), got ${keyHex.length} characters`
    )
  }

  // Validate it's valid hex
  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be a valid hexadecimal string')
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Generate a new encryption key (for setup purposes only).
 *
 * @returns A 64-character hex string suitable for ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
