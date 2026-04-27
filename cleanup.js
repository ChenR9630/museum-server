// 在服务器上运行：node cleanup.js
// 删除调试测试文件和之前遗留的测试用户
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'museum.db')

async function main() {
  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buffer)
  
  // 清理调试用户
  var stmt = db.prepare("SELECT id, username FROM users WHERE username LIKE 'debug%' OR username LIKE 'newuser%' OR username LIKE 'testuser%' OR username LIKE 'test999%' OR username LIKE 'fix_test%'")
  var toDelete = []
  while (stmt.step()) { toDelete.push(stmt.getAsObject()) }
  stmt.free()
  
  console.log('Found debug users:', toDelete.length)
  toDelete.forEach(function(u) {
    db.run('DELETE FROM users WHERE id = ?', [u.id])
    console.log('  Deleted:', u.username)
  })
  
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
  console.log('DB saved')
}

main().catch(e => console.error(e.message))
