// E2E Encryption using Web Crypto API (ECDH + AES-GCM)
// No libraries needed — built into every modern browser

// Generate a new ECDH key pair
export async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

// Export public key to send to peer (as base64 string)
export async function exportPublicKey(keyPair) {
  const raw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Import peer's public key from base64 string
export async function importPublicKey(base64) {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'spki', raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true, []
  );
}

// Derive a shared AES-GCM key from our private key + peer's public key
export async function deriveSharedKey(myKeyPair, peerPublicKey) {
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message with the shared key
export async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  // Combine iv + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a message with the shared key
export async function decryptMessage(sharedKey, base64) {
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
