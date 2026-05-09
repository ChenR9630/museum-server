/**
 * 众像美术馆 - 后端服务主入口
 *
 * 启动流程：config → db init → express → routes → listen
 */
var { config, validateConfig } = require('./config')
var express = require('express')
var cors = require('cors')
var path = require('path')
var fs = require('fs')

// ============ Express 应用 ============
var app = express()
var PORT = config.PORT

// ============ 中间件 ============
app.use(cors({
  origin: function(origin, callback) {
    // 无 origin（服务端请求、Postman）直接放行
    if (!origin) return callback(null, true)
    if (config.CORS_ORIGINS.indexOf(origin) !== -1) return callback(null, true)
    // 未匹配的 origin 也放行，但打印警告（上线后可改为 callback(null, false)）
    if (config.NODE_ENV === 'production') {
      return callback(null, true)
    }
    return callback(null, true)
  },
  credentials: true
}))

app.use(express.json({ limit: config.MAX_FILE_SIZE + 'b' }))
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use(function(req, res, next) {
  var start = Date.now()
  res.on('finish', function() {
    var color = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m'
    console.log(color + res.statusCode + '\x1b[0m ' + req.method + ' ' + req.url + ' ' + (Date.now() - start) + 'ms')
  })
  next()
})

// ============ 静态文件 ============
var uploadsDir = path.join(config.DATA_DIR, 'uploads')
app.use('/uploads', express.static(uploadsDir))

var distDir = config.PUBLIC_DIR
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
}

// ============ API 路由 ============
var authRoutes = require('./routes/auth')
var artworkRoutes = require('./routes/artworks')
var exhibitionRoutes = require('./routes/exhibitions')
var socialRoutes = require('./routes/social')
var discoverRoutes = require('./routes/discover')
var userRoutes = require('./routes/user')

app.use('/api/auth', authRoutes)
app.use('/api/artworks', artworkRoutes)
app.use('/api/exhibitions', exhibitionRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/discover', discoverRoutes)
app.use('/api/user', userRoutes)

// ============ 健康检查 ============
app.get('/api/health', function(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API 索引
app.get('/api', function(req, res) {
  res.json({
    name: '众像美术馆 API',
    version: '2.0.0',
    endpoints: {
      health:      '/api/health',
      auth:        '/api/auth',
      artworks:    '/api/artworks',
      exhibitions: '/api/exhibitions',
      social:      '/api/social',
      discover:    '/api/discover',
      user:        '/api/user',
      uploads:     '/uploads'
    }
  })
})

// ============ 错误处理 ============
var errorMiddleware = require('./middleware/error')
app.use('*', errorMiddleware.notFoundHandler)
app.use(errorMiddleware.errorHandler)

// ============ 启动 ============
async function start() {
  // 配置校验
  validateConfig()

  // 数据库初始化
  await require('./db/init').initDB()

  app.listen(PORT, function() {
    console.log('')
    console.log('  \x1b[36m众像美术馆后端服务 v2.0\x1b[0m')
    console.log('  \x1b[90m--------------------------------------------\x1b[0m')
    console.log('  环境:    \x1b[33m' + config.NODE_ENV + '\x1b[0m')
    console.log('  Local:   \x1b[32mhttp://localhost:' + PORT + '\x1b[0m')
    console.log('  API:     \x1b[32mhttp://localhost:' + PORT + '/api\x1b[0m')
    console.log('  Health:  \x1b[32mhttp://localhost:' + PORT + '/api/health\x1b[0m')
    console.log('  Uploads: \x1b[32mhttp://localhost:' + PORT + '/uploads\x1b[0m')
    console.log('')
  })
}

start().catch(function(e) {
  console.error('\x1b[31m启动失败:\x1b[0m', e)
  process.exit(1)
})
