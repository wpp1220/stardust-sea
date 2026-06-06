// ==================== 宇宙回音 · 定时任务 ====================
// 为长期无回应的碎片自动生成诗意陪伴

const cosmicEchoes = [
  '一块碎片在轨道上独行了三个夜晚。昨夜，一场远方的流星雨曾为它短暂地亮过。',
  '宇宙很大，大到每一块碎片都有自己的轨道。即使暂时无人经过，你也在运行。',
  '星光需要时间才能抵达。在某个你不知晓的时刻，一束光早已为你出发。',
  '沉默不是空白，是引力正在积蓄。你的存在本身就在吸引着什么。',
  '轨道很长，但每一寸都是属于你的。不必急着到达任何地方。',
  '今晚的星图上，你的坐标亮了一下。有人看了一眼，虽然他们没有停下。',
  '在138亿年的宇宙中，你此刻的存在是极其微小的概率。但这微小中蕴含着全部的意义。',
  '宇宙不会催促任何一块碎片。你按照自己的节奏旋转，这已经足够了。',
  '有时候光需要穿过很远的距离才能抵达。你收到的沉默，可能只是光还在路上。',
  '这块碎片的密度与一颗遥远的脉冲星恰好共振。宇宙在用我们不懂的方式联结着一切。',
];

// 检查并生成宇宙回音
function checkAndGenerateEchoes(fragments, replies, echoes) {
  const now = Date.now();
  const intervals = [
    { days: 3, text: cosmicEchoes.slice(0, 3) },
    { days: 7, text: cosmicEchoes.slice(3, 6) },
    { days: 30, text: cosmicEchoes.slice(6, 10) },
  ];
  
  const newEchoes = [];
  
  fragments.forEach(fragment => {
    // 只对零回复碎片生成回音
    const approvedReplies = replies.filter(
      r => r.fragmentId === fragment.id && r.status === 'approved'
    );
    if (approvedReplies.length > 0) return;
    
    const fragmentAge = (now - new Date(fragment.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const existingEchoes = echoes.filter(e => e.fragmentId === fragment.id);
    
    intervals.forEach(interval => {
      if (fragmentAge >= interval.days) {
        // 检查是否已经生成过对应天数的回音
        const alreadyGenerated = existingEchoes.some(
          e => e.intervalDays === interval.days
        );
        if (!alreadyGenerated) {
          const echoText = interval.text[Math.floor(Math.random() * interval.text.length)];
          newEchoes.push({
            fragmentId: fragment.id,
            content: echoText,
            intervalDays: interval.days,
            createdAt: new Date().toISOString()
          });
          console.log(`✦ 宇宙回音：碎片 ${fragment.id} (${interval.days}天)`);
        }
      }
    });
  });
  
  return newEchoes;
}

// 定时执行（每6小时）
function startEchoScheduler(db) {
  function run() {
    const newEchoes = checkAndGenerateEchoes(
      db.fragments,
      db.replies,
      db.cosmicEchoes || []
    );
    
    if (!db.cosmicEchoes) db.cosmicEchoes = [];
    db.cosmicEchoes.push(...newEchoes);
    
    if (newEchoes.length > 0) {
      console.log(`✦ 生成了 ${newEchoes.length} 条宇宙回音`);
    }
  }
  
  // 立即执行一次
  run();
  
  // 每6小时执行
  setInterval(run, 6 * 60 * 60 * 1000);
  
  console.log('✦ 宇宙回音调度器已启动（每6小时）');
}

module.exports = { cosmicEchoes, checkAndGenerateEchoes, startEchoScheduler };
