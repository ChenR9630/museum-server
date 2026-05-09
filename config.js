/**
 * 众像美术馆 - 统一配置中心
 * 参考 FastAPI full-stack-fastapi-template 的 core/config.py 模式
 *
 * 所有环境变量在这里集中读取和管理，
 * 各模块通过 require('./config') 获取配置，禁止直接读 process.env
 */
require('dotenv').config()

var path = require('path')

// ============ 项目基础 ============
var config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,

  // ============ 安全 ============
  JWT_SECRET: process.env.JWT_SECRET || 'museum_gallery_2026_dev_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 10,

  // ============ 数据库 ============
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, 'data'),
  DB_NAME: process.env.DB_NAME || 'museum.db',

  // ============ 上传 ============
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB

  // ============ 前端 ============
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  PUBLIC_DIR: process.env.PUBLIC_DIR || path.join(__dirname, 'public'),

  // ============ CORS 白名单 ============
  CORS_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://museum-app-theta.vercel.app',
    'https://www.zxmeishu.fun'
  ]
}

// 生产环境自动加入 FRONTEND_URL
if (config.FRONTEND_URL && config.CORS_ORIGINS.indexOf(config.FRONTEND_URL) === -1) {
  config.CORS_ORIGINS.push(config.FRONTEND_URL)
}

// ============ 启动校验 ============
function validateConfig() {
  var warnings = []

  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET === 'museum_gallery_2026_dev_key') {
      warnings.push('⚠️  JWT_SECRET 使用默认值，生产环境请设置强密钥')
    }
  }

  if (warnings.length > 0) {
    console.warn('')
    warnings.forEach(function(w) { console.warn('  ' + w) })
    console.warn('')
  }

  return warnings.length === 0
}

module.exports = { config, validateConfig }
