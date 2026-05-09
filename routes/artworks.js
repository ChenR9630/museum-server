/**
 * 众像美术馆 - 作品路由
 * GET    /api/artworks           作品列表（支持分类筛选、分页）
 * GET    /api/artworks/:id       作品详情
 * POST   /api/artworks           上传作品（需登录）
 * PUT    /api/artworks/:id       更新作品
 * DELETE /api/artworks/:id       删除作品
 * POST   /api/artworks/:id/like  点赞/取消点赞
 * GET    /api/artworks/:id/comments  作品评论列表
 * POST   /api/artworks/:id/comments  发表评论
 */
var express = require('express')
var multer = require('multer')
var path = require('path')
var { config } = require('../config')
var { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
var { authRequired, authOptional } = require('../middleware/auth')

var router = express.Router()

// ============ 文件上传配置 ============
var UPLOAD_BASE = path.join(config.DATA_DIR, 'uploads')

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var dir = path.join(UPLOAD_BASE, 'artworks')
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

// ============ 作品列表 ============
router.get('/', asyncHandler(async function(req, res) {
  var category = req.query.category
  var exhibitionId = req.query.exhibition_id
  var userId = req.query.user_id
  var isUserUpload = req.query.is_user_upload
  var page = Math.max(1, parseInt(req.query.page) || 1)
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var offset = (page - 1) * limit

  var where = []
  var params = []
  if (category && category !== '全部') { where.push('category = ?'); params.push(category) }
  if (exhibitionId) { where.push('exhibition_id = ?'); params.push(exhibitionId) }
  if (userId) { where.push('user_id = ?'); params.push(userId) }
  if (isUserUpload !== undefined) { where.push('is_user_upload = ?'); params.push(isUserUpload ? 1 : 0) }

  var whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : ''

  var countResult = await queryOne('SELECT COUNT(*) as count FROM artworks' + whereClause, params)
  var total = countResult.count

  var items = await queryAll(
    'SELECT * FROM artworks' + whereClause + ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
    params
  )

  items.forEach(function(item) {
    try { item.tags = JSON.parse(item.tags || '[]') } catch(e) { item.tags = [] }
  })

  res.json({ items: items, total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit) })
}))

// ============ 作品详情 ============
router.get('/:id', authOptional, asyncHandler(async function(req, res) {
  var artwork = await queryOne('SELECT * FROM artworks WHERE id = ?', [req.params.id])
  if (!artwork) return res.status(404).json({ error: '作品不存在' })

  if (req.user) {
    await run('INSERT OR IGNORE INTO view_history (user_id, artwork_id) VALUES (?, ?)', [req.user.id, artwork.id])
    await run('UPDATE users SET stats_view = stats_view + 1 WHERE id = ?', [req.user.id])
  }

  if (req.user) {
    var liked = await queryOne('SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'artwork', artwork.id])
    var faved = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'artwork', artwork.id])
    artwork.is_liked = !!liked
    artwork.is_favorited = !!faved
  } else {
    artwork.is_liked = false
    artwork.is_favorited = false
  }

  if (artwork.exhibition_id) {
    artwork.exhibition = await queryOne('SELECT id, title, emoji FROM exhibitions WHERE id = ?', [artwork.exhibition_id])
  }

  res.json(artwork)
}))

// ============ 上传作品 ============
router.post('/', authRequired, upload.single('image'), asyncHandler(async function(req, res) {
  if (!req.file) return res.status(400).json({ error: '请上传图片' })
  var body = req.body
  if (!body.title || !body.title.trim()) return res.status(400).json({ error: '作品名称不能为空' })

  var imageUrl = '/uploads/artworks/' + req.file.filename
  var result = await run(
    'INSERT INTO artworks (title, artist, year, category, image_url, description, is_user_upload, slot_index, upload_time, user_id, likes, comments_count) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 0)',
    [body.title.trim(), body.artist || req.user.nickname || req.user.username, body.year || new Date().getFullYear().toString(),
     body.category || '油画', imageUrl, body.description || '', body.slot_index !== undefined ? parseInt(body.slot_index) : -1,
     new Date().toISOString(), req.user.id]
  )

  var artwork = await queryOne('SELECT * FROM artworks WHERE id = ?', [result.lastInsertRowid])
  res.status(201).json(artwork)
}))

