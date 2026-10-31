const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function encryptionKey() {
  const encoded = process.env["BROKER_CREDENTIALS_ENCRYPTION_KEY"];
  if (!encoded) throw new Error("Broker credential encryption is not configured");
  let raw: ArrayBuffer;
  try {
    const bytes = base64ToBytes(encoded);
    raw = new ArrayBuffer(bytes.length);
    new Uint8Array(raw).set(bytes);
  } catch {
    throw new Error("Broker credential encryption key must be base64 encoded");
  }
  if (raw.byteLength !== 32) throw new Error("Broker credential encryption key must be 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptBrokerCredentials(value: Record<string, string>) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptBrokerCredentials(value: string) {
  const [version, encodedIv, encodedCiphertext, ...extra] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext || extra.length)
    throw new Error("Stored broker credentials have an unsupported format");
  const key = await encryptionKey();
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(encodedIv) },
      key,
      base64ToBytes(encodedCiphertext),
    );
  } catch {
    throw new Error("Stored broker credentials could not be decrypted");
  }
  const parsed: unknown = JSON.parse(decoder.decode(plaintext));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Stored broker credentials are invalid");
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
