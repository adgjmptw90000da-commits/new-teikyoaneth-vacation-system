-- 優先順位交換申請テーブル
CREATE TABLE priority_exchange_request (
  id SERIAL PRIMARY KEY,

  -- 申請者側
  requester_application_id INTEGER REFERENCES application(id) ON DELETE CASCADE,
  requester_staff_id VARCHAR REFERENCES "user"(staff_id),

  -- 相手側
  target_application_id INTEGER REFERENCES application(id) ON DELETE CASCADE,
  target_staff_id VARCHAR REFERENCES "user"(staff_id),

  -- 申請情報
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  request_reason TEXT,

  -- 相手の承諾
  target_response VARCHAR DEFAULT 'pending',  -- pending, accepted, rejected
  target_responded_at TIMESTAMPTZ,
  target_reject_reason TEXT,

  -- 管理者の承認
  admin_response VARCHAR DEFAULT 'pending',  -- pending, approved, rejected
  admin_staff_id VARCHAR REFERENCES "user"(staff_id),
  admin_responded_at TIMESTAMPTZ,
  admin_reject_reason TEXT,

  -- 通知フラグ
  requester_notified BOOLEAN DEFAULT TRUE,
  target_notified BOOLEAN DEFAULT TRUE,

  -- 実行済みフラグ
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_priority_exchange_request_requester ON priority_exchange_request(requester_staff_id);
CREATE INDEX idx_priority_exchange_request_target ON priority_exchange_request(target_staff_id);
CREATE INDEX idx_priority_exchange_request_target_response ON priority_exchange_request(target_response);
CREATE INDEX idx_priority_exchange_request_admin_response ON priority_exchange_request(admin_response);

-- コメント
COMMENT ON TABLE priority_exchange_request IS '優先順位交換申請';
COMMENT ON COLUMN priority_exchange_request.target_response IS '相手の承諾状態: pending, accepted, rejected';
COMMENT ON COLUMN priority_exchange_request.admin_response IS '管理者の承認状態: pending, approved, rejected';
COMMENT ON COLUMN priority_exchange_request.requester_notified IS '申請者への通知済みフラグ';
COMMENT ON COLUMN priority_exchange_request.target_notified IS '相手への通知済みフラグ';

-- priority_exchange_log にステータスのカラムを追加
ALTER TABLE priority_exchange_log
  ADD COLUMN IF NOT EXISTS before_status_1 VARCHAR,
  ADD COLUMN IF NOT EXISTS before_status_2 VARCHAR,
  ADD COLUMN IF NOT EXISTS after_status_1 VARCHAR,
  ADD COLUMN IF NOT EXISTS after_status_2 VARCHAR;

COMMENT ON COLUMN priority_exchange_log.before_status_1 IS '交換前のステータス（申請1）';
COMMENT ON COLUMN priority_exchange_log.before_status_2 IS '交換前のステータス（申請2）';
COMMENT ON COLUMN priority_exchange_log.after_status_1 IS '交換後のステータス（申請1）';
COMMENT ON COLUMN priority_exchange_log.after_status_2 IS '交換後のステータス（申請2）';
