/**
 * 众像美术馆 - JWT 认证中间件
 */
const jwt = require('jsonwebtoken')
const { getDB } = require('../db/init')

const JWT_SECRET = process.env.JWT_SECRET || 'museum_gallery_2026_secret_key'

/**
 * 生成 JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

/**
 * 验证 JWT - 必须登录
 */
function authRequired(req, res, next) {
  var auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录', code: 'NO_TOKEN' })
  }
  try {
    var decoded = jwt.verify(auth.slice(7), JWT_SECRET)
    var db = getDB()
    var user = db.prepare('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?').get(decoded.id)
    if (!user) return res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' })
    req.user = user
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token 无效或已过期', code: 'INVALID_TOKEN' })
  }
}

/**
 * 可选登录 - 有 token 就解析，没有也放行
 */
function authOptional(req, res, next) {
  var auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      var decoded = jwt.verify(auth.slice(7), JWT_SECRET)
      var db = getDB()
      var user = db.prepare('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?').get(decoded.id)
      if (user) req.user = user
    } catch (e) { /* ignore */ }
  }
  next()
}

/**
 * 仅管理员
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限', code: 'FORBIDDEN' })
  }
  next()
}

module.exports = { generateToken, authRequired, authOptional, adminOnly }
