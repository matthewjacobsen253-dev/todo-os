import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Encryption", () => {
  const TEST_KEY = "a".repeat(64); // 32 bytes in hex

  beforeEach(() => {
    vi.stubEnv("EMAIL_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("encrypts and decrypts roundtrip correctly", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "my-secret-refresh-token-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const plaintext = "same-input";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("fails to decrypt with wrong key", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("secret");

    // Change the key
    vi.stubEnv("EMAIL_ENCRYPTION_KEY", "b".repeat(64));
    vi.resetModules();
    const { decrypt } = await import("@/lib/encryption");

    expect(() => decrypt(encrypted)).toThrow();
  });

  it("throws when key is not set", async () => {
    vi.stubEnv("EMAIL_ENCRYPTION_KEY", "");
    vi.resetModules();
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("EMAIL_ENCRYPTION_KEY");
  });
});
