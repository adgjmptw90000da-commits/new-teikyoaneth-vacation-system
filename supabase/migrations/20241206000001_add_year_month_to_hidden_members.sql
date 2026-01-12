-- 非表示メンバーを月ごとに設定できるようにする
-- year, monthカラムを追加

ALTER TABLE schedule_hidden_members ADD COLUMN year INTEGER NOT NULL DEFAULT 2024;
ALTER TABLE schedule_hidden_members ADD COLUMN month INTEGER NOT NULL DEFAULT 1;

-- 既存のUNIQUE制約を削除して新しい制約を追加
ALTER TABLE schedule_hidden_members DROP CONSTRAINT IF EXISTS schedule_hidden_members_staff_id_key;
ALTER TABLE schedule_hidden_members ADD CONSTRAINT schedule_hidden_members_unique UNIQUE(staff_id, year, month);

-- DEFAULTを削除（新規挿入時は必須にする）
ALTER TABLE schedule_hidden_members ALTER COLUMN year DROP DEFAULT;
ALTER TABLE schedule_hidden_members ALTER COLUMN month DROP DEFAULT;

COMMENT ON COLUMN schedule_hidden_members.year IS '年';
COMMENT ON COLUMN schedule_hidden_members.month IS '月';
