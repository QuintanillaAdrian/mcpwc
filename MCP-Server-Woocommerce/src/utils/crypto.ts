import { createDecipheriv } from 'crypto';

/**
 * Descifra un valor cifrado con AES-256-GCM por chatbot-backend.
 *
 * Formato real (ver chatbot-backend/src/services/crypto.ts):
 *   "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * La clave se lee de ENCRYPTION_KEY (hex de 64 chars = 32 bytes) y debe
 * ser IDÉNTICA a la que usa el backend para cifrar.
 */
export function decrypt(ciphertext: string): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno');
  }
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe ser un hex de 64 caracteres (32 bytes)');
  }

  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const key       = Buffer.from(keyHex, 'hex');
  const iv        = Buffer.from(ivHex, 'hex');
  const authTag   = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
