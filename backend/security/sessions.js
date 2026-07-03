const crypto = require("node:crypto");

const SESSION_COOKIE_NAME = "smart_home_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSessionToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
  hashSessionToken,
  sessionCookieOptions,
  clearSessionCookieOptions,
};