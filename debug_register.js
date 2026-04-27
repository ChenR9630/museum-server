// 注册接口完整调试脚本
// 在服务器上运行：node debug_register.js
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'museum.db')

async function main() {
  console.log('=== 注册接口完整调试 ===')
  console.log('DB_PATH:', DB_PATH)
  console.log('DB exists:', fs.existsSync(DB_PATH))

  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buffer)

  const testUser = 'debug_' + Date.now()
  const testPass = '123456'

  // Step 1: 检查用户是否存在
  console.log('\n--- Step 1: 检查用户是否存在 ---')
  var stmt1 = db.prepare('SELECT id FROM users WHERE username = ?')
  stmt1.bind([testUser])
  var exists = stmt1.step()
  console.log('exists:', exists)
  stmt1.free()

  // Step 2: bcrypt hash
  console.log('\n--- Step 2: bcrypt hash ---')
  var hash = bcrypt.hashSync(testPass, 10)
  console.log('hash length:', hash.length)
  console.log('hash preview:', hash.substring(0, 20) + '...')

  // Step 3: db.run INSERT
  console.log('\n--- Step 3: db.run INSERT ---')
  try {
    db.run(
      'INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)',
      [testUser, hash, testUser, '', 'visitor']
    )
    console.log('INSERT succeeded')
  } catch (e) {
    console.error('INSERT FAILED:', e.message)
    return
  }

  // Step 4: 获取 last_insert_rowid
  console.log('\n--- Step 4: 获取 last_insert_rowid ---')
  try {
    var rid = db.exec('SELECT last_insert_rowid()')
    console.log('rid:', JSON.stringify(rid))
    var rowid = rid && rid[0] && rid[0].values && rid[0].values[0] ? rid[0].values[0][0] : 0
    console.log('rowid:', rowid)
  } catch (e) {
    console.error('SELECT last_insert_rowid FAILED:', e.message)
  }

  // Step 5: 用 queryOne 方式查用户
  console.log('\n--- Step 5: queryOne 查用户 ---')
  var stmt2 = db.prepare('SELECT id, username, nickname, avatar, role, created_at FROM users WHERE id = ?')
  stmt2.bind([rowid])
  var userFound = stmt2.step()
  console.log('userFound:', userFound)
  if (userFound) {
    console.log('user:', stmt2.getAsObject())
  } else {
    console.log('ERROR: 用户未找到！尝试查询最新插入的用户...')
    var stmt3 = db.prepare('SELECT id, username, nickname FROM users WHERE username = ?')
    stmt3.bind([testUser])
    if (stmt3.step()) {
      console.log('Found by username:', stmt3.getAsObject())
    } else {
      console.log('ERROR: 用户根本不存在！')
    }
    stmt3.free()
  }
  stmt2.free()

  // Step 6: 清理测试数据
  console.log('\n--- Step 6: 清理 ---')
  db.run('DELETE FROM users WHERE username = ?', [testUser])
  console.log('Cleanup done')

  console.log('\n=== 调试完成 ===')
}

main().catch(e => console.error('Fatal:', e.message, e.stack))
