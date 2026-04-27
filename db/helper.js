/**
 * sql.js 兼容层
 * 让 sql.js 的 API 尽量接近 better-sqlite3 的同步风格
 */
const { getDB, saveDB } = require('./init')

/**
 * query 封装 - 返回 Promise
 */
function queryAll(sql, params) {
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
    return results
  })
}

function queryOne(sql, params) {
  return queryAll(sql, params).then(function(rows) {
    return rows.length > 0 ? rows[0] : null
  })
}

function run(sql, params) {
  return getDB().then(function(db) {
    var stmt = db.prepare(sql)
    if (params && params.length > 0) {
      stmt.bind(params)
    }
    stmt.step()
    stmt.free()
    saveDB()
    return {
      lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
      changes: db.getRowsModified()
    }
  })
}

/**
 * 事务 - 执行多个操作后一次性保存
 */
function transaction(fn) {
  return getDB().then(function(db) {
    db.run('BEGIN')
    try {
      var result = fn(db)
      saveDB()
      db.run('COMMIT')
      return result
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }
  })
}

/**
 * Express 中间件包装 - 让路由 handler 可以 async/await
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = { queryAll, queryOne, run, transaction, asyncHandler, saveDB }
