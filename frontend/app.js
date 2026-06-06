// ==================== 星尘之海 · 前端核心 ====================
let canvas, ctx, modals;
let width, height;
let cameraX = 0, cameraY = 0, zoom = 1;
let targetZoom = 1;
let isDragging = false, dragStartX, dragStartY, dragCamX, dragCamY;
let time = 0;
let hoveredFragment = null;

// 安全初始化：等 DOM 就绪后再获取元素
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('canvas');
  ctx = canvas ? canvas.getContext('2d') : null;
  modals = document.getElementById('modals');
  
  if (!canvas || !ctx) {
    console.error('Canvas 初始化失败');
    return;
  }
  
  resize();
  render();
  
  // 绑定「进入」按钮
  const enterBtn = document.getElementById('enterBtn');
  if (enterBtn) enterBtn.addEventListener('click', enterMap);

  // 绑定 canvas 事件（移到 DOMReady 后）
  bindCanvasEvents();
  
  // 自动从后端加载碎片
  setTimeout(async () => {
    await new Promise(r => setTimeout(r, 2000));
    if (typeof api !== 'undefined' && apiAvailable) {
      try {
        const list = await api.getAllFragments();
        list.forEach(item => {
          if (fragments.some(f => f.id === item.id)) return;
          fragments.push({
            id: item.id, content: null, keyHash: '', poemKey: '',
            posX: item.posX, posY: item.posY,
            growthStage: item.growthStage || 0,
            replyCount: item.replyCount || 0,
            viewerCount: item.viewerCount || 0,
            createdAt: item.createdAt,
            approvedReplies: []
          });
        });
        console.log('✦ 后台已加载', list.length, '块碎片');
      } catch (e) {
        console.log('○ 后台加载碎片失败:', e);
      }
    }
  }, 3000);
});

// ==================== 画布初始化 ====================
function resize() {
  if (!canvas) return;
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);

// ==================== 拖拽 & 缩放 ====================
function bindCanvasEvents() {
  if (!canvas) return;
  
  canvas.addEventListener('mousedown', e => {
    if (e.target !== canvas) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragCamX = cameraX;
    dragCamY = cameraY;
    document.body.classList.add('grabbing');
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    targetZoom = Math.max(0.3, Math.min(2, targetZoom - e.deltaY * 0.001));
  });

  // 触摸支持
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragCamX = cameraX;
      dragCamY = cameraY;
    }
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (isDragging && e.touches.length === 1) {
      cameraX = dragCamX - (e.touches[0].clientX - dragStartX) / zoom;
      cameraY = dragCamY - (e.touches[0].clientY - dragStartY) / zoom;
    }
  });
  canvas.addEventListener('touchend', () => { isDragging = false; });
  
  // 点击碎片
  canvas.addEventListener('click', e => {
    if (isDragging) return;
    if (hoveredFragment) {
      openFragmentModal(hoveredFragment);
    }
  });
  
  // 鼠标在 canvas 上的坐标 + hover 检测
  canvas.addEventListener('mousemove', e => {
    mouseCanvasX = e.clientX;
    mouseCanvasY = e.clientY;
    
    let found = null;
    for (const f of fragments) {
      const dist = Math.hypot(e.clientX - (f._screenX || 0), e.clientY - (f._screenY || 0));
      if (dist < (f._radius || 15) + 12) {
        found = f;
        break;
      }
    }
    if (hoveredFragment !== found) {
      hoveredFragment = found;
      canvas.style.cursor = found ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    }
  });
}

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  cameraX = dragCamX - dx / zoom;
  cameraY = dragCamY - dy / zoom;
  // 边界限制
  cameraX = Math.max(-2000, Math.min(2000, cameraX));
  cameraY = Math.max(-1500, Math.min(1500, cameraY));
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  document.body.classList.remove('grabbing');
});

// ==================== 星星层（三层视差） ====================
const starLayers = [
  [], // 远层 - 慢
  [], // 中层 - 中
  []  // 近层 - 快
];

for (let layer = 0; layer < 3; layer++) {
  const count = [400, 250, 120][layer];
  for (let i = 0; i < count; i++) {
    starLayers[layer].push({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 3000,
      r: (Math.random() * 1.2 + 0.3) * (layer + 1) * 0.7,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      brightness: Math.random() * 0.5 + 0.5,
      hue: [210, 230, 260, 280, 300][Math.floor(Math.random() * 5)]
    });
  }
}

// 星云
const nebulae = [];
for (let i = 0; i < 6; i++) {
  nebulae.push({
    x: (Math.random() - 0.5) * 3000,
    y: (Math.random() - 0.5) * 2500,
    r: Math.random() * 300 + 100,
    h: [220, 250, 280, 300][Math.floor(Math.random() * 4)],
    alpha: Math.random() * 0.08 + 0.03
  });
}

// ==================== 碎片数据 ====================
// 模拟的初始碎片（后续会从后端获取）
const fragments = [];

// 碎片数据——全部清空，等待用户提交
// 初始为空，无种子数据，无AI回音

// ==================== 渲染函数 ====================

