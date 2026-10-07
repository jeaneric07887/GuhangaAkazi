const jwt = require('jsonwebtoken')
const { hasJwtSecret, requireJwtSecret } = require('./jwt-secret')

function requireUser(req, res, next) {
  if (!hasJwtSecret()) return requireJwtSecret(req, res, next)

  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) return res.status(401).json({ error: 'Sign in to view your messages.' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'guhangaakazi-api',
      audience: 'user',
    })
    return next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Your sign-in session has ended. Please sign in again.' })
    }
    return next(error)
  }
}

module.exports = { requireUser }
