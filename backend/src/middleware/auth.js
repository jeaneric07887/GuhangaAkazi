const jwt = require('jsonwebtoken')
const { hasJwtSecret, requireJwtSecret } = require('./jwt-secret')

function requireAdmin(req, res, next) {
  if (!hasJwtSecret()) return requireJwtSecret(req, res, next)

  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    return res.status(401).json({ error: 'Sign in as an admin to continue.' })
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'guhangaakazi-api',
      audience: 'admin',
    })
    return next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Your admin session has ended or your sign-in details are not valid.' })
    }
    return next(error)
  }
}

module.exports = { requireAdmin }
