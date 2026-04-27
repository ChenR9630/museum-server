// 模拟 helper.js 实际调用链调试
// 在服务器上运行：node debug_register2.js
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'museum.db')

let db = null

// 模拟 init.js 的 getDB
async function getDB() {
  if (!db) {
    const SQL = await initSqlJs()
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  }
  return db
}

// 模拟 init.js 的 saveDB
function saveDB() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

// 模拟 helper.js 的 run
function run(sql, params) {
  return getDB().then(function(db) {
    db.run(sql, params || [])
    saveDB()
    var rid = db.exec('SELECT last_insert_rowid()')
    var rowid = rid && rid[0] && rid[0].values && rid[0].values[0] ? rid[0].values[0][0] : 0
    return {
      lastInsertRowid: rowid,
      changes: db.getRowsModified()
    }
  })
}

// 模拟 helper.js 的 queryOne
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
  console.log('=== 模拟 helper.js 调用链 ===')
  
  const testUser = 'debug2_' + Date.now()
  
  // 模拟注册流程（和 auth.js 完全一样）
  console.log('\n--- 模拟注册 ---')
  
  // 1. 检查用户是否存在
  var existing = await queryOne('SELECT id FROM users WHERE username = ?', [testUser])
  console.log('existing:', existing)
  
  // 2. 插入用户
  console.log('\n--- run() INSERT ---')
  var result = await run(
    'INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)',
    [testUser, 'hashed123', testUser, '', 'visitor']
  )
  console.log('run result:', JSON.stringify(result))
  
  // 3. 查询新用户
  console.log('\n--- queryOne 查新用户 ---')
  var user = await queryOne(
    'SELECT id, username, nickname, avatar, role, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  )
  console.log('user:', user)
  
  if (!user) {
    console.log('!!! ERROR: queryOne 返回 null !!!')
    console.log('尝试用 username 查找...')
    var userByName = await queryOne('SELECT id, username FROM users WHERE username = ?', [testUser])
    console.log('userByName:', userByName)
  }
  
  // 4. 清理
  console.log('\n--- 清理 ---')
  await run('DELETE FROM users WHERE username = ?', [testUser])
  console.log('Done')
}

main().catch(e => console.error('Fatal:', e.message, e.stack))
