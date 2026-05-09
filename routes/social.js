/**
 * 众像美术馆 - 社交路由
 * GET    /api/social/posts            帖子列表
 * POST   /api/social/posts            发帖（需登录）
 * DELETE /api/social/posts/:id        删帖
 * POST   /api/social/posts/:id/like   点赞帖子
 * GET    /api/social/posts/:id/comments  帖子评论
 * POST   /api/social/posts/:id/comments  发表评论
 * GET    /api/social/danmaku          弹幕列表
 * POST   /api/social/danmaku          发送弹幕
 */
var express = require('express')
var multer = require('multer')
var path = require('path')
var { config } = require('../config')
var { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
var { authRequired, authOptional } = require('../middleware/auth')

var router = express.Router()

// ============ 帖子图片上传 ============
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var dir = path.join(__dirname, '..', 'uploads', 'posts')
    var fs = require('fs')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext)
  }
})
var upload = multer({
  storage: storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: function(req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('仅支持图片文件'), false)
  }
})

// ============ 帖子列表 ============
router.get('/posts', authOptional, asyncHandler(async function(req, res) {
  var page = Math.max(1, parseInt(req.query.page) || 1)
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var offset = (page - 1) * limit

  var totalResult = await queryOne('SELECT COUNT(*) as count FROM posts')
  var total = totalResult.count

  var posts = await queryAll(
    'SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset
  )

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i]
    try { post.images = JSON.parse(post.images || '[]') } catch(e) { post.images = [] }
    try { post.tags = JSON.parse(post.tags || '[]') } catch(e) { post.tags = [] }
    if (req.user) {
      var liked = await queryOne('SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'post', post.id])
      post.is_liked = !!liked
    } else {
      post.is_liked = false
    }
  }

  res.json({ items: posts, total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit) })
}))

// ============ 发帖 ============
router.post('/posts', authRequired, upload.array('images', 9), asyncHandler(async function(req, res) {
  var body = req.body
  if (!body.content || !body.content.trim()) return res.status(400).json({ error: '内容不能为空' })

  var images = (req.files || []).map(function(f) { return '/uploads/posts/' + f.filename })
  var tags = JSON.stringify(body.tags ? (Array.isArray(body.tags) ? body.tags : [body.tags]) : [])

  var result = await run(
    'INSERT INTO posts (user_id, content, images, tags, exhibition_id, location) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, body.content.trim(), JSON.stringify(images), tags, body.exhibition_id ? parseInt(body.exhibition_id) : null, body.location || '']
  )

  var post = await queryOne('SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [result.lastInsertRowid])
  try { post.images = JSON.parse(post.images || '[]') } catch(e) { post.images = [] }
  try { post.tags = JSON.parse(post.tags || '[]') } catch(e) { post.tags = [] }
  post.is_liked = false

  res.status(201).json(post)
}))

// ============ 删帖 ============
router.delete('/posts/:id', authRequired, asyncHandler(async function(req, res) {
  var post = await queryOne('SELECT id, user_id FROM posts WHERE id = ?', [req.params.id])
  if (!post) return res.status(404).json({ error: '帖子不存在' })
  if (post.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权删除此帖子' })

  await run('DELETE FROM comments WHERE target_type = ? AND target_id = ?', ['post', post.id])
  await run('DELETE FROM likes WHERE target_type = ? AND target_id = ?', ['post', post.id])
  await run('DELETE FROM posts WHERE id = ?', [post.id])
  res.json({ message: '帖子已删除' })
}))

// ============ 点赞帖子 ============
router.post('/posts/:id/like', authRequired, asyncHandler(async function(req, res) {
  var post = await queryOne('SELECT id, likes FROM posts WHERE id = ?', [req.params.id])
  if (!post) return res.status(404).json({ error: '帖子不存在' })

  var existing = await queryOne('SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'post', post.id])
  if (existing) {
    await run('DELETE FROM likes WHERE id = ?', [existing.id])
    await run('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?', [post.id])
    res.json({ liked: false, likes: post.likes - 1 })
  } else {
    await run('INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)', [req.user.id, 'post', post.id])
    await run('UPDATE posts SET likes = likes + 1 WHERE id = ?', [post.id])
    res.json({ liked: true, likes: post.likes + 1 })
  }
}))

// ============ 帖子评论列表 ============
router.get('/posts/:id/comments', asyncHandler(async function(req, res) {
  var comments = await queryAll(
    'SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.target_type = ? AND c.target_id = ? ORDER BY c.created_at DESC',
    ['post', req.params.id]
  )
  res.json(comments)
}))

// ============ 发表帖子评论 ============
router.post('/posts/:id/comments', authRequired, asyncHandler(async function(req, res) {
  var content = (req.body.content || '').trim()
  if (!content) return res.status(400).json({ error: '评论内容不能为空' })

  var post = await queryOne('SELECT id FROM posts WHERE id = ?', [req.params.id])
  if (!post) return res.status(404).json({ error: '帖子不存在' })

  var result = await run('INSERT INTO comments (user_id, target_type, target_id, content) VALUES (?, ?, ?, ?)',
    [req.user.id, 'post', post.id, content])
  await run('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [post.id])

  var comment = await queryOne('SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?', [result.lastInsertRowid])
  res.status(201).json(comment)
}))

// ============ 弹幕列表 ============
router.get('/danmaku', asyncHandler(async function(req, res) {
  var danmaku = await queryAll(
    'SELECT c.content as text, u.nickname as author, c.created_at FROM comments c JOIN users u ON c.user_id = u.id WHERE c.target_type = ? ORDER BY c.created_at DESC LIMIT 50',
    ['artwork']
  )
  res.json(danmaku.reverse())
}))

// ============ 发送弹幕 ============
router.post('/danmaku', authRequired, asyncHandler(async function(req, res) {
  var content = (req.body.content || '').trim()
  if (!content) return res.status(400).json({ error: '弹幕内容不能为空' })
  if (content.length > 50) return res.status(400).json({ error: '弹幕最多50字' })

  var artworkId = req.body.artwork_id ? parseInt(req.body.artwork_id) : null
  if (artworkId) {
    await run('INSERT INTO comments (user_id, target_type, target_id, content) VALUES (?, ?, ?, ?)',
      [req.user.id, 'artwork', artworkId, content])
    await run('UPDATE artworks SET comments_count = comments_count + 1 WHERE id = ?', [artworkId])
  }

  res.json({ text: content, author: req.user.nickname, created_at: new Date().toISOString() })
}))

module.exports = router
