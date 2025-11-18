-- 年休申請システム スキーマ

-- applicationテーブル: 年休申請情報管理
CREATE TABLE application (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  applied_at TIMESTAMP DEFAULT NOW(),
  vacation_date DATE NOT NULL,
  period VARCHAR NOT NULL CHECK (period IN ('full_day', 'am', 'pm')),
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  is_within_lottery_period BOOLEAN NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'before_lottery'
    CHECK (status IN ('before_lottery', 'after_lottery', 'confirmed', 'withdrawn', 'cancelled')),
  priority INTEGER,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_staff_vacation_date UNIQUE(staff_id, vacation_date)
);

-- vacation_dateは未来日のみ許可
ALTER TABLE application ADD CONSTRAINT vacation_date_future_check
  CHECK (vacation_date > CURRENT_DATE);

-- applicationテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_application_updated_at
  BEFORE UPDATE ON application
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- calendar_managementテーブル: 日別の管理情報（マンパワー、ステータス）
CREATE TABLE calendar_management (
  vacation_date DATE PRIMARY KEY,
  max_people INTEGER,
  status VARCHAR NOT NULL DEFAULT 'before_lottery'
    CHECK (status IN ('before_lottery', 'after_lottery', 'confirmation_completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- calendar_managementテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_calendar_management_updated_at
  BEFORE UPDATE ON calendar_management
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- holidayテーブル: 祝日マスタ
CREATE TABLE holiday (
  id SERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- holidayテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_holiday_updated_at
  BEFORE UPDATE ON holiday
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- settingテーブルに抽選参加可能期間の設定を追加
ALTER TABLE setting
  ADD COLUMN lottery_period_months INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN lottery_period_start_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN lottery_period_end_day INTEGER NOT NULL DEFAULT 15;

-- 抽選期間の日付は1-31の範囲内
ALTER TABLE setting
  ADD CONSTRAINT lottery_start_day_check CHECK (lottery_period_start_day >= 1 AND lottery_period_start_day <= 31),
  ADD CONSTRAINT lottery_end_day_check CHECK (lottery_period_end_day >= 1 AND lottery_period_end_day <= 31);

-- 既存の設定レコードに抽選期間のデフォルト値を設定（すでに存在する場合）
UPDATE setting SET
  lottery_period_months = 3,
  lottery_period_start_day = 1,
  lottery_period_end_day = 15
WHERE id = 1;

-- インデックスの作成
CREATE INDEX idx_application_staff_id ON application(staff_id);
CREATE INDEX idx_application_vacation_date ON application(vacation_date);
CREATE INDEX idx_application_status ON application(status);
CREATE INDEX idx_application_vacation_date_status ON application(vacation_date, status);
CREATE INDEX idx_holiday_date ON holiday(holiday_date);
CREATE INDEX idx_calendar_management_date ON calendar_management(vacation_date);
