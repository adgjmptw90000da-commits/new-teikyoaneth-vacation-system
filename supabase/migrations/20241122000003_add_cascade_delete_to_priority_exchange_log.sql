-- priority_exchange_logテーブルの外部キー制約にON DELETE CASCADEを追加
-- これにより、申請が削除されると関連する交換ログも自動的に削除される

-- 既存の外部キー制約を削除
ALTER TABLE priority_exchange_log
  DROP CONSTRAINT IF EXISTS priority_exchange_log_application_id_1_fkey;

ALTER TABLE priority_exchange_log
  DROP CONSTRAINT IF EXISTS priority_exchange_log_application_id_2_fkey;

ALTER TABLE priority_exchange_log
  DROP CONSTRAINT IF EXISTS priority_exchange_log_exchanged_by_staff_id_fkey;

-- ON DELETE CASCADE付きの外部キー制約を追加
ALTER TABLE priority_exchange_log
  ADD CONSTRAINT priority_exchange_log_application_id_1_fkey
  FOREIGN KEY (application_id_1)
  REFERENCES application(id)
  ON DELETE CASCADE;

ALTER TABLE priority_exchange_log
  ADD CONSTRAINT priority_exchange_log_application_id_2_fkey
  FOREIGN KEY (application_id_2)
  REFERENCES application(id)
  ON DELETE CASCADE;

ALTER TABLE priority_exchange_log
  ADD CONSTRAINT priority_exchange_log_exchanged_by_staff_id_fkey
  FOREIGN KEY (exchanged_by_staff_id)
  REFERENCES "user"(staff_id)
  ON DELETE CASCADE;
