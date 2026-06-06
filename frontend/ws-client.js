// ==================== 星尘之海 · WebSocket 客户端 ====================
// 连接后端 Socket.IO 服务器，实时接收星空事件

let socket = null;
let wsConnected = false;

function initWebSocket() {
  try {
    socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000
    });

    socket.on('connect', () => {
      wsConnected = true;
      console.log('✦ 已连接星尘之海实时通道');
    });

    socket.on('disconnect', () => {
      wsConnected = false;
      console.log('○ 实时通道断开，尝试重连...');
    });

    // 新碎片落下
    socket.on('new_fragment', (data) => {
      console.log('✦ 新碎片落下:', data.id);
      fragments.push({
        id: data.id,
        content: null, // 需要时再从 API 获取
        keyHash: '',
        poemKey: '',
        posX: data.posX,
        posY: data.posY,
        growthStage: data.growthStage,
        replyCount: data.replyCount,
        viewerCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        approvedReplies: []
      });
    });

    // 碎片成长（阶段变化）
    socket.on('fragment_growth', (data) => {
      const f = fragments.find(fr => fr.id === data.id);
      if (f) {
        f.growthStage = data.growthStage;
        f.replyCount = data.replyCount;
        console.log('✦ 碎片成长:', data.id, '→ 阶段', data.growthStage);
      }
    });

    // 光环形成（全服引力波涟漪）
    socket.on('halo_formed', (data) => {
      console.log('✦✦✦ 全服事件：光环形成！', data.id);
      const f = fragments.find(fr => fr.id === data.id);
      if (f) {
        f.growthStage = 10;
        f.replyCount = 100;
        triggerRippleWave(f);
        setTimeout(() => showHaloEvent(f), 1500);
      }
    });

  } catch (e) {
    console.log('○ WebSocket 初始化失败，使用轮询模式');
    wsConnected = false;
  }
}

// 页面加载后自动连接
if (typeof io !== 'undefined') {
  initWebSocket();
} else {
  console.log('○ Socket.IO 库未加载，实时功能暂不可用');
}
