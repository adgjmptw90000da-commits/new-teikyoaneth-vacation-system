-- 確定処理後のレベル3申請用にpending_approvalステータスを追加

-- 既存のステータス制約を削除
ALTER TABLE application DROP CONSTRAINT IF EXISTS application_status_check;

-- 新しいステータス制約を追加（pending_approvalを含む）
ALTER TABLE application ADD CONSTRAINT application_status_check
  CHECK (status IN ('before_lottery', 'after_lottery', 'confirmed', 'withdrawn', 'cancelled', 'pending_approval'));
