-- ショートカット設定カラムをsettingテーブルに追加
-- システム共通のキーボードショートカット設定を保存

ALTER TABLE setting
ADD COLUMN IF NOT EXISTS shortcut_config JSONB DEFAULT NULL;

COMMENT ON COLUMN setting.shortcut_config IS 'キーボードショートカット設定 (JSON形式: {"キー": {"type": "shift"|"schedule"|"workLocation", "id": number}})';
