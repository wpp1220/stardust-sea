// ==================== 星尘之海 · 后端服务 ====================
// 技术栈：Node.js + Express + SQL.js (纯JS SQLite) + Socket.IO
// 启动：npm install && npm start
// 访问：http://localhost:3000

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, getDb, saveDb, rowsToArray } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== 工具 ====================
const p1 = ['苔藓','露水','微光','麦浪','孤岛','星辰','流星','月光','晨星','晚霞','琥珀','风铃','灯塔','潮汐','森林','海鸥','涟漪','薄雾','萤火','极光'];
const p2 = ['鹿鸣','飞鸟','鲸落','蝴蝶','蝉鸣','溪流','雪花','云朵','鸽子','铃兰','琥珀','星尘','浪花','秋叶','春风','夏雨','冬雪','彩虹','山脉','河流'];
const p3 = ['薄雾','星尘','夜空','海洋','山谷','潮汐','微风','月光','晨曦','晚风','晨星','暮色','森林','草原','极光','霞光','雨滴','霜花','露珠','虹彩'];
function poemKey() { return `${p1[~~(Math.random()*20)]}-${p2[~~(Math.random()*20)]}-${p3[~~(Math.random()*20)]}`; }
function hash(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function stage(n) { const t=[0,10,20,30,40,50,60,70,80,90,100]; for(let i=t.length-1;i>=0;i--)if(n>=t[i])return i; return 0; }

// ==================== API ====================

// 创建碎片
app.post('/api/fragment', (req, res) => {
  const { content, email } = req.body;
  if (!content || content.length > 500) return res.status(400).json({ error: '内容在1-500字之间。' });
  const db = getDb();
  const id = uuidv4(), key = poemKey();
  db.run('INSERT INTO fragments VALUES (?,?,?,?,?,?,0,0,0,datetime(\'now\',\'localtime\'))',
    [id, content, hash(key), email||null, (Math.random()-0.5)*2000, (Math.random()-0.5)*1600]);
  io.emit('new_fragment',{id,posX:0,posY:0,growthStage:0,replyCount:0});
  saveDb(); res.status(201).json({id,poemKey:key,posX:0,posY:0});
});

// 碎片列表
app.get('/api/fragments', (req, res) => {
  const rows = rowsToArray(getDb().exec('SELECT id,pos_x,pos_y,growth_stage,reply_count,viewer_count,created_at FROM fragments')[0]);
  res.json(rows.map(r=>({id:r.id,posX:r.pos_x,posY:r.pos_y,growthStage:r.growth_stage,replyCount:r.reply_count,viewerCount:r.viewer_count,createdAt:r.created_at})));
});

// 碎片详情
app.get('/api/fragment/:id', (req, res) => {
  const db = getDb();
  const r = rowsToArray(db.exec(`SELECT * FROM fragments WHERE id='${req.params.id}'`));
  if (!r.length) return res.status(404).json({error:'碎片不存在'});
  const f = r[0];
  db.run(`UPDATE fragments SET viewer_count=viewer_count+1 WHERE id='${req.params.id}'`);
  const reps = rowsToArray(db.exec(`SELECT content,location,created_at FROM replies WHERE fragment_id='${req.params.id}' AND status='approved' ORDER BY created_at`));
  res.json({id:f.id,content:f.content,growthStage:f.growth_stage,replyCount:f.reply_count,viewerCount:f.viewer_count+1,createdAt:f.created_at,replies:reps});
});

// 提交回应
app.post('/api/fragment/:id/reply', (req, res) => {
  const {content,location}=req.body;
  if(!content||content.length>300) return res.status(400).json({error:'回应在1-300字之间'});
  const db=getDb();
  const rid=uuidv4();
  db.run(`INSERT INTO replies(id,fragment_id,content,location) VALUES('${rid}','${req.params.id}','${content.replace(/'/g,"''")}','${(location||'不愿透露').replace(/'/g,"''")}')`);
  saveDb();
  res.status(201).json({id:rid,message:'已送审，等待5位守护者审核通过后可见'});
});

// 获取待审（每人1条）
app.get('/api/audit/next/:guardianId', (req, res) => {
  const db=getDb();
  const done=rowsToArray(db.exec(`SELECT reply_id FROM audits WHERE guardian_id='${req.params.guardianId}'`));
  const doneIds=done.map(d=>`'${d.reply_id}'`).join(',');
  const sql=`SELECT id,content,location,fragment_id,approve_count FROM replies WHERE status='pending'${doneIds?` AND id NOT IN(${doneIds})`:''} ORDER BY created_at LIMIT 1`;
  const r=rowsToArray(db.exec(sql));
  if(!r.length) return res.json({message:'暂无待审核'});
  res.json({replyId:r[0].id,content:r[0].content,location:r[0].location,fragmentId:r[0].fragment_id,approveCount:r[0].approve_count});
});

// 提交审核
app.post('/api/audit/:guardianId', (req, res) => {
  const {replyId,result,reason}=req.body;
  if(!['approved','rejected'].includes(result)) return res.status(400).json({error:'请选择通过或不通过'});
  const db=getDb();
  const existing=rowsToArray(db.exec(`SELECT id FROM audits WHERE reply_id='${replyId}' AND guardian_id='${req.params.guardianId}'`));
  if(existing.length) return res.status(400).json({error:'你已经审核过这条'});
  db.run(`INSERT INTO audits VALUES('${uuidv4()}','${replyId}','${req.params.guardianId}','${result}','${reason||''}',datetime('now','localtime'))`);
  if(result==='approved'){
    const rep=rowsToArray(db.exec(`SELECT * FROM replies WHERE id='${replyId}'`));
    if(rep.length){
      const nc=(rep[0].approve_count||0)+1;
      db.run(`UPDATE replies SET approve_count=${nc} WHERE id='${replyId}'`);
      if(nc>=5){
        db.run(`UPDATE replies SET status='approved' WHERE id='${replyId}'`);
        const frag=rowsToArray(db.exec(`SELECT * FROM fragments WHERE id='${rep[0].fragment_id}'`));
        if(frag.length){
          const rc=frag[0].reply_count+1,st=stage(rc);
          db.run(`UPDATE fragments SET reply_count=${rc},growth_stage=${st} WHERE id='${rep[0].fragment_id}'`);
          io.emit('fragment_growth',{id:rep[0].fragment_id,growthStage:st,replyCount:rc});
          if(rc>=100) io.emit('halo_formed',{id:rep[0].fragment_id,posX:frag[0].pos_x,posY:frag[0].pos_y});
        }
      }
    }
  } else {
    db.run(`UPDATE replies SET status='rejected' WHERE id='${replyId}'`);
  }
  saveDb();
  res.json({message:'感谢守护'});
});

// 密钥找回
app.get('/api/my-stardust', (req, res) => {
  const {key}=req.query;
  if(!key) return res.status(400).json({error:'请输入密钥'});
  const r=rowsToArray(getDb().exec(`SELECT * FROM fragments WHERE key_hash='${hash(key)}'`));
  if(!r.length) return res.status(404).json({error:'未找到碎片'});
  const reps=rowsToArray(getDb().exec(`SELECT content,location,created_at FROM replies WHERE fragment_id='${r[0].id}' AND status='approved' ORDER BY created_at`));
  res.json({id:r[0].id,content:r[0].content,growthStage:r[0].growth_stage,replyCount:r[0].reply_count,viewerCount:r[0].viewer_count,createdAt:r[0].created_at,replies:reps});
});

// 守护者注册
app.post('/api/guardian/register', (req, res) => {
  const{id,contact}=req.body;
  if(!id||!contact) return res.status(400).json({error:'请填写昵称和联系方式'});
  const db=getDb();
  const ex=rowsToArray(db.exec(`SELECT id FROM guardians WHERE id='${id.replace(/'/g,"''")}'`));
  if(ex.length) return res.status(400).json({error:'昵称已被使用'});
  db.run(`INSERT INTO guardians(id,contact) VALUES('${id.replace(/'/g,"''")}','${contact.replace(/'/g,"''")}')`);
  saveDb();
  res.status(201).json({message:'注册成功'});
});

// 守护者排行榜
app.get('/api/guardian/leaderboard', (req, res) => {
  const r=rowsToArray(getDb().exec("SELECT id,points,contact_count,fail_count FROM guardians WHERE banned_until IS NULL OR banned_until<datetime('now','localtime') ORDER BY points ASC"));
  res.json(r);
});

// 守护者反馈
app.post('/api/guardian/feedback', (req, res) => {
  const{guardianId,result}=req.body;
  if(!['success','fail'].includes(result)) return res.status(400).json({error:'无效反馈'});
  const db=getDb();
  const g=rowsToArray(db.exec(`SELECT * FROM guardians WHERE id='${guardianId.replace(/'/g,"''")}'`));
  if(!g.length) return res.status(404).json({error:'守护者不存在'});
  const col=result==='success'?'contact_count':'fail_count';
  const pt=result==='success'?1:-1;
  db.run(`UPDATE guardians SET ${col}=${col}+1,points=points+${pt} WHERE id='${guardianId.replace(/'/g,"''")}'`);
  if((g[0].points||0)+pt<=-10){
    const ban=new Date(Date.now()+94608000000).toISOString();
    db.run(`UPDATE guardians SET banned_until='${ban}' WHERE id='${guardianId.replace(/'/g,"''")}'`);
  }
  saveDb();
  res.json({message:'感谢反馈'});
});

// 管理员
app.get('/api/admin/fragments', (req, res) => {
  if(req.query.pwd!=='stardust') return res.status(403).json({error:'无权限'});
  const r=rowsToArray(getDb().exec('SELECT id,content,reply_count,viewer_count,growth_stage,created_at FROM fragments ORDER BY created_at DESC'));
  res.json(r);
});
app.delete('/api/admin/fragment/:id', (req, res) => {
  if(req.query.pwd!=='stardust') return res.status(403).json({error:'无权限'});
  getDb().run(`DELETE FROM fragments WHERE id='${req.params.id}'`);
  saveDb();
  res.json({message:'已删除'});
});

// 健康检查
app.get('/api/health', (req, res) => {
  const db=getDb();
  const f=rowsToArray(db.exec('SELECT COUNT(*) as c FROM fragments'));
  const rp=rowsToArray(db.exec("SELECT COUNT(*) as c FROM replies WHERE status='pending'"));
  const rt=rowsToArray(db.exec('SELECT COUNT(*) as c FROM replies'));
  const g=rowsToArray(db.exec('SELECT COUNT(*) as c FROM guardians'));
  res.json({status:'ok',fragments:f[0].c,replies:rt[0].c,pending:rp[0].c,guardians:g[0].c});
});

// WebSocket
io.on('connection', s=>console.log('✦ 连接:',s.id));
io.on('disconnect', s=>console.log('○ 断开:',s.id));

// ==================== 启动 ====================
initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('✦ ━━━━━━━━━━━━━━━━━━━━━━━━━━ ✦');
    console.log('  星 尘 之 海  ·  S E A   O F   S T A R D U S T');
    console.log('✦ ━━━━━━━━━━━━━━━━━━━━━━━━━━ ✦');
    console.log(`  服务：http://localhost:${PORT}`);
    console.log('✦ ━━━━━━━━━━━━━━━━━━━━━━━━━━ ✦');
  });
});
