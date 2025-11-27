-- 予定種別マスタ
CREATE TABLE schedule_type_master (
  type_code VARCHAR PRIMARY KEY,
  display_name VARCHAR NOT NULL,
  short_name VARCHAR NOT NULL,  -- カレンダー表示用の短縮名
  can_night_shift_same_day BOOLEAN DEFAULT TRUE,
  can_night_shift_prev_day BOOLEAN DEFAULT TRUE,
  can_night_shift_next_day BOOLEAN DEFAULT TRUE,
  monthly_limit INTEGER,
  requires_time_period BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

-- 予定種別マスタデータ
INSERT INTO schedule_type_master (type_code, display_name, short_name, can_night_shift_same_day, can_night_shift_prev_day, can_night_shift_next_day, monthly_limit, requires_time_period, display_order) VALUES
('conference_presentation', '学会(発表)', '学発', false, false, true, null, false, 1),
('conference_attendance', '学会(参加)', '学参', false, true, true, null, false, 2),
('no_night_shift', '当直なし希望', '当なし', false, true, true, 3, false, 3),
('admin_night_shift', '管理当直', '管当', true, true, false, null, false, 4),
('official_duty', '公務', '公務', false, false, true, null, false, 5),
('exam_supervisor', '試験監督', '試験', true, false, true, null, false, 6),
('lecture', '講義', '講義', true, false, true, null, false, 7),
('committee', '委員会', '委員', true, false, true, null, false, 8),
('bsl', 'BSL', 'BSL', true, false, true, null, true, 9),
('internal_research', '院内研究', '研究', true, true, true, null, false, 10),
('graduate_school', '大学院(夕方)', '院生', false, false, true, null, false, 11);

-- ユーザー勤務設定
CREATE TABLE user_work_settings (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  work_type VARCHAR NOT NULL DEFAULT 'full_with_night',  -- 勤務体制
  research_day INTEGER,        -- 研究日の曜日(0=日, 1=月, ..., 6=土)
  pain_clinic_days INTEGER[],  -- ペイン外来の曜日（複数可）
  first_year_research_day INTEGER,  -- 1年目研究日
  secondment_start DATE,       -- 出向開始日
  secondment_end DATE,         -- 出向終了日
  leave_of_absence_start DATE, -- 休職開始日
  leave_of_absence_end DATE,   -- 休職終了日
  short_time_start DATE,       -- 時短開始日
  short_time_end DATE,         -- 時短終了日
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id)
);

-- 予定提出（月ごと）
CREATE TABLE schedule_submission (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR NOT NULL REFERENCES "user"(staff_id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL,  -- 1-12
  status VARCHAR NOT NULL DEFAULT 'draft',  -- draft, submitted, confirmed
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, target_year, target_month)
);

-- 日ごとの予定
CREATE TABLE daily_schedule (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES schedule_submission(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  schedule_type VARCHAR NOT NULL REFERENCES schedule_type_master(type_code),
  time_period VARCHAR,  -- 'am', 'pm', 'full_day'（BSL用など）
  remarks TEXT,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  source_application_id INTEGER REFERENCES application(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, schedule_date, schedule_type)
);

-- インデックス作成
CREATE INDEX idx_user_work_settings_staff_id ON user_work_settings(staff_id);
CREATE INDEX idx_schedule_submission_staff_id ON schedule_submission(staff_id);
CREATE INDEX idx_schedule_submission_year_month ON schedule_submission(target_year, target_month);
CREATE INDEX idx_daily_schedule_submission_id ON daily_schedule(submission_id);
CREATE INDEX idx_daily_schedule_date ON daily_schedule(schedule_date);
