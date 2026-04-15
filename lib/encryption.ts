import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a single base64 string in the format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack as iv:authTag:ciphertext (all hex encoded)
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Decrypts a string previously encrypted with encrypt().
 * Throws on any authentication failure — do not swallow this error.
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format: expected iv:authTag:data')
  }

  const [ivHex, tagHex, dataHex] = parts
  const iv      = Buffer.from(ivHex,  'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const data    = Buffer.from(dataHex,'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

function getEncryptionKey(): Buffer {
  const hex = process.env.PROPERTY_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'PROPERTY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}
