/**
 * 众像美术馆 - 安全模块
 * 参考 FastAPI full-stack-fastapi-template 的 core/security.py 模式
 *
 * 集中管理所有安全相关操作：JWT 签发/验证、密码哈希/比对
 */
var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')
var { config } = require('./config')

var _secret = config.JWT_SECRET

/**
 * 生成 JWT Token
 */
function createAccessToken(user) {
  var payload = {
    id: user.id,
    username: user.username,
    role: user.role
  }
  return jwt.sign(payload, _secret, { expiresIn: config.JWT_EXPIRES_IN })
}

/**
 * 解码并验证 JWT Token，返回 payload 或抛出异常
 */
function verifyAccessToken(token) {
  return jwt.verify(token, _secret)
}

/**
 * 密码哈希
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, config.BCRYPT_ROUNDS)
}

/**
 * 密码比对
 */
function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed)
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  hashPassword,
  verifyPassword
}
