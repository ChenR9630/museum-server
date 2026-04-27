/**
 * 众像美术馆 - 后端服务主入口
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth')
const artworkRoutes = require('./routes/artworks')
const exhibitionRoutes = require('./routes/exhibitions')
const socialRoutes = require('./routes/social')
const discoverRoutes = require('./routes/discover')
const userRoutes = require('./routes/user')

var app = express()
var PORT = process.env.PORT || 3000

// CORS：开发时允许本地前端，生产时允许 FRONTEND_URL 环境变量配置的域名
var corsOptions = {
  origin: function(origin, callback) {
    var allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL || ''
    ]
    if (!origin || allowed.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, true) // 暂时全部放行，上线后可收紧
    }
  },
  credentials: true
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(function(req, res, next) {
  var start = Date.now()
  res.on('finish', function() {
    console.log((res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m') + res.statusCode + '\x1b[0m ' + req.method + ' ' + req.url + ' ' + (Date.now() - start) + 'ms')
  })
  next()
})

// 上传文件服务：Zeabur 持久化路径优先，本地开发用 ./uploads
var uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))
// 静态文件：优先从 PUBLIC_DIR 环境变量指定的路径提供，否则尝试相对路径
var distDir = process.env.PUBLIC_DIR || path.join(__dirname, 'public')
var fs0 = require('fs')
if (fs0.existsSync(distDir)) {
  app.use(express.static(distDir))
}

app.use('/api/auth', authRoutes)
app.use('/api/artworks', artworkRoutes)
app.use('/api/exhibitions', exhibitionRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/discover', discoverRoutes)
app.use('/api/user', userRoutes)

app.get('/api', function(req, res) {
  res.json({
    name: '众像美术馆 API',
    version: '1.0.0',
    endpoints: {
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

app.get('*', function(req, res) {
  // 只对非 /api 路径返回前端 index.html（SPA 路由）
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' })
  }
  var indexPath = distDir + '/index.html'
  var fs = require('fs')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.json({ status: 'API server running', docs: '/api' })
  }
})

app.use(function(err, req, res, next) {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message)
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: '文件上传错误: ' + err.message })
  }
  res.status(500).json({ error: '服务器内部错误' })
})

async function start() {
  await require('./db/init').getDB()

  app.listen(PORT, function() {
    console.log('')
    console.log('  \x1b[36m众像美术馆后端服务\x1b[0m')
    console.log('  \x1b[90m--------------------------------------------\x1b[0m')
    console.log('  Local:   \x1b[32mhttp://localhost:' + PORT + '\x1b[0m')
    console.log('  API:     \x1b[32mhttp://localhost:' + PORT + '/api\x1b[0m')
    console.log('  Uploads: \x1b[32mhttp://localhost:' + PORT + '/uploads\x1b[0m')
    console.log('')
  })
}

start().catch(function(e) {
  console.error('启动失败:', e)
  process.exit(1)
})
