// 验证修复后的 run() 函数
// 在服务器上运行：node debug_register3.js
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'museum.db')

let db = null

async function getDB() {
  if (!db) {
    const SQL = await initSqlJs()
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  }
  return db
}

function saveDB() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

// 修复后的 run
function run(sql, params) {
  return getDB().then(function(db) {
    var stmt = db.prepare(sql)
    stmt.bind(params || [])
    stmt.step()
    stmt.free()
    var rid = db.exec('SELECT last_insert_rowid()')
    var rowid = rid && rid[0] && rid[0].values && rid[0].values[0] ? rid[0].values[0][0] : 0
    var changes = db.getRowsModified()
    saveDB()
    return {
      lastInsertRowid: rowid,
      changes: changes
    }
  })
}

function queryOne(sql, params) {
  return getDB().then(function(db) {
    var stmt = db.prepare(sql)
    if (params && params.length > 0) {
      stmt.bind(params)
    }
    var results = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results.length > 0 ? results[0] : null
  })
}

async function main() {
  console.log('=== 验证修复后的 run() ===')
  
  const testUser = 'fix_test_' + Date.now()
  
  var existing = await queryOne('SELECT id FROM users WHERE username = ?', [testUser])
  console.log('existing:', existing)
  
  var result = await run(
    'INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)',
    [testUser, 'hashed123', testUser, '', 'visitor']
  )
  console.log('run result:', JSON.stringify(result))
  
  var user = await queryOne(
    'SELECT id, username, nickname, avatar, role, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  )
  console.log('user:', user)
  
  if (user) {
    console.log('\n>>> SUCCESS! 注册流程修复成功！ <<<')
  } else {
    console.log('\n>>> FAILED! 仍然查不到用户 <<<')
    var userByName = await queryOne('SELECT id, username FROM users WHERE username = ?', [testUser])
    console.log('userByName:', userByName)
  }
  
  await run('DELETE FROM users WHERE username = ?', [testUser])
  console.log('Cleanup done')
}

main().catch(e => console.error('Fatal:', e.message, e.stack))
