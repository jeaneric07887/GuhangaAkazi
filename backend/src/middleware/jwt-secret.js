function hasJwtSecret() {
  return typeof process.env.JWT_SECRET === 'string' && process.env.JWT_SECRET.length >= 32
}

function requireJwtSecret(_req, res, next) {
  if (!hasJwtSecret()) {
    return res.status(503).json({
      error: 'Authentication is unavailable because JWT_SECRET is not configured.',
    })
  }
  return next()
}

module.exports = { hasJwtSecret, requireJwtSecret }
