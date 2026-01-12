-- 通知機能用カラムの追加
-- application テーブル: 確定後レベル3申請の承認/却下通知用
-- cancellation_request テーブル: キャンセル申請の承認/却下通知用

-- application テーブルに user_notified カラムを追加
-- confirmed または cancelled_after_lottery になった時に false に設定され、
-- ユーザーが「了解」を押すと true になる
ALTER TABLE application ADD COLUMN IF NOT EXISTS user_notified BOOLEAN DEFAULT true;

-- cancellation_request テーブルに user_notified カラムを追加
-- approved または rejected になった時に false に設定され、
-- ユーザーが「了解」を押すと true になる
ALTER TABLE cancellation_request ADD COLUMN IF NOT EXISTS user_notified BOOLEAN DEFAULT true;

-- コメント追加
COMMENT ON COLUMN application.user_notified IS 'ユーザーが承認/却下結果を確認済みかどうか';
COMMENT ON COLUMN cancellation_request.user_notified IS 'ユーザーがキャンセル申請の承認/却下結果を確認済みかどうか';
