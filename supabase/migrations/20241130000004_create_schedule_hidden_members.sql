-- 予定表非表示メンバーテーブル
CREATE TABLE schedule_hidden_members (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(20) NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id)
);

COMMENT ON TABLE schedule_hidden_members IS '予定表で非表示にするメンバー';
COMMENT ON COLUMN schedule_hidden_members.staff_id IS '非表示にする職員ID';
