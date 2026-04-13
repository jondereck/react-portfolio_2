import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export const MIN_PASSWORD_LENGTH = 12;

export function validatePasswordPolicy(password: string) {
  return typeof password === 'string' && password.trim().length >= MIN_PASSWORD_LENGTH;
}

export function hashPassword(password: string) {
  if (!validatePasswordPolicy(password)) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptSync(password, salt, KEY_BYTES).toString('hex');
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  const [prefix, salt, hash] = storedHash.split('$');
  if (prefix !== PASSWORD_PREFIX || !salt || !hash) {
    return false;
  }

  const inputHash = scryptSync(password, salt, KEY_BYTES);
  const targetHash = Buffer.from(hash, 'hex');
  if (inputHash.length !== targetHash.length) {
    return false;
  }

  return timingSafeEqual(inputHash, targetHash);
}
