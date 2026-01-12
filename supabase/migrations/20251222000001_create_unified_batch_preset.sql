-- 統合連続割り振りプリセットテーブル
CREATE TABLE unified_batch_preset (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,       -- UnifiedBatchStep[]をJSON保存
  trial_count INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE unified_batch_preset IS '統合連続割り振りのプリセット';
COMMENT ON COLUMN unified_batch_preset.name IS 'プリセット名';
COMMENT ON COLUMN unified_batch_preset.steps IS 'ステップ構成（JSON配列）';
COMMENT ON COLUMN unified_batch_preset.trial_count IS '試行回数';
COMMENT ON COLUMN unified_batch_preset.display_order IS '表示順序';