// ============ 更新作品 ============
router.put('/:id', authRequired, asyncHandler(async function(req, res) {
  var artwork = await queryOne('SELECT * FROM artworks WHERE id = ?', [req.params.id])
  if (!artwork) return res.status(404).json({ error: '作品不存在' })
  if (artwork.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权修改此作品' })

  var body = req.body
  await run(
    'UPDATE artworks SET title = ?, artist = ?, year = ?, category = ?, description = ?, slot_index = ?, updated_at = datetime("now","localtime") WHERE id = ?',
    [body.title || artwork.title, body.artist || artwork.artist, body.year || artwork.year, body.category || artwork.category,
     body.description !== undefined ? body.description : artwork.description, body.slot_index !== undefined ? parseInt(body.slot_index) : artwork.slot_index, artwork.id]
  )

  var updated = await queryOne('SELECT * FROM artworks WHERE id = ?', [artwork.id])
  res.json(updated)
}))

// ============ 删除作品 ============
router.delete('/:id', authRequired, asyncHandler(async function(req, res) {
  var artwork = await queryOne('SELECT * FROM artworks WHERE id = ?', [req.params.id])
  if (!artwork) return res.status(404).json({ error: '作品不存在' })
  if (artwork.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权删除此作品' })

  if (artwork.image_url) {
    var fs = require('fs')
    var filePath = path.join(__dirname, '..', artwork.image_url)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  await run('DELETE FROM artworks WHERE id = ?', [artwork.id])
  res.json({ message: '作品已删除' })
}))

// ============ 点赞/取消点赞 ============
router.post('/:id/like', authRequired, asyncHandler(async function(req, res) {
  var artwork = await queryOne('SELECT id, likes FROM artworks WHERE id = ?', [req.params.id])
  if (!artwork) return res.status(404).json({ error: '作品不存在' })

  var existing = await queryOne('SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'artwork', artwork.id])

  if (existing) {
    await run('DELETE FROM likes WHERE id = ?', [existing.id])
    await run('UPDATE artworks SET likes = MAX(0, likes - 1) WHERE id = ?', [artwork.id])
    res.json({ liked: false, likes: artwork.likes - 1 })
  } else {
    await run('INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)', [req.user.id, 'artwork', artwork.id])
    await run('UPDATE artworks SET likes = likes + 1 WHERE id = ?', [artwork.id])
    await run('UPDATE users SET stats_like = stats_like + 1 WHERE id = ?', [req.user.id])
    res.json({ liked: true, likes: artwork.likes + 1 })
  }
}))

// ============ 作品评论列表 ============
router.get('/:id/comments', asyncHandler(async function(req, res) {
  var comments = await queryAll(
    'SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.target_type = ? AND c.target_id = ? ORDER BY c.created_at DESC',
    ['artwork', req.params.id]
  )
  res.json(comments)
}))

// ============ 发表评论 ============
router.post('/:id/comments', authRequired, asyncHandler(async function(req, res) {
  var content = (req.body.content || '').trim()
  if (!content) return res.status(400).json({ error: '评论内容不能为空' })

  var artwork = await queryOne('SELECT id FROM artworks WHERE id = ?', [req.params.id])
  if (!artwork) return res.status(404).json({ error: '作品不存在' })

  var result = await run('INSERT INTO comments (user_id, target_type, target_id, content) VALUES (?, ?, ?, ?)',
    [req.user.id, 'artwork', artwork.id, content])
  await run('UPDATE artworks SET comments_count = comments_count + 1 WHERE id = ?', [artwork.id])

  var comment = await queryOne('SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?', [result.lastInsertRowid])
  res.status(201).json(comment)
}))

module.exports = router
