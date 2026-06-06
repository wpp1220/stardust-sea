// ==================== 星尘之海 · 数据库模块 ====================
// sql.js (纯 JavaScript SQLite，无需系统依赖)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'stardust.db');
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  // 从文件加载或新建
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  // 创建表
  db.run(`CREATE TABLE IF NOT EXISTS fragments (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    email_encrypted TEXT,
    pos_x REAL DEFAULT 0,
    pos_y REAL DEFAULT 0,
    growth_stage INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    viewer_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    fragment_id TEXT NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    location TEXT DEFAULT '不愿透露',
    status TEXT DEFAULT 'pending',
    approve_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    reply_id TEXT NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    guardian_id TEXT NOT NULL,
    result TEXT,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(reply_id, guardian_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS guardians (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    banned_until TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // 保存到文件
  saveDb();
  console.log('✦ 数据库已初始化:', DB_PATH);
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 工具：将 sql.js 的行结果转为对象数组
// 兼容三种格式：
//   1. db.exec() → [{columns:string[], values:any[][]}]
//   2. db.exec(...)[0] → {columns:string[], values:any[][]}
//   3. Statement (from db.run/db.prepare)
function rowsToArray(stmt) {
  // Case 1: full QueryExecResult array
  if (Array.isArray(stmt)) {
    if (stmt.length === 0) return [];
    return rowsToArray(stmt[0]); // recurse with first result
  }
  // Case 2: QueryExecResult object with columns + values
  if (stmt && typeof stmt === 'object' && stmt.columns) {
    const columns = stmt.columns;
    return (stmt.values || []).map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }
  // Case 3: Statement from db.run() or db.prepare()
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDb, rowsToArray };
