-- 研鑽日手動追加機能用の変更
-- user_shift_idをNULL許可に変更（手動追加時はNULL）

-- NOT NULL制約を削除
ALTER TABLE kensanbi_grant_history ALTER COLUMN user_shift_id DROP NOT NULL;

-- UNIQUE制約を削除（手動追加時はNULLなので不要）
ALTER TABLE kensanbi_grant_history DROP CONSTRAINT IF EXISTS kensanbi_grant_history_user_shift_id_key;
