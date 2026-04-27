const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'museum.db');

async function test() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Method 1: prepare + bind + step
  console.log('--- Method 1: prepare + bind + step ---');
  try {
    var stmt = db.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)');
    stmt.bind(['test_m1', 'hash1', 'Test1', '', 'visitor']);
    var stepped = stmt.step();
    console.log('stepped:', stepped);
    stmt.free();
    var rid = db.exec('SELECT last_insert_rowid()');
    console.log('raw result:', JSON.stringify(rid));
    var rowid = rid && rid[0] && rid[0].values && rid[0].values[0] ? rid[0].values[0][0] : 0;
    console.log('RowID:', rowid);
    db.run("DELETE FROM users WHERE username = 'test_m1'");
  } catch(e) {
    console.error('Method 1 error:', e.message);
  }

  // Method 2: prepare + run
  console.log('\n--- Method 2: prepare + run ---');
  try {
    var stmt2 = db.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)');
    stmt2.run(['test_m2', 'hash2', 'Test2', '', 'visitor']);
    stmt2.free();
    var rid2 = db.exec('SELECT last_insert_rowid()');
    var rowid2 = rid2 && rid2[0] && rid2[0].values && rid2[0].values[0] ? rid2[0].values[0][0] : 0;
    console.log('RowID:', rowid2);
    db.run("DELETE FROM users WHERE username = 'test_m2'");
  } catch(e) {
    console.error('Method 2 error:', e.message);
  }

  // Method 3: db.run
  console.log('\n--- Method 3: db.run ---');
  try {
    db.run('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)', ['test_m3', 'hash3', 'Test3', '', 'visitor']);
    var rid3 = db.exec('SELECT last_insert_rowid()');
    var rowid3 = rid3 && rid3[0] && rid3[0].values && rid3[0].values[0] ? rid3[0].values[0][0] : 0;
    console.log('RowID:', rowid3);
    db.run("DELETE FROM users WHERE username = 'test_m3'");
  } catch(e) {
    console.error('Method 3 error:', e.message);
  }

  // Method 4: getRowsModified
  console.log('\n--- Method 4: getRowsModified ---');
  try {
    var stmt4 = db.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)');
    stmt4.run(['test_m4', 'hash4', 'Test4', '', 'visitor']);
    var modified = db.getRowsModified();
    console.log('modified rows:', modified);
    stmt4.free();
    var rid4 = db.exec('SELECT last_insert_rowid()');
    var rowid4 = rid4 && rid4[0] && rid4[0].values && rid4[0].values[0] ? rid4[0].values[0][0] : 0;
    console.log('RowID after free:', rowid4);
    db.run("DELETE FROM users WHERE username = 'test_m4'");
  } catch(e) {
    console.error('Method 4 error:', e.message);
  }
}

test().catch(function(e) { console.error('Fatal:', e); process.exit(1); });
