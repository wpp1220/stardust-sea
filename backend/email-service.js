// ==================== 邮件服务 · 心门邮件模板 ====================
// 当碎片获得100条回应时，发送"心门"防护邮件

// 邮件配置（生产环境从环境变量读取）
const emailConfig = {
  from: '星尘之海 <stardust@seaofstardust.com>',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  }
};

// "心门"邮件模板——核心情感防护设计
function buildHeartDoorEmail(fragment) {
  const subject = '你寄出的那块碎片，如今已有光环环绕';
  
  const htmlBody = `
    <div style="max-width:600px;margin:0 auto;font-family:'PingFang SC','Microsoft YaHei',sans-serif;
                background:#0a0a1e;color:#dce6ff;padding:40px;border-radius:12px;
                border:1px solid rgba(100,140,255,0.15);">
      
      <!-- 星空头部 -->
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:12px;letter-spacing:6px;color:rgba(180,200,230,0.4);margin-bottom:12px;">✦ 星 尘 之 海 ✦</div>
        <h1 style="font-size:18px;font-weight:300;color:rgba(200,220,240,0.85);letter-spacing:4px;margin:0;">
          ${subject}
        </h1>
      </div>
      
      <hr style="border-color:rgba(100,140,255,0.1);margin:24px 0;">
      
      <!-- 正文 -->
      <div style="line-height:2.2;font-size:14px;color:rgba(200,210,230,0.75);">
        <p>你好，星尘旅人。</p>
        
        <p>你曾在 <strong style="color:rgba(220,230,255,0.9);">${fragment.createdAt}</strong> 寄出一块碎片。</p>
        
        <p>现在，在引力之海中，它有 <strong style="color:rgba(220,230,255,0.9);">100 份回响</strong> 凝聚成环。</p>
        
        <!-- 心门防护 -->
        <div style="background:rgba(255,200,100,0.06);border:1px solid rgba(255,200,100,0.15);
                    border-radius:8px;padding:16px 20px;margin:20px 0;">
          <p style="font-size:13px;color:rgba(255,200,150,0.7);font-style:italic;margin:0;">
            ⚠️ 这些文字承载着真实的情感重量。<br><br>
            如果你现在独自一人，或感觉不太安稳，可以先收藏这封邮件。<br>
            等待一个阳光温和的下午，身边有一杯温水时，再打开它。
          </p>
        </div>
        
        <!-- 开启按钮 -->
        <div style="text-align:center;margin:28px 0;">
          <a href="https://seaofstardust.com/unveil/${fragment.id}"
             style="display:inline-block;background:rgba(100,140,255,0.2);
                    border:1px solid rgba(100,140,255,0.4);border-radius:24px;
                    padding:12px 36px;color:rgba(220,230,255,0.85);
                    font-size:14px;letter-spacing:3px;text-decoration:none;">
            ✦ 我已准备好，开启回响
          </a>
        </div>
        
        <p style="font-size:12px;color:rgba(180,200,230,0.3);text-align:center;">
          点击后将展开全部 100 条回应
        </p>
      </div>
      
      <hr style="border-color:rgba(100,140,255,0.1);margin:24px 0;">
      
      <!-- 底部 -->
      <div style="text-align:center;font-size:11px;color:rgba(180,200,230,0.25);line-height:2;">
        <p>星尘之海是陪伴，不是治疗。</p>
        <p>若你正经历强烈痛苦，请一定优先寻求专业帮助。</p>
        <p style="margin-top:8px;">
          全国24小时希望热线：400-161-9995
        </p>
      </div>
    </div>
  `;
  
  const textBody = `
你好，星尘旅人。

你曾在 ${fragment.createdAt} 寄出一块碎片。
现在，在引力之海中，它有 100 份回响凝聚成环。

⚠️ 这些文字承载着真实的情感重量。

如果你现在独自一人，或感觉不太安稳，可以先收藏这封邮件。
等待一个阳光温和的下午，身边有一杯温水时，再打开它。

开启回响：
https://seaofstardust.com/unveil/${fragment.id}

---
星尘之海是陪伴，不是治疗。
全国24小时希望热线：400-161-9995
  `;
  
  return { subject, htmlBody, textBody };
}

// 发送邮件（生产环境集成 nodemailer）
async function sendHeartDoorEmail(fragment, emailAddress) {
  console.log(`✦ 心门邮件准备发送 → ${emailAddress}`);
  console.log(`   主题: ${buildHeartDoorEmail(fragment).subject}`);
  
  // 生产环境取消注释：
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransport(emailConfig.smtp);
  // const { subject, htmlBody, textBody } = buildHeartDoorEmail(fragment);
  // await transporter.sendMail({
  //   from: emailConfig.from,
  //   to: emailAddress,
  //   subject,
  //   html: htmlBody,
  //   text: textBody
  // });
  
  return { sent: true, to: emailAddress };
}

module.exports = { buildHeartDoorEmail, sendHeartDoorEmail };