// 绘制星云
function drawNebulae() {
  nebulae.forEach(n => {
    const sx = n.x * parallax(0.1) + width / 2 - cameraX * parallax(0.1);
    const sy = n.y * parallax(0.1) + height / 2 - cameraY * parallax(0.1);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.r);
    grad.addColorStop(0, `hsla(${n.h}, 60%, 40%, ${n.alpha * 3})`);
    grad.addColorStop(0.5, `hsla(${n.h}, 50%, 30%, ${n.alpha})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, n.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 视差系数
function parallax(factor) {
  return factor;
}

// 绘制星星层
function drawStars(layer, factor) {
  starLayers[layer].forEach(s => {
    const sx = s.x * factor + width / 2 - cameraX * factor;
    const sy = s.y * factor + height / 2 - cameraY * factor;
    
    // 视口裁剪
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) return;
    
    const brightness = s.brightness + Math.sin(time * s.twinkleSpeed + s.twinkle) * 0.3;
    const alpha = Math.max(0.2, brightness);
    
    ctx.fillStyle = `hsla(${s.hue}, 50%, 80%, ${alpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
    
    // 亮星加光晕
    if (brightness > 0.7) {
      ctx.fillStyle = `hsla(${s.hue}, 60%, 80%, ${alpha * 0.15})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 根据进化阶段获取碎片半径
function getFragmentRadius(stage) {
  return 12 + stage * 3; // 12-42px
}

// 根据进化阶段获取光环参数
function getHaloParams(stage) {
  if (stage < 2) return null;
  const innerR = getFragmentRadius(stage) + 4;
  const outerR = innerR + Math.min(stage * 3, 20);
  const alpha = Math.min(stage * 0.1, 1);
  const speed = 0.0005 + stage * 0.0003;
  return { innerR, outerR, alpha, speed, particles: Math.floor(stage * 2) };
}

// 绘制碎片（微行星）
function drawFragment(f) {
  const fx = f.posX + width / 2 - cameraX;
  const fy = f.posY + height / 2 - cameraY;
  const stage = f.growthStage;
  const radius = getFragmentRadius(stage);
  
  // 视口裁剪
  if (fx < -80 || fx > width + 80 || fy < -80 || fy > height + 80) return;
  
  // 检查是否 hover
  const dist = Math.hypot(fx - (mouseCanvasX || 0), fy - (mouseCanvasY || 0));
  const isHovered = dist < radius + 15;
  
  ctx.save();
  ctx.translate(fx, fy);
  
  // 自转
  const rotation = time * 0.002 + fragments.indexOf(f) * 1.5;
  
  // === 光环（stage >= 2） ===
  const halo = getHaloParams(stage);
  if (halo) {
    // 光环粒子
    const haloAngle = time * halo.speed;
    for (let i = 0; i < halo.particles; i++) {
      const angle = haloAngle + (i / halo.particles) * Math.PI * 2;
      const x = Math.cos(angle) * halo.outerR;
      const y = Math.sin(angle) * halo.outerR * 0.6; // 椭圆
      
      // 光环粒子颜色
      const hAlpha = 0.3 + Math.sin(time * 0.02 + i) * 0.2;
      ctx.fillStyle = `hsla(220, 60%, 80%, ${hAlpha})`;
      ctx.shadowColor = 'hsla(220, 60%, 80%, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // stage >= 5: 细光环
    if (stage >= 5) {
      ctx.beginPath();
      ctx.ellipse(0, 0, halo.outerR, halo.outerR * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(220, 50%, 70%, ${0.1 + stage * 0.05})`;
      ctx.lineWidth = 1 + (stage - 5) * 0.3;
      ctx.stroke();
    }
    
    // stage >= 6: 双环
    if (stage >= 6) {
      ctx.beginPath();
      ctx.ellipse(0, 0, halo.innerR, halo.innerR * 0.55, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(260, 50%, 70%, ${0.05 + stage * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  // === stage 10: 完整光环 ===
  if (stage === 10) {
    // 壮丽光环
    ctx.beginPath();
    ctx.ellipse(0, 0, radius + 25, (radius + 25) * 0.55, 0, 0, Math.PI * 2);
    const haloGrad = ctx.createLinearGradient(-radius - 25, 0, radius + 25, 0);
    haloGrad.addColorStop(0, 'hsla(220, 60%, 70%, 0.1)');
    haloGrad.addColorStop(0.3, 'hsla(240, 70%, 80%, 0.3)');
    haloGrad.addColorStop(0.5, 'hsla(260, 60%, 85%, 0.4)');
    haloGrad.addColorStop(0.7, 'hsla(280, 60%, 75%, 0.3)');
    haloGrad.addColorStop(1, 'hsla(220, 60%, 70%, 0.1)');
    ctx.strokeStyle = haloGrad;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 流动粒子环
    for (let i = 0; i < 60; i++) {
      const angle = time * 0.003 + (i / 60) * Math.PI * 2;
      const rx = radius + 23 + Math.sin(i * 0.5 + time * 0.01) * 3;
      const ry = (radius + 23) * 0.55 + Math.cos(i * 0.5 + time * 0.01) * 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      ctx.fillStyle = `hsla(${220 + i * 1.5}, 70%, ${70 + Math.sin(time * 0.03 + i) * 15}%, 0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // === 碎片本体 ===
  // 光晕
  const glowRadius = radius * 1.8;
  const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, glowRadius);
  glowGrad.addColorStop(0, stage >= 8 ? 'hsla(220, 60%, 80%, 0.5)' : 'hsla(230, 40%, 70%, 0.3)');
  glowGrad.addColorStop(0.5, 'hsla(240, 40%, 60%, 0.1)');
  glowGrad.addColorStop(1, 'transparent');
  
  if (isHovered) {
    glowGrad.addColorStop(0, 'hsla(210, 70%, 85%, 0.7)');
    glowGrad.addColorStop(0.3, 'hsla(220, 60%, 75%, 0.4)');
  }
  
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // 不规则行星体
  ctx.save();
  ctx.rotate(rotation);
  
  const bodyGrad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
  
  // 根据阶段调整颜色
  if (stage < 3) {
    bodyGrad.addColorStop(0, 'hsla(230, 30%, 60%, 0.8)');
    bodyGrad.addColorStop(1, 'hsla(250, 20%, 30%, 0.6)');
  } else if (stage < 7) {
    bodyGrad.addColorStop(0, 'hsla(220, 40%, 70%, 0.85)');
    bodyGrad.addColorStop(1, 'hsla(240, 30%, 40%, 0.7)');
  } else {
    bodyGrad.addColorStop(0, 'hsla(210, 50%, 80%, 0.9)');
    bodyGrad.addColorStop(0.5, 'hsla(230, 45%, 60%, 0.8)');
    bodyGrad.addColorStop(1, 'hsla(250, 30%, 35%, 0.7)');
  }
  
  ctx.fillStyle = bodyGrad;
  
  // 不规则形状
  ctx.beginPath();
  const segments = 16;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const irregularity = 1 + Math.sin(angle * 3.7) * 0.15 + Math.cos(angle * 5.1) * 0.1;
    const r = radius * (stage < 3 ? irregularity : (1 + (irregularity - 1) * (1 - stage * 0.08)));
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  
  // 表面纹理
  if (stage >= 4) {
    ctx.fillStyle = 'hsla(210, 50%, 70%, 0.15)';
    for (let i = 0; i < 3; i++) {
      const tx = (Math.sin(time * 0.005 + i * 2) * radius * 0.4);
      const ty = (Math.cos(time * 0.005 + i * 2.5) * radius * 0.4);
      ctx.beginPath();
      ctx.arc(tx, ty, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // stage 8: 脉动核
  if (stage >= 8) {
    const pulse = 1 + Math.sin(time * 0.03) * 0.2;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.3 * pulse);
    coreGrad.addColorStop(0, 'hsla(200, 70%, 90%, 0.6)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
  
  // hover 提示环
  if (isHovered && stage > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'hsla(210, 60%, 80%, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  
  // 零回应标记：微弱闪烁
  if (stage === 0 && f.replyCount === 0) {
    const flicker = Math.sin(time * 0.03) * 0.3 + 0.5;
    ctx.fillStyle = `hsla(210, 50%, 80%, ${flicker * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 回复数气泡
  if (f.replyCount > 0) {
    ctx.fillStyle = 'rgba(10, 16, 40, 0.7)';
    ctx.beginPath();
    ctx.arc(radius + 10, -radius - 5, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.replyCount, radius + 10, -radius - 5);
  }
  
  ctx.restore();
  
  // 存储屏幕坐标用于点击检测
  f._screenX = fx;
  f._screenY = fy;
  f._radius = radius;
}

// 鼠标在 canvas 上的坐标
let mouseCanvasX = 0, mouseCanvasY = 0;

// ==================== 主渲染循环 ====================
function render() {
  if (!ctx) return;
  time++;
  
  // 平滑缩放
  zoom += (targetZoom - zoom) * 0.1;
  
  ctx.clearRect(0, 0, width, height);
  
  // 背景底色
  ctx.fillStyle = '#030614';
  ctx.fillRect(0, 0, width, height);
  
  // 星云（远层）
  drawNebulae();
  
  // 三层星星
  drawStars(0, 0.3);
  drawStars(1, 0.6);
  drawStars(2, 1.0);
  
  // 缩放变换
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);
  
  // 绘制碎片
  fragments.forEach(f => drawFragment(f));
  
  ctx.restore();
  
  // 流星雨（偶尔）
  if (Math.random() < 0.005) {
    createMeteor();
  }
  drawMeteors();
  
  // 环境星尘粒子
  drawAmbientDust();

  // 引力波涟漪
  drawRippleWaves();
  
  requestAnimationFrame(render);
}

// ==================== 流星 ====================
const meteors = [];
function createMeteor() {
  const angle = Math.random() * Math.PI * 2; // 任意方向
  const speed = randomRange(0.5, 2);
  const totalLife = randomRange(200, 500);
  meteors.push({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: totalLife,
    maxLife: totalLife,
    decay: 1,
    length: randomRange(60, 150)
  });
}
function drawMeteors() {
  meteors.forEach((m, i) => {
    m.x += m.vx;
    m.y += m.vy;
    m.life -= m.decay;
    
    if (m.life <= 0) { meteors.splice(i, 1); return; }
    
    // 深入浅出：正弦曲线透明度 0→1→0
    const progress = m.life / m.maxLife;
    const alpha = Math.sin(progress * Math.PI) * 0.8;
    
    // 头部亮、尾部淡的渐变拖尾
    const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.length, m.y - m.vy * m.length);
    grad.addColorStop(0, `hsla(50, 100%, 90%, ${alpha})`);
    grad.addColorStop(0.3, `hsla(45, 100%, 80%, ${alpha * 0.6})`);
    grad.addColorStop(1, `hsla(40, 80%, 70%, ${alpha * 0.1})`);
    
    ctx.shadowColor = `hsla(50, 100%, 80%, ${alpha * 0.5})`;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * m.length, m.y - m.vy * m.length);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
}

// 回应化作流星注入星尘
function shootReplyMeteor(fragmentId) {
  const f = fragments.find(fr => fr.id === fragmentId);
  if (!f) return;
  const targetX = f.posX + width / 2 - cameraX;
  const targetY = f.posY + height / 2 - cameraY;
  const startX = Math.random() * width;
  const startY = -50;
  const steps = 60;
  const vx = (targetX - startX) / steps;
  const vy = (targetY - startY) / steps;
  meteors.push({
    x: startX, y: startY,
    vx, vy,
    life: 1,
    decay: 1 / steps,
    length: 60,
    hue: 40 + Math.floor(Math.random() * 20)
  });
}

// ==================== 环境星尘 ====================
const dustParticles = [];
for (let i = 0; i < 30; i++) {
  dustParticles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3 - 0.2,
    life: Math.random(),
    decay: Math.random() * 0.003 + 0.001,
    hue: randomRange(200, 280)
  });
}
function drawAmbientDust() {
  dustParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      p.x = Math.random() * width;
      p.y = height + 10;
      p.life = 1;
    }
    
    ctx.fillStyle = `hsla(${p.hue}, 50%, 80%, ${p.life * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ==================== 工具函数 ====================
function randomRange(min, max) { return Math.random() * (max - min) + min; }

// ==================== 每周3次限制 ====================
function checkWeeklyLimit() {
  updateSendHint();
  return true; // 测试阶段：无限次发送
}

function recordSendAttempt() {
  return; // 测试阶段：不计数
}

// 剩余次数提示
let sendHintEl = null;
function updateSendHint() {
  if (!sendHintEl) {
    sendHintEl = document.getElementById('sendHint');
    if (!sendHintEl) return;
  }
  sendHintEl.textContent = '测试阶段 · 无限次发送';
  sendHintEl.style.color = 'rgba(180,200,230,0.2)';
}

// ==================== 管理员控制台 ====================
let adminUnlocked = false;
let fastClickCount = 0;
let fastClickTimer = null;

// 双击 Logo 触发管理员入口
function triggerAdminEntry() {
  fastClickCount++;
  if (fastClickTimer) clearTimeout(fastClickTimer);
  fastClickTimer = setTimeout(() => { fastClickCount = 0; }, 3000);
  
  if (fastClickCount >= 3) {
    fastClickCount = 0;
    promptAdminPassword();
  }
}

function promptAdminPassword() {
  if (adminUnlocked) { openAdminConsole(); return; }
  
  const html = `
    <h2>✦ 管理员验证</h2>
    <p style="color:rgba(200,210,230,0.4);font-size:12px;text-align:center;margin-bottom:20px;">请输入管理密码</p>
    <input id="adminPwdInput" type="password" placeholder="密码"
      style="width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(140,180,255,0.2);border-radius:10px;padding:14px;color:rgba(220,230,255,0.8);font-size:16px;outline:none;text-align:center;"
      onkeydown="if(event.key==='Enter')checkAdminPassword()">
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn-primary" onclick="checkAdminPassword()">✦ 验证</button>
    </div>
  `;
  showModal(html);
}

function checkAdminPassword() {
  const pwd = document.getElementById('adminPwdInput').value;
  if (pwd === 'stardust') {
    adminUnlocked = true;
    updateSendHint();
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
    openAdminConsole();
  } else {
    const msg = document.querySelector('.modal h2');
    if (msg) msg.textContent = '✧ 密码错误';
  }
}

function openAdminConsole() {
  const now = Date.now();
  
  // 数据分类
  const totalFragments = fragments.length;
  const totalReplies = fragments.reduce((s, f) => s + f.approvedReplies.length, 0);
  const totalPending = pendingReplies.length;
  
  // 高风险碎片：查看数高但回应少 / 含负面关键词
  const riskKeywords = ['死','自杀','活不下去','结束','痛','撑不下去','绝望'];  
  const highRisk = fragments.filter(f => {
    const hasKeyword = riskKeywords.some(k => f.content.includes(k));
    const highViewLowReply = f.viewerCount > 50 && f.approvedReplies.length === 0;
    return hasKeyword || highViewLowReply;
  });
  
  // 长时间无人回应：3天以上无回应
  const nowStr = new Date().toISOString().split('T')[0];
  const longUnanswered = fragments.filter(f => {
    if (f.approvedReplies.length > 0) return false;
    const days = (Date.parse(nowStr) - Date.parse(f.createdAt)) / 86400000;
    return days >= 3;
  });
  
  // 全部回应
  const allReplies = [];
  fragments.forEach(f => {
    f.approvedReplies.forEach(r => {
      allReplies.push({ fragmentId: f.id, content: f.content.substring(0,30), reply: r.content, location: r.location, time: f.createdAt });
    });
  });
  
  const html = `
    <h2>✦ 总控制台</h2>
    <p style="color:rgba(180,200,230,0.25);font-size:10px;text-align:center;letter-spacing:2px;margin-bottom:16px;">管理员可见 · 所有星尘与回应</p>
    
    <!-- 统计卡片 -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px;">
      <div style="background:rgba(20,26,50,0.5);border-radius:8px;padding:10px;text-align:center;">
        <p style="color:rgba(200,215,240,0.35);font-size:9px;letter-spacing:2px;">碎片</p>
        <p style="color:rgba(200,215,240,0.8);font-size:18px;">${totalFragments}</p>
      </div>
      <div style="background:rgba(20,26,50,0.5);border-radius:8px;padding:10px;text-align:center;">
        <p style="color:rgba(200,215,240,0.35);font-size:9px;letter-spacing:2px;">回应</p>
        <p style="color:rgba(200,215,240,0.8);font-size:18px;">${totalReplies}</p>
      </div>
      <div style="background:rgba(180,180,200,0.08);border-radius:8px;padding:10px;text-align:center;">
        <p style="color:rgba(200,215,240,0.35);font-size:9px;letter-spacing:2px;">待审</p>
        <p style="color:rgba(200,215,240,0.8);font-size:18px;">${totalPending}</p>
      </div>
    </div>
    
    <!-- 高风险告警 -->
    ${highRisk.length > 0 ? `
    <details style="margin-bottom:12px;" open>
      <summary style="cursor:pointer;color:rgba(220,160,160,0.7);font-size:12px;letter-spacing:2px;padding:8px;background:rgba(200,80,80,0.06);border-radius:8px;">⚠️ 高风险碎片 (${highRisk.length})</summary>
      <div style="margin-top:6px;">${highRisk.map(f => `
        <div style="background:rgba(200,80,80,0.06);border-left:2px solid rgba(200,80,80,0.4);border-radius:6px;padding:10px;margin-bottom:4px;">
          <p style="color:rgba(220,200,200,0.7);font-size:12px;line-height:1.6;">${escapeHtml(f.content.length > 80 ? f.content.substring(0,80)+'...' : f.content)}</p>
          <p style="color:rgba(200,180,180,0.25);font-size:10px;margin-top:4px;">查看 ${f.viewerCount} · 回应 ${f.approvedReplies.length} · ${f.createdAt}</p>
          <button onclick="deleteFragment('${f.id}')" style="background:rgba(200,80,80,0.2);border:1px solid rgba(200,80,80,0.3);border-radius:4px;padding:2px 8px;color:rgba(220,160,160,0.6);cursor:pointer;font-size:10px;margin-top:4px;">删除</button>
        </div>
      `).join('')}</div>
    </details>
    ` : ''}
    
    <!-- 长时间无人回应 -->
    ${longUnanswered.length > 0 ? `
    <details style="margin-bottom:12px;" open>
      <summary style="cursor:pointer;color:rgba(200,180,140,0.7);font-size:12px;letter-spacing:2px;padding:8px;background:rgba(200,180,100,0.06);border-radius:8px;">⏳ 长时间无人回应 (${longUnanswered.length})</summary>
      <div style="margin-top:6px;">${longUnanswered.map(f => `
        <div style="background:rgba(200,180,100,0.04);border-left:2px solid rgba(200,180,100,0.3);border-radius:6px;padding:10px;margin-bottom:4px;">
          <p style="color:rgba(220,210,190,0.6);font-size:12px;line-height:1.6;">${escapeHtml(f.content.length > 80 ? f.content.substring(0,80)+'...' : f.content)}</p>
          <p style="color:rgba(200,200,180,0.2);font-size:10px;margin-top:4px;">发布 ${f.createdAt} · 查看 ${f.viewerCount}</p>
          <button onclick="deleteFragment('${f.id}')" style="background:rgba(200,180,100,0.15);border:1px solid rgba(200,180,100,0.25);border-radius:4px;padding:2px 8px;color:rgba(220,210,180,0.5);cursor:pointer;font-size:10px;margin-top:4px;">删除</button>
        </div>
      `).join('')}</div>
    </details>
    ` : ''}
    
    <!-- 全部星尘与回应 -->
    <details style="margin-bottom:12px;" open>
      <summary style="cursor:pointer;color:rgba(180,200,230,0.5);font-size:12px;letter-spacing:2px;padding:8px;background:rgba(20,26,50,0.3);border-radius:8px;">📜 全部星尘与回应</summary>
      <div style="margin-top:6px;max-height:300px;overflow-y:auto;">
        ${fragments.length === 0 ? '<p style="color:rgba(200,210,230,0.2);text-align:center;padding:20px;font-size:12px;">暂无星尘</p>' :
          fragments.map(f => `
          <div style="background:rgba(20,26,50,0.3);border-radius:8px;padding:10px;margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div style="flex:1;min-width:0;">
                <p style="color:rgba(200,215,240,0.7);font-size:12px;line-height:1.6;">${escapeHtml(f.content)}</p>
                <p style="color:rgba(180,200,230,0.2);font-size:10px;margin-top:4px;">${f.createdAt} · 回应 ${f.approvedReplies.length} · 查看 ${f.viewerCount}</p>
                ${f.approvedReplies.length > 0 ? `
                <div style="margin-top:6px;padding-left:12px;border-left:1px solid rgba(140,180,255,0.15);">
                  ${f.approvedReplies.map(r => `
                    <p style="color:rgba(180,200,230,0.4);font-size:11px;line-height:1.6;margin-bottom:2px;">↳ ${escapeHtml(r.content)} <span style="color:rgba(180,200,230,0.15);font-size:9px;">${r.location}</span></p>
                  `).join('')}
                </div>` : ''}
              </div>
              <button onclick="deleteFragment('${f.id}')" style="background:rgba(200,80,80,0.12);border:1px solid rgba(200,80,80,0.25);border-radius:4px;padding:2px 8px;color:rgba(220,160,160,0.5);cursor:pointer;font-size:10px;flex-shrink:0;margin-left:8px;">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    </details>
    
    <p style="color:rgba(180,200,230,0.15);font-size:9px;text-align:center;margin-top:8px;">点击 Logo 3 次重新打开 · 仅管理员可见</p>
    <div class="btn-row" style="margin-top:8px;">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">关闭</button>
    </div>
  `;
  showModal(html);
}

function deleteFragment(fragmentId) {
  if (!confirm('确认删除此碎片？')) return;
  const idx = fragments.findIndex(f => f.id === fragmentId);
  if (idx !== -1) {
    fragments.splice(idx, 1);
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
    openAdminConsole();
  }
}

function generatePoemKey() {
  const pool1 = ['苔藓','露水','微光','麦浪','孤岛','星辰','流星','月光','晨星','晚霞',
                 '琥珀','风铃','灯塔','潮汐','森林','海鸥','涟漪','薄雾','萤火','极光'];
  const pool2 = ['鹿鸣','飞鸟','鲸落','蝴蝶','蝉鸣','溪流','雪花','云朵','鸽子','铃兰',
                 '琥珀','星尘','浪花','秋叶','春风','夏雨','冬雪','彩虹','山脉','河流'];
  const pool3 = ['薄雾','星尘','夜空','海洋','山谷','潮汐','微风','月光','晨曦','晚风',
                 '晨星','暮色','森林','草原','极光','霞光','雨滴','霜花','露珠','虹彩'];
  
  const p1 = pool1[Math.floor(Math.random() * pool1.length)];
  const p2 = pool2[Math.floor(Math.random() * pool2.length)];
  const p3 = pool3[Math.floor(Math.random() * pool3.length)];
  
  return `${p1}-${p2}-${p3}`;
}

// ==================== 弹窗系统 ====================

function showModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay);
  });
  
  modals.appendChild(overlay);
  document.getElementById('hint').style.opacity = '0';
  
  return overlay;
}

function closeModal(overlay) {
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.3s';
  setTimeout(() => overlay.remove(), 300);
  document.getElementById('hint').style.opacity = '1';
}

// 倾诉弹窗
function openTellModal() {
  // 先检查每周限制
  if (!checkWeeklyLimit()) return;
  
  const html = `
    <h2>✦ 寄出一块碎片</h2>
    <p style="color:rgba(200,210,230,0.5);font-size:12px;text-align:center;margin-bottom:16px;letter-spacing:2px;">
      在这里，痛苦不需要被修复。它只需要被寄出，被看见。
    </p>
    <textarea id="tellInput" maxlength="500" placeholder="写下你想说的话...（最多500字）"
      oninput="document.getElementById('tellCount').textContent = this.value.length"></textarea>
    <div class="char-count"><span id="tellCount">0</span> / 500</div>
    <div style="margin-top:12px;text-align:center;">
      <label style="color:rgba(200,210,230,0.5);font-size:12px;">
        如需接收回应合集，可填写加密邮箱（非必填）
      </label>
      <input id="tellEmail" type="email" placeholder="your@email.com（非必填）"
        style="width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(100,140,255,0.15);
        border-radius:10px;padding:10px 15px;color:rgba(220,230,255,0.7);font-size:13px;outline:none;
        margin-top:8px;font-family:inherit;">
    </div>
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">取消</button>
      <button class="btn-primary" onclick="submitFragment()">✦ 寄出</button>
    </div>
  `;
  showModal(html);
}

function submitFragment() {
  const content = document.getElementById('tellInput').value.trim();
  const email = document.getElementById('tellEmail').value.trim();
  
  if (!content) return;

  // 每周3次限制
  if (!checkWeeklyLimit()) return;
  
  // 关闭倾诉弹窗
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  // 通过 API 持久化到后端数据库
  let poemKey = '';
  if (typeof api !== 'undefined' && apiAvailable) {
    api.createFragment(content, email || undefined).then(data => {
      const newFragment = {
        id: data.id,
        content: content,
        poemKey: data.poemKey,
        posX: data.posX || (Math.random() - 0.5) * 600,
        posY: data.posY || (Math.random() - 0.5) * 400,
        growthStage: 0,
        replyCount: 0,
        viewerCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        approvedReplies: []
      };
      poemKey = data.poemKey;
      fragments.push(newFragment);
      // 飞行动画后显示密钥
      setTimeout(() => { showKeyModal(poemKey, email); }, 1500);
    }).catch(err => {
      console.error('创建碎片失败，回退本地模式:', err);
      fallbackLocalFragment(content, email);
    });
  } else {
    fallbackLocalFragment(content, email);
  }
  
  // 记录发送
  recordSendAttempt();
}

// 本地模式回退
function fallbackLocalFragment(content, email) {
  const poemKey = generatePoemKey();
  const newFragment = {
    id: 'f' + Date.now(),
    content, poemKey,
    posX: (Math.random() - 0.5) * 600,
    posY: (Math.random() - 0.5) * 400,
    growthStage: 0, replyCount: 0, viewerCount: 0,
    createdAt: new Date().toISOString().split('T')[0],
    approvedReplies: []
  };
  fragments.push(newFragment);
  setTimeout(() => { showKeyModal(poemKey, email); }, 1500);
}

function showKeyModal(poemKey, email) {
  const html = `
    <h2>✦ 碎片已寄出</h2>
    <div class="key-display">
      <p style="color:rgba(200,210,230,0.6);font-size:13px;">你的诗歌密钥</p>
      <div class="poem-key" id="poemKeyDisplay">${poemKey}</div>
      <button onclick="copyPoemKey()" style="background:rgba(140,180,255,0.1);border:1px solid rgba(140,180,255,0.25);border-radius:16px;padding:8px 20px;color:rgba(200,215,240,0.7);cursor:pointer;font-size:12px;letter-spacing:2px;margin:8px 0 16px;transition:all 0.3s;">📋 复制密钥</button>
      <p style="color:rgba(200,210,230,0.5);font-size:12px;">
        这是你未来寻回碎片的唯一凭证
      </p>
      <p class="warning">
        ⚠️ 请务必保存！我们不会存储你的任何个人信息。<br>
        如果丢失，碎片将永远漂流在星海中。
      </p>
      ${email ? `<p style="color:rgba(150,200,230,0.5);font-size:12px;margin-top:12px;">当碎片获得100条回应时，合集将发送至 ${email}</p>` : ''}
    </div>
    <div class="btn-row">
      <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">我已记下</button>
    </div>
  `;
  showModal(html);
}

function copyPoemKey() {
  const keyDiv = document.getElementById('poemKeyDisplay');
  if (!keyDiv) return;
  const text = keyDiv.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = keyDiv.nextElementSibling;
    if (btn) { btn.textContent = '✓ 已复制'; btn.style.borderColor = 'rgba(100,200,150,0.5)'; btn.style.color = 'rgba(150,220,180,0.8)'; }
    setTimeout(() => { if (btn) { btn.textContent = '📋 复制密钥'; btn.style.borderColor = ''; btn.style.color = ''; } }, 2000);
  }).catch(() => {
    // fallback: 选中文本
    const range = document.createRange(); range.selectNode(keyDiv);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
  });
}

// 碎片详情弹窗
function openFragmentModal(f) {
  f.viewerCount++;

  // 如果内容为空（从 API/WebSocket 加载的初始数据），从后端获取
  if (!f.content && typeof api !== 'undefined' && apiAvailable) {
    api.getFragment(f.id).then(data => {
      // 用 API 返回的数据更新本地
      f.content = data.content;
      f.growthStage = data.growthStage || f.growthStage;
      f.replyCount = data.replyCount || f.replyCount;
      f.viewerCount = data.viewerCount || f.viewerCount;
      f.createdAt = data.createdAt || f.createdAt;
      if (data.replies) {
        f.approvedReplies = data.replies.map(r => ({
          content: r.content,
          location: r.location || '不愿透露'
        }));
      }
      // 重新打开弹窗
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.remove();
      renderFragmentModal(f);
    }).catch(() => {
      // 如果获取失败，显示暂无内容
      f.content = '（内容加载失败）';
      renderFragmentModal(f);
    });
    return;
  }
  
  renderFragmentModal(f);
}

function renderFragmentModal(f) {
  const stageNames = ['碎片','微行星','光晕星','星尘吸引','尘埃环雏形','细光环','双环','环流','脉动核','共振前兆','完整光环'];
  const stageName = stageNames[Math.min(f.growthStage, 10)];
  
  let repliesHtml = '';
  if (f.approvedReplies.length > 0) {
    repliesHtml = f.approvedReplies.map(r => `
      <div class="reply-item">
        <div>"${escapeHtml(r.content)}"</div>
        <div class="location">—— ${r.location}</div>
      </div>
    `).join('');
  } else {
    repliesHtml = `<p style="color:rgba(200,210,230,0.2);font-size:12px;text-align:center;padding:20px;">暂无回应。</p>`;
  }
  
  const html = `
    <h2>✦ 一块宇宙碎片</h2>
    <div class="stage-badge">${stageName} · ${f.replyCount} 条回应</div>
    <div class="fragment-content">${escapeHtml(f.content)}</div>
    <div class="reply-list">
      <p style="color:rgba(180,200,230,0.4);font-size:11px;letter-spacing:2px;margin-bottom:12px;">
        —— 星尘回响 ——
      </p>
      ${repliesHtml}
    </div>
    <div class="btn-row" style="margin-top:24px;">
      ${f.replyCount < 100 ? `<button class="btn-primary" onclick="openReplyModal('${f.id}')">✦ 洒下星尘</button>` : ''}
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">关闭</button>
    </div>
  `;
  showModal(html);
}

// 回应弹窗
function openReplyModal(fragmentId) {
  const f = fragments.find(fr => fr.id === fragmentId);
  if (!f) return;
  
  // 先关闭当前弹窗
  const currentOverlay = document.querySelector('.modal-overlay');
  if (currentOverlay) currentOverlay.remove();
  
  const html = `
    <h2>✦ 洒下一粒星尘</h2>
    <p style="color:rgba(200,210,230,0.5);font-size:12px;text-align:center;margin-bottom:16px;letter-spacing:2px;">
      你的善意会成为环绕碎片的光。
    </p>
    <textarea id="replyInput" maxlength="300" placeholder="留下你善意的回应...（最多300字）"
      oninput="document.getElementById('replyCount').textContent = this.value.length"></textarea>
    <div class="char-count"><span id="replyCount">0</span> / 300</div>
    <div style="margin-top:12px;">
      <select id="replyLocation" style="width:100%;background:rgba(2,4,14,0.8);border:1px solid rgba(100,140,255,0.2);border-radius:10px;padding:10px 15px;color:rgba(200,210,230,0.7);font-size:13px;outline:none;font-family:inherit;">
        <option value="不愿透露">不愿透露</option>
        <option value="北京">北京</option>
        <option value="上海">上海</option>
        <option value="广东·广州">广东·广州</option>
        <option value="广东·深圳">广东·深圳</option>
        <option value="四川·成都">四川·成都</option>
        <option value="浙江·杭州">浙江·杭州</option>
        <option value="湖北·武汉">湖北·武汉</option>
        <option value="陕西·西安">陕西·西安</option>
        <option value="山东·青岛">山东·青岛</option>
        <option value="江苏·南京">江苏·南京</option>
        <option value="湖南·长沙">湖南·长沙</option>
        <option value="重庆">重庆</option>
        <option value="天津">天津</option>
        <option value="福建·厦门">福建·厦门</option>
        <option value="福建·福州">福建·福州</option>
        <option value="辽宁·大连">辽宁·大连</option>
        <option value="辽宁·沈阳">辽宁·沈阳</option>
        <option value="河南·郑州">河南·郑州</option>
        <option value="安徽·合肥">安徽·合肥</option>
        <option value="云南·昆明">云南·昆明</option>
        <option value="广西·南宁">广西·南宁</option>
        <option value="黑龙江·哈尔滨">黑龙江·哈尔滨</option>
        <option value="吉林·长春">吉林·长春</option>
        <option value="甘肃·兰州">甘肃·兰州</option>
        <option value="贵州·贵阳">贵州·贵阳</option>
        <option value="海南·海口">海南·海口</option>
        <option value="新疆·乌鲁木齐">新疆·乌鲁木齐</option>
        <option value="西藏·拉萨">西藏·拉萨</option>
        <option value="中国台湾·台北">中国台湾·台北</option>
        <option value="香港">香港</option>
        <option value="澳门">澳门</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">取消</button>
      <button class="btn-primary" onclick="submitReply('${fragmentId}')">✦ 送出星尘</button>
    </div>
  `;
  showModal(html);
}

// 待审核回应池（全局）
let pendingReplies = [];

function submitReply(fragmentId) {
  const content = document.getElementById('replyInput').value.trim();
  const location = document.getElementById('replyLocation').value;
  
  if (!content) return;
  
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  // 通过 API 提交回应
  if (typeof api !== 'undefined' && apiAvailable) {
    api.submitReply(fragmentId, content, location).then(data => {
      // 本地也放一个进待审核池
      pendingReplies.push({
        id: data.id || ('r_' + Date.now()),
        fragmentId, content, location, approveCount: 0
      });
    }).catch(err => {
      console.error('提交回应失败:', err);
      pendingReplies.push({
        id: 'r_' + Date.now(), fragmentId, content, location, approveCount: 0
      });
    });
  } else {
    pendingReplies.push({
      id: 'r_' + Date.now(), fragmentId, content, location, approveCount: 0
    });
  }

  // 获取 fragment 对象用于流星动画
  const f = fragments.find(fr => fr.id === fragmentId);
  
  // 反馈
  const html = `
    <h2>✦ 星尘已送出</h2>
    <div style="text-align:center;padding:20px;">
      <p style="color:rgba(200,210,230,0.6);font-size:14px;line-height:2;">
        你的星尘正在飞向那块碎片。<br>
        等待守护者审核通过后，它会成为环绕碎片的一缕光。
      </p>
    </div>
    <div class="btn-row">
      <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1';shootReplyMeteor('${fragmentId}')">继续漫游</button>
    </div>
  `;
  showModal(html);
}

function updateGrowthStage(f) {
  const stages = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (let i = stages.length - 1; i >= 0; i--) {
    if (f.replyCount >= stages[i]) {
      f.growthStage = i;
      break;
    }
  }
}

// 引力波涟漪（光环形成时的全服事件）
const rippleWaves = [];
function triggerRippleWave(fragment) {
  rippleWaves.push({
    x: fragment.posX + width / 2 - cameraX,
    y: fragment.posY + height / 2 - cameraY,
    radius: 0,
    maxRadius: 600,
    alpha: 1,
    speed: 4
  });
}
function drawRippleWaves() {
  rippleWaves.forEach((w, i) => {
    w.radius += w.speed;
    w.alpha = 1 - w.radius / w.maxRadius;
    if (w.radius >= w.maxRadius) {
      rippleWaves.splice(i, 1);
      return;
    }
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(220, 70%, 80%, ${w.alpha * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 内环
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(240, 60%, 85%, ${w.alpha * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 粒子波纹
    for (let j = 0; j < 12; j++) {
      const angle = (j / 12) * Math.PI * 2 + w.radius * 0.01;
      const x = w.x + Math.cos(angle) * w.radius;
      const y = w.y + Math.sin(angle) * w.radius;
      ctx.fillStyle = `hsla(${220 + j * 10}, 60%, 85%, ${w.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 心门邮件模板预览
function showHeartDoorEmail(fragment) {
  const html = `
    <h2>✦ 心门邮件预览</h2>
    <div style="background:rgba(20,26,50,0.6);border-radius:12px;padding:24px;margin:16px 0;color:rgba(200,210,230,0.75);font-size:13px;line-height:2.2;border:1px solid rgba(100,140,255,0.15);">
      <p style="text-align:center;color:rgba(180,200,230,0.6);font-size:11px;letter-spacing:2px;margin-bottom:16px;">—— 邮件主题 ——</p>
      <p style="text-align:center;font-size:15px;color:rgba(200,220,240,0.85);">你寄出的那块碎片，如今已有光环环绕</p>
      <hr style="border-color:rgba(255,255,255,0.05);margin:16px 0;">
      <p>你好，星尘旅人。</p>
      <p>你曾在 <strong>${fragment.createdAt}</strong> 寄出一块碎片。现在，在引力之海中，它有 <strong>100 份回响</strong> 凝聚成环。</p>
      <p style="margin-top:16px;padding:12px;background:rgba(255,200,100,0.08);border-radius:8px;font-style:italic;color:rgba(255,200,150,0.7);">
        ⚠️ 这些文字承载着真实的情感重量。如果你现在独自一人，或感觉不太安稳，可以先收藏这封邮件，等待一个阳光温和的下午，身边有一杯温水时，再打开它。
      </p>
      <div style="text-align:center;margin:20px 0;">
        <button style="background:rgba(100,140,255,0.2);border:1px solid rgba(100,140,255,0.4);border-radius:20px;padding:10px 24px;color:rgba(220,230,255,0.8);cursor:pointer;font-size:13px;letter-spacing:2px;">
          ✦ 我已准备好，开启回响
        </button>
      </div>
      <p style="font-size:11px;color:rgba(200,210,230,0.3);text-align:center;margin-top:16px;">
        点击后将展开全部 100 条回应
      </p>
    </div>
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">关闭</button>
    </div>
  `;
  showModal(html);
}

// ==================== 守护者系统 ====================

// ==================== 守护者系统 ====================
// 守护者数据（localStorage 持久化）
function getGuardians() {
  try { return JSON.parse(localStorage.getItem('stardust_guardians')) || []; }
  catch(e) { return []; }
}
function saveGuardians(list) {
  localStorage.setItem('stardust_guardians', JSON.stringify(list));
}

function openGuardianPreview() {
  const guardians = getGuardians();
  const localId = localStorage.getItem('stardust_guardian_id');
  const myGuardian = guardians.find(g => g.id === localId);
  
  // 检查是否被封禁
  if (myGuardian && myGuardian.bannedUntil && Date.now() < myGuardian.bannedUntil) {
    const until = new Date(myGuardian.bannedUntil).toLocaleDateString('zh-CN');
    showModal(`<h2>✧ 守护者资格已暂停</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(220,180,180,0.7);font-size:14px;line-height:2;">因多次无法联系，你的守护者资格已被取消。</p><p style="color:rgba(180,200,230,0.4);font-size:12px;margin-top:12px;">${until} 后方可重新申请。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">我知道了</button></div>`);
    return;
  }
  
  if (localId && myGuardian) {
    // 已是守护者 → 显示排行榜
    showGuardianLeaderboard();
  } else {
    // 未加入 → 显示注册
    showGuardianRegister();
  }
}

function showGuardianRegister() {
  const html = `
    <h2>✦ 成为守护者</h2>
    <p style="color:rgba(200,210,230,0.4);font-size:12px;text-align:center;letter-spacing:2px;margin-bottom:20px;">守护善意，需要一颗愿意倾听的心。</p>
    <p style="color:rgba(200,210,230,0.25);font-size:11px;margin-bottom:12px;">守护者昵称</p>
    <input id="guardianIdInput" maxlength="20" placeholder="请输入你的守护者昵称"
      style="width:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(140,180,255,0.15);border-radius:10px;padding:12px 14px;color:rgba(220,230,255,0.7);font-size:13px;outline:none;">
    <p style="color:rgba(200,210,230,0.25);font-size:11px;margin:12px 0 4px;">联系方式（展示给需要帮助的用户）</p>
    <input id="guardianContactInput" maxlength="100" placeholder="微信号 / 手机号 / 邮箱"
      style="width:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(140,180,255,0.15);border-radius:10px;padding:12px 14px;color:rgba(220,230,255,0.7);font-size:13px;outline:none;margin-bottom:8px;">
    <p style="color:rgba(180,200,230,0.2);font-size:10px;line-height:1.8;margin-bottom:12px;">
      ⚠️ 联系方式将展示给需要联系你的用户。<br>
      用户可反馈「联系上」或「联系不上」。<br>
      被反馈「联系不上」累计 10 次 → 取消守护者资格，3年内不可申请。
    </p>
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn-primary" onclick="registerGuardian()">✦ 成为守护者</button>
    </div>
  `;
  showModal(html);
}

function registerGuardian() {
  const id = document.getElementById('guardianIdInput').value.trim();
  const contact = document.getElementById('guardianContactInput').value.trim();
  if (!id || !contact) return;
  
  const guardians = getGuardians();
  const newGuardian = {
    id, contact, points: 0,
    bannedUntil: null,
    createdAt: new Date().toISOString(),
    contactCount: 0,     // 联系上次数
    failCount: 0,          // 联系不上次数
  };
  guardians.push(newGuardian);
  saveGuardians(guardians);
  localStorage.setItem('stardust_guardian_id', id);
  
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
  const btn = document.querySelector('#actions button:nth-child(2)');
  if (btn) btn.style.color = 'rgba(150,220,200,0.9)';
  
  showModal(`<h2>✦ 成为守护者</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(200,210,230,0.7);font-size:14px;line-height:2;">感谢你，${escapeHtml(id)}。<br>你愿意守护这片星空的善意。</p><p style="color:rgba(180,200,230,0.4);font-size:12px;margin-top:12px;">你的联系方式已登记。<br>需要帮助的用户将能看到你。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove();showGuardianLeaderboard()">✦ 查看排行榜</button></div>`);
}

// 排行榜
function showGuardianLeaderboard() {
  let guardians = getGuardians();
  // 移除非活跃（未联系/被封禁清理），但保留被封禁中的
  const now = Date.now();
  guardians = guardians.filter(g => !g.bannedUntil || now < g.bannedUntil);
  // 按分数从小到大排序（最低分靠前）
  guardians.sort((a, b) => {
    if (a.bannedUntil && now < a.bannedUntil) return 1;
    if (b.bannedUntil && now < b.bannedUntil) return -1;
    return (a.points || 0) - (b.points || 0);
  });
  
  const localId = localStorage.getItem('stardust_guardian_id');
  const isGuardian = !!localId && guardians.some(g => g.id === localId);
  
  const html = `
    <h2>✦ 守护者排行榜</h2>
    <p style="color:rgba(200,210,230,0.3);font-size:10px;text-align:center;letter-spacing:2px;margin-bottom:16px;">每月1日重置 · 按分数排序（↓ 低分靠前）</p>
    <div style="max-height:320px;overflow-y:auto;">
      ${guardians.length === 0 ? '<p style="color:rgba(180,200,230,0.2);text-align:center;padding:30px;">暂无守护者</p>' : 
        guardians.map((g, i) => `
        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
          <span style="color:rgba(180,200,230,0.3);font-size:11px;width:30px;flex-shrink:0;text-align:center;">${i+1}</span>
          <span style="color:${g.bannedUntil && now < g.bannedUntil ? 'rgba(220,160,160,0.4)' : 'rgba(200,215,240,0.6)'};font-size:13px;flex:1;">
            ${escapeHtml(g.id)}${g.id === localId ? ' ← 你' : ''}
            ${g.bannedUntil && now < g.bannedUntil ? ' (已暂停)' : ''}
          </span>
          <span style="color:rgba(180,200,230,0.4);font-size:11px;flex-shrink:0;">
            ${g.contactCount || 0}✓ / ${g.failCount || 0}✗
          </span>
        </div>
      `).join('')}
    </div>
    ${!isGuardian ? `<div class="btn-row" style="margin-top:16px;"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove();showGuardianRegister()">✦ 加入守护者</button></div>` : ''}
    <div class="btn-row" style="${isGuardian ? 'margin-top:16px;' : 'margin-top:8px;'}">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">关闭</button>
    </div>
  `;
  showModal(html);
}

// 用户入口：挑选守护者（三选一）
function showGuardianPick() {
  let guardians = getGuardians();
  const now = Date.now();
  // 只显示未被封禁的
  guardians = guardians.filter(g => !g.bannedUntil || now >= g.bannedUntil);
  if (guardians.length === 0) {
    showModal(`<h2>✦ 暂无守护者</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(200,210,230,0.5);font-size:14px;line-height:2;">当前没有可联系的守护者。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">关闭</button></div>`);
    return;
  }
  
  // 随机选3个
  const shuffled = [...guardians].sort(() => Math.random() - 0.5);
  const batch = shuffled.slice(0, 3);
  
  const html = `
    <h2>✦ 选择守护者</h2>
    <p style="color:rgba(200,210,230,0.3);font-size:11px;text-align:center;letter-spacing:2px;margin-bottom:16px;">从以下守护者中选一位联系</p>
    ${batch.map(g => `
      <div style="background:rgba(20,26,50,0.4);border-radius:10px;padding:14px;margin-bottom:8px;border:1px solid rgba(140,180,255,0.08);cursor:pointer;
        " onclick="pickGuardian('${g.id}', '${escapeHtml(g.contact)}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(200,215,240,0.6);font-size:13px;">${escapeHtml(g.id)}</span>
          <span style="color:rgba(180,200,230,0.25);font-size:10px;">分数：${g.points || 0}</span>
        </div>
      </div>
    `).join('')}
    <div class="btn-row" style="margin-top:12px;">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();showGuardianPick()">换一批</button>
    </div>
  `;
  showModal(html);
}

function pickGuardian(gId, contact) {
  const html = `
    <h2>✦ 守护者联系方式</h2>
    <div style="text-align:center;padding:20px;">
      <p style="color:rgba(200,215,240,0.6);font-size:13px;">守护者 ID：${escapeHtml(gId)}</p>
      <p style="color:rgba(180,210,240,0.8);font-size:16px;margin:20px 0;padding:16px;background:rgba(140,180,255,0.08);border-radius:10px;border:1px solid rgba(140,180,255,0.15);">${escapeHtml(contact)}</p>
      <p style="color:rgba(200,210,230,0.3);font-size:11px;margin-bottom:12px;">联系后请评价：</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;max-width:280px;margin:0 auto;">
      <button onclick="feedbackGuardian('${gId}','good')" style="background:rgba(100,180,120,0.12);border:1px solid rgba(100,180,120,0.3);border-radius:10px;padding:10px;color:rgba(150,220,180,0.8);cursor:pointer;font-size:13px;">👍 好 +1</button>
      <button onclick="feedbackGuardian('${gId}','medium')" style="background:rgba(180,180,140,0.08);border:1px solid rgba(180,180,140,0.2);border-radius:10px;padding:10px;color:rgba(200,210,200,0.6);cursor:pointer;font-size:13px;">➖ 中等</button>
      <button onclick="feedbackGuardian('${gId}','bad')" style="background:rgba(200,140,100,0.1);border:1px solid rgba(200,140,100,0.25);border-radius:10px;padding:10px;color:rgba(220,180,150,0.7);cursor:pointer;font-size:13px;">👎 不好 -1</button>
      <button onclick="feedbackGuardian('${gId}','unreachable')" style="background:rgba(200,100,100,0.12);border:1px solid rgba(200,100,100,0.3);border-radius:10px;padding:10px;color:rgba(220,160,160,0.8);cursor:pointer;font-size:13px;">✗ 联系不上 -2</button>
    </div>
  `;
  const modal = document.querySelector('.modal');
  if (modal) modal.innerHTML = html;
}

function feedbackGuardian(gId, result) {
  const guardians = getGuardians();
  const g = guardians.find(g => g.id === gId);
  if (!g) return;
  
  let points = 0, label = '';
  if (result === 'good') { points = 1; label = '好 +1'; g.contactCount = (g.contactCount || 0) + 1; }
  else if (result === 'medium') { points = 0; label = '中等'; g.contactCount = (g.contactCount || 0) + 1; }
  else if (result === 'bad') { points = -1; label = '不好 -1'; g.contactCount = (g.contactCount || 0) + 1; }
  else if (result === 'unreachable') { points = -2; label = '联系不上 -2'; g.failCount = (g.failCount || 0) + 1; }
  
  g.points = (g.points || 0) + points;
  saveGuardians(guardians);
  
  // 检查是否达到 -10
  if (g.points <= -10) {
    g.bannedUntil = Date.now() + 3 * 365 * 24 * 60 * 60 * 1000;
    saveGuardians(guardians);
  }
  
  const modal = document.querySelector('.modal');
  if (!modal) return;
  
  const colors = { good:'rgba(150,220,180,0.8)', medium:'rgba(200,210,200,0.6)', bad:'rgba(220,180,150,0.7)', unreachable:'rgba(220,160,160,0.8)' };
  const bannedMsg = g.points <= -10 ? '<p style="color:rgba(220,160,160,0.6);font-size:12px;margin-top:12px;">该守护者累计 -10 分，资格已被取消。</p>' : '';
  
  modal.innerHTML = `
    <h2>✦ 评价已提交</h2>
    <div style="text-align:center;padding:16px;">
      <p style="color:${colors[result]};font-size:14px;">评价：${label}</p>
      <p style="color:rgba(200,210,230,0.3);font-size:11px;margin:8px 0;">守护者当前分数：${g.points}</p>
      ${bannedMsg}
    </div>
    <div class="btn-row">
      <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">完成</button>
    </div>
  `;
}
function showHaloEvent(f) {
  const html = `
    <h2>✦ 光环形成</h2>
    <div style="text-align:center;padding:20px;">
      <p style="color:rgba(200,210,230,0.8);font-size:15px;line-height:2;letter-spacing:2px;">
        这颗携带了 100 份善意的碎片，<br>
        终于凝聚成了完整的光环。
      </p>
      <p style="color:rgba(180,200,230,0.5);font-size:13px;margin-top:16px;">
        它依然是一颗行星——不是太阳。<br>
        但它被 100 道光环绕着，在宇宙中静静地旋转。
      </p>
      <p style="color:rgba(150,180,220,0.4);font-size:12px;margin-top:20px;">
        全服引力波涟漪已触发 ✦
      </p>
    </div>
    <div class="btn-row">
      <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">见证这一刻</button>
    </div>
  `;
  showModal(html);
}

// 我的星尘
function openMyStardust() {
  const html = `
    <h2>✦ 寻找我的星尘</h2>
    <p style="color:rgba(200,210,230,0.5);font-size:12px;text-align:center;margin-bottom:20px;letter-spacing:2px;">
      输入你的诗歌密钥，找回你寄出的碎片。
    </p>
    <input id="keyInput" type="text" placeholder="例如：苔藓-鹿鸣-薄雾"
      style="width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(100,140,255,0.2);
      border-radius:12px;padding:14px 18px;color:rgba(220,230,255,0.8);font-size:16px;outline:none;
      text-align:center;letter-spacing:2px;font-family:inherit;"
      onkeydown="if(event.key==='Enter')searchMyFragment()">
    <div class="btn-row">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">取消</button>
      <button class="btn-primary" onclick="searchMyFragment()">✦ 寻找</button>
    </div>
  `;
  showModal(html);
}

function searchMyFragment() {
  const key = document.getElementById('keyInput').value.trim();
  if (!key) return;

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  // 先尝试从后端 API 查找
  if (typeof api !== 'undefined' && apiAvailable) {
    api.getMyStardust(key).then(data => {
      openRemoteFragmentModal(data);
    }).catch(() => {
      showNotFoundModal();
    });
    return;
  }
  
  // 降级到本地查找
  const f = fragments.find(fr => fr.poemKey === key);
  
  if (!f) {
    showNotFoundModal();
  } else {
    cameraX = f.posX; cameraY = f.posY; targetZoom = 1.5;
    setTimeout(() => openFragmentModal(f), 500);
  }
}

function showNotFoundModal() {
  const html = `
    <h2>✦ 未找到碎片</h2>
    <p style="color:rgba(200,210,230,0.5);font-size:14px;text-align:center;line-height:2;">
      这个密钥没有对应的碎片。<br>
      请检查是否输入正确，或碎片可能已经完成了它的旅程。
    </p>
    <div class="btn-row">
      <button class="btn-primary" onclick="openMyStardust()">重新输入</button>
    </div>
  `;
  showModal(html);
}

// 远程碎片详情弹窗（从 API 获取数据）
function openRemoteFragmentModal(data) {
  const stageNames = ['碎片','微行星','光晕星','星尘吸引','尘埃环雏形','细光环','双环','环流','脉动核','共振前兆','完整光环'];
  const stageName = stageNames[Math.min(data.growthStage || 0, 10)];

  let repliesHtml = '';
  if (data.replies && data.replies.length > 0) {
    repliesHtml = data.replies.map(r => `
      <div class="reply-item">
        <div>"${escapeHtml(r.content)}"</div>
        <div class="location">—— ${r.location || '不愿透露'}</div>
      </div>
    `).join('');
  } else {
    repliesHtml = '<p style="color:rgba(200,210,230,0.2);font-size:12px;text-align:center;padding:20px;">暂无回应。</p>';
  }

  const html = `
    <h2>✦ 一块宇宙碎片</h2>
    <div class="stage-badge">${stageName} · ${data.replyCount || 0} 条回应</div>
    <div class="fragment-content">${escapeHtml(data.content)}</div>
    <div class="reply-list">
      <p style="color:rgba(180,200,230,0.4);font-size:11px;letter-spacing:2px;margin-bottom:12px;">—— 星尘回响 ——</p>
      ${repliesHtml}
    </div>
    <div class="btn-row" style="margin-top:24px;">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">关闭</button>
    </div>
  `;
  showModal(html);
}

// 从后端加载所有碎片
async function loadFragmentsFromAPI() {
  if (typeof api === 'undefined' || !apiAvailable) return;
  try {
    const list = await api.getAllFragments();
    list.forEach(item => {
      if (fragments.some(f => f.id === item.id)) return;
      fragments.push({
        id: item.id,
        content: null,
        keyHash: '',
        poemKey: '',
        posX: item.posX,
        posY: item.posY,
        growthStage: item.growthStage || 0,
        replyCount: item.replyCount || 0,
        viewerCount: item.viewerCount || 0,
        createdAt: item.createdAt,
        approvedReplies: []
      });
    });
    console.log('✦ 已加载', list.length, '块碎片');
  } catch (e) {
    console.log('○ 加载碎片失败:', e);
  }
}

// 关于页面
function openAbout() {
  const guardianCount = getGuardians().filter(g => !g.bannedUntil || Date.now() < g.bannedUntil).length;
  const html = `
    <h2>✦ 关于星尘之海</h2>
    <div style="color:rgba(200,210,230,0.6);font-size:13px;line-height:2.2;letter-spacing:1px;">
      <p>星尘之海是一个完全匿名的倾诉空间。</p>
      <p style="margin-top:12px;">在这里，你的痛苦可以化作一颗漂浮的微行星——不需要被修复，不需要"快乐起来"。它只需要被看见，被善意环绕。</p>
      <p style="margin-top:12px;">每一块碎片都不孤独。</p>
      <p style="margin-top:20px;color:rgba(180,200,230,0.8);font-size:14px;">
        目标不是"治愈"或"快乐起来"。<br>
        而是建立联结、获得见证、允许痛苦存在。
      </p>
    </div>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <!-- 左列：心理援助 -->
        <div style="background:rgba(255,200,150,0.04);border-radius:10px;padding:14px;border:1px solid rgba(255,200,150,0.1);">
          <p style="color:rgba(255,200,150,0.5);font-size:11px;letter-spacing:2px;margin-bottom:8px;">专业心理援助</p>
          <p style="color:rgba(200,210,230,0.4);font-size:11px;line-height:1.8;">
            ⚠️ 若你正经历强烈痛苦，请优先寻求专业帮助。<br><br>
            📞 希望24热线：400-161-9995<br>
            📞 北京心理危机研究与干预中心：010-82951332
          </p>
        </div>
        <!-- 右列：守护者 -->
        <div style="background:rgba(140,180,255,0.04);border-radius:10px;padding:14px;border:1px solid rgba(140,180,255,0.1);">
          <p style="color:rgba(180,210,255,0.5);font-size:11px;letter-spacing:2px;margin-bottom:8px;">守护者联系方式</p>
          <p style="color:rgba(200,210,230,0.4);font-size:11px;line-height:1.8;">
            当前守护者：<strong style="color:rgba(180,210,255,0.6);">${guardianCount}</strong> 位<br><br>
            需要帮助或只是想找个人聊聊？<br>
            可以联系守护者。
          </p>
          <button onclick="this.closest('.modal-overlay').remove();showGuardianPick()" style="margin-top:8px;width:100%;background:rgba(140,180,255,0.1);border:1px solid rgba(140,180,255,0.2);border-radius:16px;padding:8px 16px;color:rgba(180,210,255,0.7);cursor:pointer;font-size:12px;letter-spacing:2px;">✦ 联系守护者</button>
        </div>
      </div>
    </div>
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove();document.getElementById('hint').style.opacity='1'">关闭</button>
    </div>
  `;
  showModal(html);
}

// ==================== 守护者审核回应系统 ====================
let guardianReviewActive = false;
let guardianReviewIndex = 0;

// 待审核回应池——从全局 pendingReplies 中提取
function getPendingAudits() {
  return pendingReplies.length > 0 ? pendingReplies : null;
}

function startGuardianReview() {
  const guardians = getGuardians();
  const localId = localStorage.getItem('stardust_guardian_id');
  const myGuardian = guardians.find(g => g.id === localId);
  
  if (!localId || !myGuardian) {
    showGuardianRegister();
    return;
  }
  
  if (myGuardian.bannedUntil && Date.now() < myGuardian.bannedUntil) {
    showModal(`<h2>✧ 守护者资格已暂停</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(220,180,180,0.7);font-size:14px;line-height:2;">你的守护者资格已被暂停。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">确定</button></div>`);
    return;
  }
  
  // 每人只能审核一条
  const localDone = localStorage.getItem('stardust_guardian_done_' + localId);
  if (localDone === 'true') {
    showModal(`<h2>✦ 已完成审核</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(200,210,230,0.6);font-size:14px;line-height:2;">感谢你的守护。<br>每位守护者只能审核一条回应。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">返回星海</button></div>`);
    return;
  }
  
  guardianReviewActive = true;
  guardianReviewIndex = 0;
  showNextGuardianAudit();
}

function showNextGuardianAudit() {
  const pool = getPendingAudits();
  if (!pool || guardianReviewIndex >= pool.length) {
    const html = `
      <h2>✦ 审核队列已空</h2>
      <div style="text-align:center;padding:20px;">
        <p style="color:rgba(200,210,230,0.5);font-size:14px;line-height:2;">当前没有需要审核的回应。</p>
      </div>
      <div class="btn-row">
        <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">返回星海</button>
      </div>
    `;
    showModal(html); return;
  }
  
  const audit = pool[guardianReviewIndex];
  const f = fragments.find(fr => fr.id === audit.fragmentId);
  const html = `
    <h2>✦ 守护者审核</h2>
    <p style="color:rgba(200,210,230,0.3);font-size:11px;text-align:center;letter-spacing:2px;margin-bottom:16px;">每人限审1条</p>
    <div style="background:rgba(20,26,50,0.6);border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid rgba(140,180,255,0.12);">
      <p style="color:rgba(220,230,255,0.85);font-size:15px;line-height:2.2;font-style:italic;">"${escapeHtml(audit.content)}"</p>
      <p style="color:rgba(200,210,230,0.25);font-size:11px;margin-top:12px;">—— 来自 ${audit.location}</p>
    </div>
    <p style="color:rgba(200,210,230,0.6);font-size:13px;text-align:center;margin-bottom:16px;">这是一份善意的回应吗？</p>
    <div style="display:flex;gap:16px;justify-content:center;">
      <button onclick="approveGuardianAudit()" style="background:rgba(100,180,120,0.15);border:1px solid rgba(100,180,120,0.35);border-radius:24px;padding:12px 32px;color:rgba(150,220,180,0.8);cursor:pointer;font-size:14px;letter-spacing:2px;">✓ 通过</button>
      <button onclick="rejectGuardianAudit()" style="background:rgba(200,100,100,0.15);border:1px solid rgba(200,100,100,0.35);border-radius:24px;padding:12px 32px;color:rgba(220,160,160,0.8);cursor:pointer;font-size:14px;letter-spacing:2px;">✗ 不通过</button>
    </div>
    <p style="color:rgba(200,210,230,0.2);font-size:10px;text-align:center;margin-top:16px;">每人限审1条</p>
  `;
  showModal(html);
}

function approveGuardianAudit() {
  const pool = getPendingAudits();
  if (!pool || guardianReviewIndex >= pool.length) return;
  
  const audit = pool[guardianReviewIndex];
  audit.approveCount++;
  
  const localId = localStorage.getItem('stardust_guardian_id');
  localStorage.setItem('stardust_guardian_done_' + localId, 'true');
  
  if (audit.approveCount >= 5) {
    const f = fragments.find(fr => fr.id === audit.fragmentId);
    if (f) {
      f.approvedReplies.push({ content: audit.content, location: audit.location });
      f.replyCount++;
      updateGrowthStage(f);
      if (f.replyCount === 100) setTimeout(() => showHaloEvent(f), 1000);
    }
    pendingReplies.splice(pendingReplies.indexOf(audit), 1);
  }
  
  showGuardianDone();
}

function rejectGuardianAudit() {
  const modal = document.querySelector('.modal');
  if (!modal) return;
  modal.innerHTML = `
    <h2>✦ 不通过原因</h2>
    <p style="color:rgba(200,210,230,0.4);font-size:12px;text-align:center;margin-bottom:16px;">选择不通过的理由</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button onclick="confirmRejectAudit('含评价/说教')" style="background:rgba(200,100,100,0.08);border:1px solid rgba(200,100,100,0.25);border-radius:10px;padding:12px 16px;color:rgba(220,180,180,0.7);cursor:pointer;font-size:13px;text-align:left;">📝 含评价/说教</button>
      <button onclick="confirmRejectAudit('不尊重')" style="background:rgba(200,100,100,0.08);border:1px solid rgba(200,100,100,0.25);border-radius:10px;padding:12px 16px;color:rgba(220,180,180,0.7);cursor:pointer;font-size:13px;text-align:left;">🚫 不尊重</button>
      <button onclick="confirmRejectAudit('广告/无关')" style="background:rgba(200,100,100,0.08);border:1px solid rgba(200,100,100,0.25);border-radius:10px;padding:12px 16px;color:rgba(220,180,180,0.7);cursor:pointer;font-size:13px;text-align:left;">📢 广告/无关</button>
    </div>
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">返回星海</button>
    </div>
  `;
}

function confirmRejectAudit(reason) {
  const audit = pendingReplies[guardianReviewIndex];
  if (audit) pendingReplies.splice(pendingReplies.indexOf(audit), 1);
  const localId = localStorage.getItem('stardust_guardian_id');
  localStorage.setItem('stardust_guardian_done_' + localId, 'true');
  showGuardianDone();
}

function showGuardianDone() {
  showModal(`<h2>✦ 审核完成</h2><div style="text-align:center;padding:20px;"><p style="color:rgba(200,210,230,0.6);font-size:14px;line-height:2;">感谢你的守护。<br>你已完成本次审核。</p></div><div class="btn-row"><button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">返回星海</button></div>`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

// ==================== 入口 ====================
function enterMap() {
  try {
    const landing = document.getElementById('landing');
    const main = document.getElementById('main');
    const hint = document.getElementById('hint');
    
    if (landing) landing.classList.add('hidden');
    if (main) main.classList.add('show');
    if (hint) hint.style.opacity = '0.2';
    
    updateSendHint();

    // 从后端加载已有碎片
    if (typeof api !== 'undefined' && apiAvailable) {
      setTimeout(() => loadFragmentsFromAPI(), 500);
    }
    
    // 提示呼吸
    setTimeout(() => {
      const h = document.getElementById('hint');
      if (!h) return;
      setInterval(() => {
        h.style.opacity = String(Math.sin(Date.now() * 0.001) * 0.2 + 0.15);
      }, 100);
    }, 3000);
    
    console.log('✦ 已进入星尘之海');
  } catch (err) {
    console.error('进入失败:', err);
  }
}

// ==================== 启动 ====================
// 键盘快捷键：§ 或 ` 打开管理控制台
document.addEventListener('keydown', e => {
  if (e.key === '`' || e.key === '§') {
    if (adminUnlocked) { openAdminConsole(); return; }
    promptAdminPassword();
  }
});

// 守护者月度重置
(function checkMonthlyReset() {
  const lastReset = localStorage.getItem('stardust_guardian_reset');
  const now = new Date();
  if (!lastReset || new Date(lastReset).getMonth() !== now.getMonth()) {
    const guardians = getGuardians();
    guardians.forEach(g => { g.points = 0; g.contactCount = 0; g.failCount = 0; });
    saveGuardians(guardians);
    localStorage.setItem('stardust_guardian_reset', now.toISOString());
    console.log('✦ 守护者月度重置完成');
  }
})();

// 更新次数提示
updateSendHint();

console.log('✦ 星尘之海已启动');
console.log('碎片数:', fragments.length);
