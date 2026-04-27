/**
 * 众像美术馆 - 展览路由
 * GET    /api/exhibitions           展览列表
 * GET    /api/exhibitions/:id       展览详情（含展厅+作品）
 * POST   /api/exhibitions           创建展览（管理员）
 * PUT    /api/exhibitions/:id       更新展览（管理员）
 * DELETE /api/exhibitions/:id       删除展览（管理员）
 */
const express = require('express')
const { queryAll, queryOne, run, asyncHandler } = require('../db/helper')
const { authRequired, authOptional, adminOnly } = require('../middleware/auth')

var router = express.Router()

// ============ 展览列表 ============
router.get('/', asyncHandler(async function(req, res) {
  var status = req.query.status
  var where = []
  var params = []
  if (status) { where.push('status = ?'); params.push(status) }
  var whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : ''

  var items = await queryAll('SELECT * FROM exhibitions' + whereClause + ' ORDER BY created_at DESC', params)
  items.forEach(function(item) {
    try { item.tags = JSON.parse(item.tags || '[]') } catch(e) { item.tags = [] }
  })
  res.json(items)
}))

// ============ 展览详情 ============
router.get('/:id', authOptional, asyncHandler(async function(req, res) {
  var exhibition = await queryOne('SELECT * FROM exhibitions WHERE id = ?', [req.params.id])
  if (!exhibition) return res.status(404).json({ error: '展览不存在' })

  try { exhibition.tags = JSON.parse(exhibition.tags || '[]') } catch(e) { exhibition.tags = [] }

  var halls = await queryAll('SELECT * FROM halls WHERE exhibition_id = ? ORDER BY sort_order', [exhibition.id])
  var artworks = await queryAll('SELECT * FROM artworks WHERE exhibition_id = ? ORDER BY created_at DESC', [exhibition.id])

  if (req.user) {
    var faved = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, 'exhibition', exhibition.id])
    exhibition.is_favorited = !!faved
  } else {
    exhibition.is_favorited = false
  }

  res.json({ exhibition: exhibition, halls: halls, artworks: artworks })
}))

// ============ 创建展览 ============
router.post('/', authRequired, adminOnly, asyncHandler(async function(req, res) {
  var body = req.body
  if (!body.title) return res.status(400).json({ error: '展览标题不能为空' })

  var tags = JSON.stringify(body.tags || [])
  var result = await run(
    'INSERT INTO exhibitions (title, emoji, description, curator, status, date_range, visitors, hall_count, color1, color2, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [body.title, body.emoji || '', body.description || '', body.curator || '', body.status || '即将开幕',
     body.date_range || '', body.visitors || '0', body.hall_count || 0, body.color1 || '#8B5E3C', body.color2 || '#D4A574', tags]
  )

  if (body.halls && body.halls.length > 0) {
    for (var i = 0; i < body.halls.length; i++) {
      await run('INSERT INTO halls (exhibition_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
        [result.lastInsertRowid, body.halls[i].name || ('展厅' + (i + 1)), body.halls[i].description || '', i])
    }
    await run('UPDATE exhibitions SET hall_count = ? WHERE id = ?', [body.halls.length, result.lastInsertRowid])
  }

  var exhibition = await queryOne('SELECT * FROM exhibitions WHERE id = ?', [result.lastInsertRowid])
  try { exhibition.tags = JSON.parse(exhibition.tags) } catch(e) { exhibition.tags = [] }
  res.status(201).json(exhibition)
}))

// ============ 更新展览 ============
router.put('/:id', authRequired, adminOnly, asyncHandler(async function(req, res) {
  var exhibition = await queryOne('SELECT id FROM exhibitions WHERE id = ?', [req.params.id])
  if (!exhibition) return res.status(404).json({ error: '展览不存在' })

  var body = req.body
  var tags = body.tags ? JSON.stringify(body.tags) : null
  await run(
    'UPDATE exhibitions SET title = COALESCE(?,title), emoji = COALESCE(?,emoji), description = COALESCE(?,description), curator = COALESCE(?,curator), status = COALESCE(?,status), date_range = COALESCE(?,date_range), color1 = COALESCE(?,color1), color2 = COALESCE(?,color2), updated_at = datetime("now","localtime") WHERE id = ?',
    [body.title, body.emoji, body.description, body.curator, body.status, body.date_range, body.color1, body.color2, exhibition.id]
  )
  if (tags !== null) {
    await run('UPDATE exhibitions SET tags = ? WHERE id = ?', [tags, exhibition.id])
  }

  var updated = await queryOne('SELECT * FROM exhibitions WHERE id = ?', [exhibition.id])
  try { updated.tags = JSON.parse(updated.tags || '[]') } catch(e) { updated.tags = [] }
  res.json(updated)
}))

// ============ 删除展览 ============
router.delete('/:id', authRequired, adminOnly, asyncHandler(async function(req, res) {
  var exhibition = await queryOne('SELECT id FROM exhibitions WHERE id = ?', [req.params.id])
  if (!exhibition) return res.status(404).json({ error: '展览不存在' })

  await run('DELETE FROM halls WHERE exhibition_id = ?', [exhibition.id])
  await run('UPDATE artworks SET exhibition_id = NULL WHERE exhibition_id = ?', [exhibition.id])
  await run('DELETE FROM exhibitions WHERE id = ?', [exhibition.id])
  res.json({ message: '展览已删除' })
}))

module.exports = router
