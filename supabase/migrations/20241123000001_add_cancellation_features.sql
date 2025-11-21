-- キャンセル機能の追加: 新規ステータスとcancellation_requestテーブル

-- 1. cancellation_requestテーブルの作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS cancellation_request (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_reason TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending',
  reviewed_by_staff_id VARCHAR REFERENCES "user"(staff_id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT
);

-- コメント追加
COMMENT ON TABLE cancellation_request IS 'キャンセル申請の履歴';
COMMENT ON COLUMN cancellation_request.application_id IS '対象の申請ID';
COMMENT ON COLUMN cancellation_request.requested_at IS 'キャンセル申請日時';
COMMENT ON COLUMN cancellation_request.requested_reason IS 'キャンセル理由（任意）';
COMMENT ON COLUMN cancellation_request.status IS 'pending: 承認待ち, approved: 承認済み, rejected: 却下';
COMMENT ON COLUMN cancellation_request.reviewed_by_staff_id IS '承認/却下した管理者の職員ID';
COMMENT ON COLUMN cancellation_request.reviewed_at IS '承認/却下日時';
COMMENT ON COLUMN cancellation_request.review_comment IS '却下理由など（任意）';

-- 2. applicationテーブルのステータス制約を更新
-- 既存のステータス制約を削除
ALTER TABLE application DROP CONSTRAINT IF EXISTS application_status_check;

-- 新しいステータス制約を追加（キャンセル関連ステータスを含む）
ALTER TABLE application ADD CONSTRAINT application_status_check
  CHECK (status IN (
    'before_lottery',
    'after_lottery',
    'confirmed',
    'withdrawn',
    'cancelled',
    'pending_approval',
    'pending_cancellation',
    'cancelled_before_lottery',
    'cancelled_after_lottery'
  ));
