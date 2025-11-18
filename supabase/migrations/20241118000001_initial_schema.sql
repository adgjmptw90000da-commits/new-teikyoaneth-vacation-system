-- 年休管理システム 初期スキーマ

-- userテーブル: 職員情報管理
CREATE TABLE "user" (
  staff_id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 職員IDが数字のみであることを確認する制約
ALTER TABLE "user" ADD CONSTRAINT staff_id_numeric_check
  CHECK (staff_id ~ '^[0-9]+$');

-- updated_at自動更新用のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- userテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_user_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- settingテーブル: 組織設定管理（1行のみ）
CREATE TABLE setting (
  id INTEGER PRIMARY KEY DEFAULT 1,
  organization_code VARCHAR NOT NULL DEFAULT 'teikyo0629',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- settingテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_setting_updated_at
  BEFORE UPDATE ON setting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- settingテーブルは1行のみに制限
ALTER TABLE setting ADD CONSTRAINT single_row_check
  CHECK (id = 1);

-- デフォルトの組織設定を挿入
INSERT INTO setting (id, organization_code) VALUES (1, 'teikyo0629');

-- インデックスの作成
CREATE INDEX idx_user_staff_id ON "user"(staff_id);
CREATE INDEX idx_user_is_admin ON "user"(is_admin);
