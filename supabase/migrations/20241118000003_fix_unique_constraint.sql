-- キャンセルされた申請もログとして残せるように制約を変更

-- 既存のUNIQUE制約を削除
ALTER TABLE application DROP CONSTRAINT IF EXISTS unique_staff_vacation_date;

-- キャンセル以外の申請のみユニーク制約を適用（部分的なユニークインデックス）
CREATE UNIQUE INDEX unique_staff_vacation_date_active
  ON application(staff_id, vacation_date)
  WHERE status != 'cancelled';

-- これにより、キャンセルされた申請は複数存在できるが、
-- 有効な申請（キャンセル以外）は同一日付に1つだけとなる
