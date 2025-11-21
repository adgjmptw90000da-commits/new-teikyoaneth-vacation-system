-- 優先順位・レベル交換履歴テーブルの作成
CREATE TABLE priority_exchange_log (
  id SERIAL PRIMARY KEY,
  application_id_1 INTEGER NOT NULL REFERENCES application(id),
  application_id_2 INTEGER NOT NULL REFERENCES application(id),
  before_priority_1 INTEGER NOT NULL,
  before_priority_2 INTEGER NOT NULL,
  before_level_1 INTEGER NOT NULL,
  before_level_2 INTEGER NOT NULL,
  after_priority_1 INTEGER NOT NULL,
  after_priority_2 INTEGER NOT NULL,
  after_level_1 INTEGER NOT NULL,
  after_level_2 INTEGER NOT NULL,
  exchanged_by_staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id),
  exchanged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- コメント追加
COMMENT ON TABLE priority_exchange_log IS '優先順位・レベル交換の履歴';
COMMENT ON COLUMN priority_exchange_log.application_id_1 IS '交換対象の申請1';
COMMENT ON COLUMN priority_exchange_log.application_id_2 IS '交換対象の申請2';
COMMENT ON COLUMN priority_exchange_log.before_priority_1 IS '交換前の申請1の優先順位';
COMMENT ON COLUMN priority_exchange_log.before_priority_2 IS '交換前の申請2の優先順位';
COMMENT ON COLUMN priority_exchange_log.before_level_1 IS '交換前の申請1のレベル';
COMMENT ON COLUMN priority_exchange_log.before_level_2 IS '交換前の申請2のレベル';
COMMENT ON COLUMN priority_exchange_log.after_priority_1 IS '交換後の申請1の優先順位';
COMMENT ON COLUMN priority_exchange_log.after_priority_2 IS '交換後の申請2の優先順位';
COMMENT ON COLUMN priority_exchange_log.after_level_1 IS '交換後の申請1のレベル';
COMMENT ON COLUMN priority_exchange_log.after_level_2 IS '交換後の申請2のレベル';
COMMENT ON COLUMN priority_exchange_log.exchanged_by_staff_id IS '交換を実行した管理者の職員ID';
COMMENT ON COLUMN priority_exchange_log.exchanged_at IS '交換実行日時';
