-- vacation_date_future_check制約を削除
-- この制約はUPDATE時にも適用され、過去の年休レコード更新を妨げる
-- 新規申請時のバリデーションはアプリケーション側で行う
ALTER TABLE application DROP CONSTRAINT IF EXISTS vacation_date_future_check;
