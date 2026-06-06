-- ==================== 星尘之海 · 数据库 Schema ====================
-- PostgreSQL

-- 碎片表
CREATE TABLE fragments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    key_hash VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 哈希，不可逆
    email_encrypted TEXT,                        -- AES-256 加密的邮箱，可空
    pos_x DOUBLE PRECISION NOT NULL,             -- 星空坐标 X
    pos_y DOUBLE PRECISION NOT NULL,             -- 星空坐标 Y
    growth_stage INT DEFAULT 0 CHECK (growth_stage BETWEEN 0 AND 10),
    reply_count INT DEFAULT 0,
    viewer_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fragments_coords ON fragments(pos_x, pos_y);
CREATE INDEX idx_fragments_growth ON fragments(growth_stage);

-- 回应表（星尘）
CREATE TABLE stardust_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fragment_id UUID NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
    location VARCHAR(50) DEFAULT '不愿透露',     -- 模糊地址
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_fragment ON stardust_replies(fragment_id);
CREATE INDEX idx_replies_status ON stardust_replies(status);

-- 审核表
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES stardust_replies(id) ON DELETE CASCADE,
    auditor_session_id VARCHAR(100),             -- 审核者会话标识
    result VARCHAR(20) CHECK (result IN ('approved','rejected')),
    reason VARCHAR(50),                          -- rejected 时的理由
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audits_reply ON audits(reply_id);
CREATE INDEX idx_audits_pending ON audits(result) WHERE result IS NULL;

-- 宇宙回音表（系统自动生成的诗意回应）
CREATE TABLE cosmic_echoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fragment_id UUID NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审核者池（守护者模式用户）
CREATE TABLE guardians (
    session_id VARCHAR(100) PRIMARY KEY,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    total_audits INT DEFAULT 0,
    approval_rate DOUBLE PRECISION DEFAULT 0
);

-- 定时任务：更新碎片进化阶段
CREATE OR REPLACE FUNCTION update_fragment_stage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE fragments 
    SET growth_stage = CASE 
        WHEN reply_count < 10 THEN 0
        WHEN reply_count < 20 THEN 1
        WHEN reply_count < 30 THEN 2
        WHEN reply_count < 40 THEN 3
        WHEN reply_count < 50 THEN 4
        WHEN reply_count < 60 THEN 5
        WHEN reply_count < 70 THEN 6
        WHEN reply_count < 80 THEN 7
        WHEN reply_count < 90 THEN 8
        WHEN reply_count < 100 THEN 9
        ELSE 10
    END,
    updated_at = NOW()
    WHERE id = NEW.fragment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stage
AFTER UPDATE OF reply_count ON fragments
FOR EACH ROW EXECUTE FUNCTION update_fragment_stage();
