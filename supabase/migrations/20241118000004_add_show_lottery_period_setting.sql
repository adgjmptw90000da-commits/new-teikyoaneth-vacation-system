-- 設定テーブルに抽選期間内申請表示設定を追加
ALTER TABLE "setting" ADD COLUMN IF NOT EXISTS show_lottery_period_applications BOOLEAN DEFAULT true;

-- 既存設定はデフォルトでtrueに設定
UPDATE "setting" SET show_lottery_period_applications = true WHERE show_lottery_period_applications IS NULL;
