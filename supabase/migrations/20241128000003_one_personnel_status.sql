-- 確定済み年休のOne人事申請ステータス管理

-- applicationテーブルにone_personnel_statusカラム追加
ALTER TABLE application ADD COLUMN one_personnel_status TEXT
  DEFAULT 'not_applied'
  CHECK (one_personnel_status IN ('not_applied', 'applied', 'kensanbi'));

-- kensanbi_usage_historyにapplication_id追加（どの年休から変換したか記録）
ALTER TABLE kensanbi_usage_history ADD COLUMN application_id INTEGER REFERENCES application(id);
