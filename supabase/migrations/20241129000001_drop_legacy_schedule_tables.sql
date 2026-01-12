-- 旧管理テーブルを削除（user_scheduleに統合済み）
-- 研究日・出向中・休職中は user_schedule テーブルで一元管理するため、
-- 以下の旧テーブルは不要になりました。

-- 注意: 本番環境でこのマイグレーションを実行する前に、
-- 既存データが user_schedule に移行されていることを確認してください。

DROP TABLE IF EXISTS user_research_day;
DROP TABLE IF EXISTS user_secondment;
DROP TABLE IF EXISTS user_leave_of_absence;
