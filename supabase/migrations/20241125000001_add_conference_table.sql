-- 主要学会テーブルの作成
-- 祝日(holiday)と分離して、主要学会を別テーブルで管理する

CREATE TABLE conference (
  id SERIAL PRIMARY KEY,
  conference_date DATE UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_conference_date ON conference(conference_date);

-- コメント
COMMENT ON TABLE conference IS '主要学会マスタ。主要学会の日は年休申請不可。';
COMMENT ON COLUMN conference.conference_date IS '主要学会の日付';
COMMENT ON COLUMN conference.name IS '主要学会名';
