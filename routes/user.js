/**
 * 众像美术馆 - 用户中心路由
 */
const express = require('express')
const { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
const { authRequired } = require('../middleware/auth')

var router = express.Router()

// ============ 用户统计 ============
router.get('/stats', authRequired, asyncHandler(async function(req, res) {
  var userId = req.user.id
  var uploadCount = (await queryOne('SELECT COUNT(*) as count FROM artworks WHERE user_id = ?', [userId])).count
  var postCount = (await queryOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId])).count
  var favCount = (await queryOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId])).count
  var likeCount = (await queryOne('SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND target_type = ?', [userId, 'artwork'])).count
  var receivedResult = await queryOne('SELECT SUM(likes) as total FROM artworks WHERE user_id = ?', [userId])

  res.json({
    uploads: uploadCount, posts: postCount, favorites: favCount,
    likes_given: likeCount, likes_received: receivedResult.total || 0
  })
}))

// ============ 收藏列表 ============
router.get('/favorites', authRequired, asyncHandler(async function(req, res) {
  var target_type = req.query.type || 'artwork'
  var page = Math.max(1, parseInt(req.query.page) || 1)
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var offset = (page - 1) * limit

  var totalResult = await queryOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = ?', [req.user.id, target_type])
  var total = totalResult.count

  var items
  if (target_type === 'artwork') {
    items = await queryAll(
      'SELECT a.*, f.created_at as favorited_at FROM favorites f JOIN artworks a ON f.target_id = a.id WHERE f.user_id = ? AND f.target_type = ? ORDER BY f.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
      [req.user.id, target_type]
    )
  } else if (target_type === 'exhibition') {
    items = await queryAll(
      'SELECT e.*, f.created_at as favorited_at FROM favorites f JOIN exhibitions e ON f.target_id = e.id WHERE f.user_id = ? AND f.target_type = ? ORDER BY f.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
      [req.user.id, target_type]
    )
    items.forEach(function(item) {
      try { item.tags = JSON.parse(item.tags || '[]') } catch(e) { item.tags = [] }
    })
  } else {
    items = await queryAll(
      'SELECT p.*, u.nickname as author_name, u.avatar as author_avatar, f.created_at as favorited_at FROM favorites f JOIN posts p ON f.target_id = p.id JOIN users u ON p.user_id = u.id WHERE f.user_id = ? AND f.target_type = ? ORDER BY f.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
      [req.user.id, target_type]
    )
    items.forEach(function(item) {
      try { item.images = JSON.parse(item.images || '[]') } catch(e) { item.images = [] }
    })
  }

  res.json({ items: items, total: total, page: page, limit: limit })
}))

// ============ 添加收藏 ============
router.post('/favorites', authRequired, asyncHandler(async function(req, res) {
  var body = req.body
  if (!body.target_type || !body.target_id) return res.status(400).json({ error: '参数不完整' })

  var existing = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [req.user.id, body.target_type, body.target_id])
  if (existing) return res.json({ message: '已收藏' })

  await run('INSERT INTO favorites (user_id, target_type, target_id) VALUES (?, ?, ?)', [req.user.id, body.target_type, body.target_id])
  await run('UPDATE users SET stats_fav = stats_fav + 1 WHERE id = ?', [req.user.id])
  res.json({ message: '收藏成功' })
}))

// ============ 取消收藏 ============
router.delete('/favorites/:id', authRequired, asyncHandler(async function(req, res) {
  var fav = await queryOne('SELECT id, target_type, target_id FROM favorites WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  if (!fav) return res.status(404).json({ error: '收藏不存在' })

  await run('DELETE FROM favorites WHERE id = ?', [fav.id])
  await run('UPDATE users SET stats_fav = MAX(0, stats_fav - 1) WHERE id = ?', [req.user.id])
  res.json({ message: '已取消收藏' })
}))

// ============ 浏览历史 ============
router.get('/history', authRequired, asyncHandler(async function(req, res) {
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var items = await queryAll(
    'SELECT a.*, vh.created_at as viewed_at FROM view_history vh JOIN artworks a ON vh.artwork_id = a.id WHERE vh.user_id = ? ORDER BY vh.created_at DESC LIMIT ' + limit,
    [req.user.id]
  )
  res.json(items)
}))

// ============ 我的上传 ============
router.get('/uploads', authRequired, asyncHandler(async function(req, res) {
  var page = Math.max(1, parseInt(req.query.page) || 1)
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var offset = (page - 1) * limit

  var totalResult = await queryOne('SELECT COUNT(*) as count FROM artworks WHERE user_id = ?', [req.user.id])
  var total = totalResult.count
  var items = await queryAll(
    'SELECT * FROM artworks WHERE user_id = ? ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset,
    [req.user.id]
  )
  res.json({ items: items, total: total, page: page, limit: limit })
}))

// ============ 我的帖子 ============
router.get('/my-posts', authRequired, asyncHandler(async function(req, res) {
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  var items = await queryAll('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ' + limit, [req.user.id])
  items.forEach(function(item) {
    try { item.images = JSON.parse(item.images || '[]') } catch(e) { item.images = [] }
    try { item.tags = JSON.parse(item.tags || '[]') } catch(e) { item.tags = [] }
  })
  res.json(items)
}))

// ============ 用户排行榜 ============
router.get('/ranking', authRequired, asyncHandler(async function(req, res) {
  var type = req.query.type || 'likes'
  var limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
  var query

  if (type === 'uploads') {
    query = 'SELECT u.id, u.nickname, u.avatar, COUNT(a.id) as score FROM users u LEFT JOIN artworks a ON u.id = a.user_id GROUP BY u.id ORDER BY score DESC LIMIT ' + limit
  } else if (type === 'views') {
    query = 'SELECT id, username, nickname, avatar, stats_view as score FROM users ORDER BY stats_view DESC LIMIT ' + limit
  } else {
    query = 'SELECT id, username, nickname, avatar, stats_like as score FROM users ORDER BY stats_like DESC LIMIT ' + limit
  }

  var ranking = await queryAll(query)
  res.json(ranking)
}))

module.exports = router
