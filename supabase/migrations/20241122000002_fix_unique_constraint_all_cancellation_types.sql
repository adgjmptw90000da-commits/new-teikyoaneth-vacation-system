-- キャンセル関連のすべてのステータスを除外するようにユニーク制約を修正
-- 問題: cancelled_before_lottery と cancelled_after_lottery がユニーク制約の対象になっていた
-- 解決: すべてのキャンセルステータスを除外する

-- 既存の部分的ユニークインデックスを削除
DROP INDEX IF EXISTS unique_staff_vacation_date_active;

-- すべてのキャンセルステータスを除外した部分的ユニークインデックスを作成
CREATE UNIQUE INDEX unique_staff_vacation_date_active
  ON application(staff_id, vacation_date)
  WHERE status NOT IN ('cancelled', 'cancelled_before_lottery', 'cancelled_after_lottery');

-- これにより、キャンセルされた申請（すべての種類）は複数存在できるが、
-- 有効な申請（キャンセル以外）は同一日付に1つだけとなる
