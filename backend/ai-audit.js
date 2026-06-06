// ==================== AI 内容审核模块 ====================
// 预筛选回应内容，拦截明显攻击/广告，标记模糊内容

const forbiddenPatterns = [
  // 联系方式（广告）
  { pattern: /加\s*(微信|QQ|vx|qq)/i, reason: '广告/无关', level: 'block' },
  { pattern: /\d{6,}/, reason: '广告/无关', level: 'flag' },
  { pattern: /(http|https|www\.)/i, reason: '广告/无关', level: 'block' },
  { pattern: /(赚|兼职|日结|刷单)/i, reason: '广告/无关', level: 'block' },
  
  // 攻击性内容
  { pattern: /(傻逼|去死|废物|垃圾|蠢货)/i, reason: '攻击性内容', level: 'block' },
  { pattern: /(滚|滚蛋|恶心|贱)/i, reason: '攻击性内容', level: 'flag' },
  { pattern: /你(活该|该死|不配|没救了)/i, reason: '攻击性内容', level: 'block' },
  
  // 歧视性内容
  { pattern: /(娘炮|基佬|女拳|直男癌)/i, reason: '不尊重', level: 'block' },
  
  // 模糊需标记
  { pattern: /(加油|想开点|别想太多)/i, reason: '含评价/说教', level: 'flag' },
  { pattern: /(你应该|你必须|你要|你得)/i, reason: '含评价/说教', level: 'flag' },
  { pattern: /(比你|别人都|怎么不)/i, reason: '含评价/说教', level: 'flag' },
];

function auditContent(content) {
  const result = { status: 'clean', reasons: [], level: 'clean' };
  
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(content)) {
      result.reasons.push(rule.reason);
      result.level = rule.level === 'block' ? 'block' : (result.level === 'clean' ? 'flag' : result.level);
    }
  }
  
  if (result.level === 'block') result.status = 'blocked';
  else if (result.level === 'flag') result.status = 'flagged';
  
  return result;
}

// AI 审核中间件
function aiAuditMiddleware(req, res, next) {
  const content = req.body.content;
  if (!content) return next();
  
  const result = auditContent(content);
  
  if (result.status === 'blocked') {
    return res.status(400).json({
      error: '你的回应无法发送。',
      detail: '系统检测到可能不适的内容。星尘之海只欢迎善意的文字。',
      reasons: result.reasons
    });
  }
  
  // 标记模糊内容，但不阻止（留给人工审核判断）
  if (result.status === 'flagged') {
    req.aiFlagged = true;
    req.aiReasons = result.reasons;
    console.log('⚠ AI标记:', result.reasons.join(', '));
  }
  
  next();
}

module.exports = { auditContent, aiAuditMiddleware };
