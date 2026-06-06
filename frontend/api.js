// ==================== 星尘之海 · API 客户端 ====================
// 连接后端数据库，替代 localStorage
// 后端不可用时自动降级为本地模式

const API_BASE = window.location.origin + '/api';

const api = {
  // 健康检查 + 统计
  async health() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // 创建碎片
  async createFragment(content, email) {
    const res = await fetch(`${API_BASE}/fragment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, email })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 获取碎片列表
  async getFragments(minX, maxX, minY, maxY) {
    const params = new URLSearchParams({ minX, maxX, minY, maxY });
    const res = await fetch(`${API_BASE}/fragments?${params}`);
    return res.json();
  },

  // 全部碎片
  async getAllFragments() {
    const res = await fetch(`${API_BASE}/fragments`);
    return res.json();
  },

  // 碎片详情
  async getFragment(id) {
    const res = await fetch(`${API_BASE}/fragment/${id}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 提交回应
  async submitReply(fragmentId, content, location) {
    const res = await fetch(`${API_BASE}/fragment/${fragmentId}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, location })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 获取待审回应
  async getNextAudit(guardianId) {
    const res = await fetch(`${API_BASE}/audit/next/${guardianId}`);
    return res.json();
  },

  // 提交审核
  async submitAudit(guardianId, replyId, result, reason) {
    const res = await fetch(`${API_BASE}/audit/${guardianId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyId, result, reason })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 凭密钥找回
  async getMyStardust(key) {
    const res = await fetch(`${API_BASE}/my-stardust?key=${encodeURIComponent(key)}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 守护者注册
  async registerGuardian(id, contact) {
    const res = await fetch(`${API_BASE}/guardian/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, contact })
    });
    return res.json();
  },

  // 守护者排行榜
  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/guardian/leaderboard`);
    return res.json();
  },

  // 守护者反馈
  async feedbackGuardian(guardianId, result) {
    const res = await fetch(`${API_BASE}/guardian/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardianId, result })
    });
    return res.json();
  },

  // 管理员
  async getAdminFragments() {
    const res = await fetch(`${API_BASE}/admin/fragments?pwd=stardust`);
    return res.json();
  },

  async deleteAdminFragment(id) {
    const res = await fetch(`${API_BASE}/admin/fragment/${id}?pwd=stardust`, { method: 'DELETE' });
    return res.json();
  }
};

// 检测后端
let apiAvailable = false;
(async function check() {
  try {
    const h = await api.health();
    apiAvailable = h.status === 'ok';
    console.log(apiAvailable ? '✦ 已连接后端服务' : '○ 使用本地模式（仅演示）');
  } catch (e) { console.log('○ 使用本地模式（仅演示）'); }
})();
