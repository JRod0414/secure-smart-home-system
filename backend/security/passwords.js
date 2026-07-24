const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_SALT_LENGTH = 16;
const PASSWORD_KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(PASSWORD_SALT_LENGTH).toString("hex");

  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  return {
    salt,
    hash: derivedKey.toString("hex"),
  };
}

async function verifyPassword(password, salt, storedHash) {
  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  const storedKey = Buffer.from(storedHash, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKey, derivedKey);
}

module.exports = {
  hashPassword,
  verifyPassword,
};