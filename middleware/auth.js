/**
 * 众像美术馆 - JWT 认证中间件
 *
 * 职责：Express 中间件（解析 token、注入 req.user）
 * JWT 操作委托给 security.js，数据库操作委托给 db/helper.js
 */
var security = require('../security')
var { queryOne } = require('../db/helper')

/**
 * 验证 JWT - 必须登录
 */
function authRequired(req, res, next) {
  var auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录', code: 'NO_TOKEN' })
  }

  var token = auth.slice(7)
  var decoded

  try {
    decoded = security.verifyAccessToken(token)
  } catch (e) {
    return res.status(401).json({ error: 'Token 无效或已过期', code: 'INVALID_TOKEN' })
  }

  // token 解析成功，查用户并注入 req.user
  queryOne('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?', [decoded.id])
    .then(function(user) {
      if (!user) {
        return res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' })
      }
      req.user = user
      next()
    })
    .catch(function() {
      return res.status(500).json({ error: '服务器错误', code: 'INTERNAL_ERROR' })
    })
}

/**
 * 可选登录 - 有 token 就解析，没有也放行
 */
function authOptional(req, res, next) {
  var auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return next()
  }

  var token = auth.slice(7)
  var decoded

  try {
    decoded = security.verifyAccessToken(token)
  } catch (e) {
    return next() // token 无效，当未登录处理
  }

  queryOne('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?', [decoded.id])
    .then(function(user) {
      if (user) req.user = user
      next()
    })
    .catch(function() {
      next() // 数据库错误，当未登录处理
    })
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

module.exports = { createAccessToken: security.createAccessToken, authRequired, authOptional, adminOnly }
