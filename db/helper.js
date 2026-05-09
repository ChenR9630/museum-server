/**
 * sql.js 兼容层
 * 让 sql.js 的 API 以 async/await 风格暴露给路由层使用
 */
var { getDBAsync, saveDB } = require('./init')

/**
 * query 封装 - 返回 Promise<Array>
 */
function queryAll(sql, params) {
  return getDBAsync().then(function(db) {
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

/**
 * 查询单条 - 返回 Promise<Object|null>
 */
function queryOne(sql, params) {
  return queryAll(sql, params).then(function(rows) {
    return rows.length > 0 ? rows[0] : null
  })
}

/**
 * 执行写操作 - 返回 Promise<{lastInsertRowid, changes}>
 */
function run(sql, params) {
  return getDBAsync().then(function(db) {
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

/**
 * 事务 - 执行多个操作后一次性保存
 */
function transaction(fn) {
  return getDBAsync().then(function(db) {
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
