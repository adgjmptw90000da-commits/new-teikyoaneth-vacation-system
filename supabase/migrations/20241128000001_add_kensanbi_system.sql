-- 研鑽日システム用テーブル追加

-- 1. shift_typeテーブルにis_kensanbi_targetカラムを追加
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS is_kensanbi_target BOOLEAN DEFAULT false;
COMMENT ON COLUMN shift_type.is_kensanbi_target IS '研鑽日付与対象となる当直タイプかどうか';

-- 2. 研鑽日付与履歴テーブル
CREATE TABLE IF NOT EXISTS kensanbi_grant_history (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  user_shift_id INTEGER NOT NULL REFERENCES user_shift(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  granted_days DECIMAL(2,1) NOT NULL CHECK (granted_days IN (0.5, 1.0)),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by_staff_id VARCHAR(50) REFERENCES "user"(staff_id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_shift_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kensanbi_staff_id ON kensanbi_grant_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_kensanbi_shift_date ON kensanbi_grant_history(shift_date);
CREATE INDEX IF NOT EXISTS idx_kensanbi_status ON kensanbi_grant_history(status);

-- 3. 研鑽日使用履歴テーブル（将来拡張用）
CREATE TABLE IF NOT EXISTS kensanbi_usage_history (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  used_days DECIMAL(2,1) NOT NULL CHECK (used_days > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kensanbi_usage_staff_id ON kensanbi_usage_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_kensanbi_usage_date ON kensanbi_usage_history(usage_date);
