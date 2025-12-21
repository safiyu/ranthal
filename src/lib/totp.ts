import { createHmac, randomBytes } from 'crypto';

// Base32 Alphabet
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Decode Base32 to Buffer
function base32Decode(input: string): Buffer {
    let bits = 0;
    let value = 0;
    let output = Buffer.alloc(Math.ceil((input.length * 5) / 8));
    let index = 0;

    for (const char of input.toUpperCase()) {
        const val = B32_ALPHABET.indexOf(char);
        if (val === -1) continue;

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 0xff;
            bits -= 8;
        }
    }
    return output.subarray(0, index);
}

// Generate Random Secret
export function generateSecret(length: number = 20): string {
    const randomBuffer = randomBytes(length);
    let secret = '';
    for (let i = 0; i < randomBuffer.length; i++) {
        secret += B32_ALPHABET[randomBuffer[i] % 32];
    }
    return secret;
}

// Generate TOTP Token
export function generateToken(secret: string, window: number = 0): string {
    const counter = Math.floor(Date.now() / 30000) + window;
    const counterBuffer = Buffer.alloc(8);

    // Write counter as BigEndian 64-bit integer
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

    const key = base32Decode(secret);
    const hmac = createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dynamic Truncation
    const offset = digest[digest.length - 1] & 0xf;
    const code =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    // 6 Digits
    return (code % 1000000).toString().padStart(6, '0');
}

// Verify Token
export function verifyToken(token: string, secret: string, window: number = 1): boolean {
    if (!token || !secret) return false;

    // Check current window and surrounding windows (drift)
    for (let i = -window; i <= window; i++) {
        const gen = generateToken(secret, i);
        if (gen === token) return true;
    }
    return false;
}
