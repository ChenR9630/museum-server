// 清理种子作品数据，保留用户上传的作品
// 在服务器上运行：node clean_seed_artworks.js
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'museum.db')

async function main() {
  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buffer)

  // 查看所有作品
  var stmt = db.prepare('SELECT id, title, artist, is_user_upload, user_id FROM artworks ORDER BY id')
  var all = []
  while (stmt.step()) { all.push(stmt.getAsObject()) }
  stmt.free()

  console.log('=== 当前所有作品 ===')
  var toDelete = []
  all.forEach(function(a) {
    var tag = a.is_user_upload ? '[用户上传]' : '[种子数据]'
    console.log('  id=' + a.id + ' ' + tag + ' ' + a.title + ' - ' + a.artist + ' (user_id=' + (a.user_id || 'null') + ')')
    if (!a.is_user_upload) {
      toDelete.push(a.id)
    }
  })

  console.log('\n将删除 ' + toDelete.length + ' 件种子作品，保留 ' + (all.length - toDelete.length) + ' 件用户上传作品')

  // 删除种子作品
  toDelete.forEach(function(id) {
    db.run('DELETE FROM comments WHERE target_type = ? AND target_id = ?', ['artwork', id])
    db.run('DELETE FROM likes WHERE target_type = ? AND target_id = ?', ['artwork', id])
    db.run('DELETE FROM favorites WHERE target_type = ? AND target_id = ?', ['artwork', id])
    db.run('DELETE FROM view_history WHERE artwork_id = ?', [id])
    db.run('DELETE FROM artworks WHERE id = ?', [id])
  })

  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
  console.log('\n清理完成！数据库已保存。')
}

main().catch(e => console.error(e.message))
