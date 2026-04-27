/**
 * 众像美术馆 - 发现/成就路由
 */
const express = require('express')
const { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
const { authRequired, authOptional } = require('../middleware/auth')

var router = express.Router()

// ============ 发现列表 ============
router.get('/items', asyncHandler(async function(req, res) {
  var type = req.query.type
  var where = []
  var params = []
  if (type) { where.push('type = ?'); params.push(type) }
  var whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : ''

  var items = await queryAll('SELECT * FROM discover_items' + whereClause + ' ORDER BY sort_order ASC, hot DESC', params)
  res.json(items)
}))

// ============ 分类推荐 ============
router.get('/categories', asyncHandler(async function(req, res) {
  var categories = await queryAll('SELECT category, COUNT(*) as count, AVG(likes) as avg_likes FROM artworks GROUP BY category ORDER BY count DESC')
  res.json(categories)
}))

// ============ 热门作品 ============
router.get('/hot', asyncHandler(async function(req, res) {
  var limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10))
  var items = await queryAll('SELECT * FROM artworks ORDER BY likes DESC LIMIT ' + limit)
  res.json(items)
}))

// ============ 全部成就 ============
router.get('/achievements', asyncHandler(async function(req, res) {
  var achievements = await queryAll('SELECT * FROM achievements ORDER BY id')
  res.json(achievements)
}))

// ============ 我的成就 ============
router.get('/achievements/mine', authRequired, asyncHandler(async function(req, res) {
  var myAchievements = await queryAll(
    'SELECT a.*, ua.unlocked_at FROM achievements a JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC',
    [req.user.id]
  )
  res.json(myAchievements)
}))

// ============ 检查并解锁成就 ============
router.post('/achievements/check', authRequired, asyncHandler(async function(req, res) {
  var userId = req.user.id
  var user = await queryOne('SELECT stats_fav, stats_view, stats_like, stats_exhibit FROM users WHERE id = ?', [userId])
  if (!user) return res.status(404).json({ error: '用户不存在' })

  var uploadCount = (await queryOne('SELECT COUNT(*) as count FROM artworks WHERE user_id = ?', [userId])).count
  var favCount = (await queryOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId])).count
  var postCount = (await queryOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId])).count

  var stats = { view: user.stats_view, like: user.stats_like, fav: favCount, exhibit: user.stats_exhibit, upload: uploadCount, post: postCount }

  var allAchievements = await queryAll('SELECT * FROM achievements')
  var alreadyHave = await queryAll('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId])
  var haveIds = alreadyHave.map(function(a) { return a.achievement_id })

  var newlyUnlocked = []
  for (var i = 0; i < allAchievements.length; i++) {
    var ach = allAchievements[i]
    if (haveIds.indexOf(ach.id) === -1 && ach.condition_type && ach.condition_value) {
      var userVal = stats[ach.condition_type] || 0
      if (userVal >= ach.condition_value) {
        await run('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [userId, ach.id])
        newlyUnlocked.push(ach)
      }
    }
  }

  res.json({ newlyUnlocked: newlyUnlocked })
}))

module.exports = router
