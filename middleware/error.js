/**
 * 众像美术馆 - 统一错误处理中间件
 * 参考 FastAPI 模式的集中错误处理
 */

/**
 * 404 未找到
 */
function notFoundHandler(req, res) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: '接口不存在', code: 'NOT_FOUND' })
  }
  // 非 API 路径返回前端 index.html（SPA 路由）
  var distDir = require('../config').config.PUBLIC_DIR
  var fs = require('fs')
  var indexPath = distDir + '/index.html'
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

/**
 * 全局错误处理（放在所有路由之后）
 */
function errorHandler(err, req, res, next) {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message)

  // Multer 文件上传错误
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: '文件上传错误: ' + err.message, code: 'UPLOAD_ERROR' })
  }

  // JSON 解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体格式错误', code: 'INVALID_JSON' })
  }

  // 请求体过大
  if (err.status === 413 || (err.type && err.type.indexOf('entity.too.large') !== -1)) {
    return res.status(413).json({ error: '请求体过大', code: 'PAYLOAD_TOO_LARGE' })
  }

  // JWT 错误（兜底，正常应在 auth.js 中处理）
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token 无效或已过期', code: 'INVALID_TOKEN' })
  }

  // 生产环境隐藏堆栈
  var isDev = require('../config').config.NODE_ENV !== 'production'

  res.status(500).json({
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
    detail: isDev ? err.message : undefined
  })
}

module.exports = { notFoundHandler, errorHandler }
