import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("EMAIL_ENCRYPTION_KEY environment variable is not set");
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    );
  }
  return keyBuffer;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a hex string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * Decrypts a hex string produced by encrypt().
 */
export function decrypt(encryptedHex: string): string {
  const key = getKey();

  const iv = Buffer.from(encryptedHex.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedHex.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2),
    "hex",
  );
  const ciphertext = encryptedHex.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
