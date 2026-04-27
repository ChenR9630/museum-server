/**
 * 众像美术馆 - 用户认证路由
 * POST /api/auth/register  注册
 * POST /api/auth/login     登录
 * GET  /api/auth/me        当前用户信息
 * PUT  /api/auth/profile   更新个人资料
 */
const express = require('express')
const bcrypt = require('bcryptjs')
const { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
const { generateToken, authRequired } = require('../middleware/auth')

var router = express.Router()

// 注册
router.post('/register', asyncHandler(async function(req, res) {
  var body = req.body
  if (!body.username || !body.password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  if (body.username.length < 2 || body.username.length > 20) {
    return res.status(400).json({ error: '用户名长度2-20位' })
  }
  if (body.password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }
  var existing = await queryOne('SELECT id FROM users WHERE username = ?', [body.username])
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' })
  }
  var hash = bcrypt.hashSync(body.password, 10)
  var nickname = body.nickname || body.username
  var result = await run(
    'INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)',
    [body.username, hash, nickname, body.avatar || '', body.role || 'visitor']
  )
  var user = await queryOne(
    'SELECT id, username, nickname, avatar, role, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  )
  var token = generateToken(user)
  res.json({ user: user, token: token })
}))

// 登录
router.post('/login', asyncHandler(async function(req, res) {
  var body = req.body
  if (!body.username || !body.password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  var user = await queryOne('SELECT * FROM users WHERE username = ?', [body.username])
  if (!user || !bcrypt.compareSync(body.password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  var safeUser = {
    id: user.id, username: user.username, nickname: user.nickname,
    avatar: user.avatar, role: user.role, created_at: user.created_at
  }
  var token = generateToken(safeUser)
  res.json({ user: safeUser, token: token })
}))

// 获取当前用户信息
router.get('/me', authRequired, asyncHandler(async function(req, res) {
  var user = await queryOne(
    'SELECT id, username, nickname, avatar, bio, role, stats_fav, stats_view, stats_like, stats_exhibit, created_at FROM users WHERE id = ?',
    [req.user.id]
  )
  if (!user) return res.status(404).json({ error: '用户不存在' })
  var achievements = await queryAll(
    'SELECT a.*, ua.unlocked_at FROM achievements a JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id = ?',
    [req.user.id]
  )
  user.achievements = achievements
  res.json(user)
}))

// 更新个人资料
router.put('/profile', authRequired, asyncHandler(async function(req, res) {
  var body = req.body
  await run(
    'UPDATE users SET nickname = ?, avatar = ?, bio = ?, updated_at = datetime("now","localtime") WHERE id = ?',
    [body.nickname || '', body.avatar || '', body.bio || '', req.user.id]
  )
  var user = await queryOne(
    'SELECT id, username, nickname, avatar, bio, role, stats_fav, stats_view, stats_like, stats_exhibit FROM users WHERE id = ?',
    [req.user.id]
  )
  res.json(user)
}))

module.exports = router
