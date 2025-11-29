-- count_configテーブルに立場フィルタを追加
ALTER TABLE count_config ADD COLUMN IF NOT EXISTS
  filter_positions VARCHAR(20)[] DEFAULT '{}';
