// Helper function to generate a random string for the code verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Helper function to compute SHA-256 hash
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

// Helper function to Base64URL encode a buffer
function base64urlencode(a: ArrayBuffer): string {
  // @ts-ignore
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Exported function to generate a code verifier
export function generateCodeVerifier(): string {
  return generateRandomString(128);
}

// Exported function to generate a code challenge from a verifier
export async function generateCodeChallenge(v: string): Promise<string> {
  const hashed = await sha256(v);
  return base64urlencode(hashed);
}
