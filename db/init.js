/**
 * 众像美术馆 - 数据库初始化（sql.js 纯 JS 方案）
 * 零原生依赖，无需编译
 *
 * 重构说明：
 * - getDB() 现在是同步函数，db 实例在 initDB() 完成后才可用
 * - 使用 initPromise 追踪初始化状态
 * - 所有需要 db 的地方通过 helper.js 的 async 封装调用
 */
var initSqlJs = require('sql.js')
var fs = require('fs')
var path = require('path')
var { config } = require('../config')

var DATA_DIR = config.DATA_DIR
var DB_PATH = path.join(DATA_DIR, config.DB_NAME)

var db = null
var initPromise = null
var initialized = false

/**
 * 初始化数据库（async，启动时调用一次）
 */
async function initDB() {
  if (initPromise) return initPromise

  initPromise = (async function() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

    var SQL = await initSqlJs()

    if (fs.existsSync(DB_PATH)) {
      var buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    db.run('PRAGMA journal_mode = WAL')
    db.run('PRAGMA foreign_keys = ON')
    initTables()
    saveDB()
    initialized = true
    console.log('  \x1b[32m✓ 数据库已就绪\x1b[0m (' + DB_PATH + ')')
    return db
  })()

  return initPromise
}

/**
 * 获取数据库实例
 * 同步调用，但要求 initDB() 已完成
 * 如果未初始化，返回 null（调用方应通过 helper.js 的 async 封装使用）
 */
function getDB() {
  return db
}

/**
 * 等待数据库初始化完成，返回 db 实例
 */
function getDBAsync() {
  if (initialized) return Promise.resolve(db)
  if (initPromise) return initPromise
  return initDB()
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password      TEXT    NOT NULL,
      nickname      TEXT    NOT NULL DEFAULT '',
      avatar        TEXT    DEFAULT '',
      bio           TEXT    DEFAULT '',
      role          TEXT    DEFAULT 'visitor' CHECK(role IN ('admin','curator','visitor')),
      stats_fav     INTEGER DEFAULT 0,
      stats_view    INTEGER DEFAULT 0,
      stats_like    INTEGER DEFAULT 0,
      stats_exhibit INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS exhibitions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      emoji         TEXT    DEFAULT '',
      description   TEXT    DEFAULT '',
      curator       TEXT    DEFAULT '',
      status        TEXT    DEFAULT '进行中' CHECK(status IN ('进行中','即将开幕','已结束')),
      date_range    TEXT    DEFAULT '',
      visitors      TEXT    DEFAULT '0',
      hall_count    INTEGER DEFAULT 0,
      color1        TEXT    DEFAULT '#8B5E3C',
      color2        TEXT    DEFAULT '#D4A574',
      tags          TEXT    DEFAULT '[]',
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS halls (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      exhibition_id INTEGER NOT NULL,
      name          TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      sort_order    INTEGER DEFAULT 0,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS artworks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      emoji         TEXT    DEFAULT '',
      artist        TEXT    DEFAULT '',
      year          TEXT    DEFAULT '',
      category      TEXT    DEFAULT '油画' CHECK(category IN ('油画','摄影','数字艺术','水墨','AI艺术','装置艺术','综合材料','素描','版画','雕塑')),
      bg_color      TEXT    DEFAULT '#E8D5B7',
      image_url     TEXT    DEFAULT '',
      description   TEXT    DEFAULT '',
      audio_guide   TEXT    DEFAULT '',
      exhibition_id INTEGER,
      hall_id       INTEGER,
      is_user_upload INTEGER DEFAULT 0,
      likes         INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      slot_index    INTEGER DEFAULT -1,
      upload_time   TEXT    DEFAULT '',
      user_id       INTEGER,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL,
      FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      content       TEXT    NOT NULL,
      images        TEXT    DEFAULT '[]',
      tags          TEXT    DEFAULT '[]',
      exhibition_id INTEGER,
      likes         INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      location      TEXT    DEFAULT '',
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      target_type   TEXT    NOT NULL CHECK(target_type IN ('artwork','post')),
      target_id     INTEGER NOT NULL,
      content       TEXT    NOT NULL,
      likes         INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      target_type   TEXT    NOT NULL CHECK(target_type IN ('artwork','post','comment')),
      target_id     INTEGER NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      target_type   TEXT    NOT NULL CHECK(target_type IN ('artwork','exhibition','post')),
      target_id     INTEGER NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS view_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      artwork_id    INTEGER NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS discover_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT    NOT NULL CHECK(type IN ('topic','guide','activity')),
      emoji         TEXT    DEFAULT '',
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      hot           INTEGER DEFAULT 0,
      sort_order    INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      emoji         TEXT    DEFAULT '',
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      condition_type TEXT   DEFAULT '',
      condition_value INTEGER DEFAULT 0
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      unlocked_at   TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    )
  `)

  // 索引
  var indexes = [
    'CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category)',
    'CREATE INDEX IF NOT EXISTS idx_artworks_exhibition ON artworks(exhibition_id)',
    'CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_artworks_slot ON artworks(slot_index)',
    'CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id)',
    'CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id)',
    'CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id)'
  ]
  indexes.forEach(function(sql) { db.run(sql) })
}

/**
 * 保存数据库到磁盘
 */
function saveDB() {
  if (db) {
    var data = db.export()
    var buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

module.exports = { initDB, getDB, getDBAsync, saveDB }
