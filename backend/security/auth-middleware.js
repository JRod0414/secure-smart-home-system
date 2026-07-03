const {
  SESSION_COOKIE_NAME,
  hashSessionToken,
} = require("./sessions");

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

function createAuthMiddleware(db) {
    const findSessionWithUser = db.prepare(`
    SELECT
        sessions.id AS session_id,
        sessions.expires_at,
        users.id,
        users.username,
        users.role,
        users.disabled_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
    `);

    const updateSessionLastSeen = db.prepare(`
    UPDATE sessions
    SET last_seen_at = ?
    WHERE id = ?
    `);

    const deleteSessionById = db.prepare(`
    DELETE FROM sessions
    WHERE id = ?
    `);

    function loadCurrentUser(req, res, next) {
    const sessionToken = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
        req.user = null;
        return next();
    }

    const tokenHash = hashSessionToken(sessionToken);
    const session = findSessionWithUser.get(tokenHash);

    if (!session) {
        req.user = null;
        res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
        return next();
    }

    const expired = new Date(session.expires_at) <= new Date();

    if (expired || session.disabled_at) {
        deleteSessionById.run(session.session_id);

        req.user = null;
        res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
        return next();
    }

    updateSessionLastSeen.run(
        new Date().toISOString(),
        session.session_id
    );

    req.user = publicUser(session);
    req.sessionId = session.session_id;

    next();
    }

    function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
        error: "Authentication required.",
        });
    }

    next();
    }

  return {
    loadCurrentUser,
    requireAuth,
    deleteSessionById,
  };
}

module.exports = {
  createAuthMiddleware,
  publicUser,
};