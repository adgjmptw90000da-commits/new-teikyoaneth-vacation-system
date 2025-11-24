-- テスト申請の作成（1月5日〜10日、全70件）
-- 全て期間内申請、レベルランダム、優先順位は申請順で付与

DO $$
DECLARE
  test_date DATE;
  user_ids TEXT[] := ARRAY['99001', '99002', '99003', '99004', '99005', '99006', '99007', '99008', '99009', '99010'];
  levels INT[] := ARRAY[1, 2, 3];
  periods TEXT[] := ARRAY['full_day', 'am', 'pm'];
  selected_user TEXT;
  selected_level INT;
  selected_period TEXT;
  app_count INT := 0;
  date_priority INT;
  current_date_apps INT;
BEGIN
  -- 1月5日（月）の申請 - 10件
  test_date := '2026-01-05';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '10 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月5日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月6日（火）の申請 - 10件
  test_date := '2026-01-06';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '9 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月6日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月7日（水）の申請 - 10件
  test_date := '2026-01-07';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '8 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月7日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月8日（木）の申請 - 10件
  test_date := '2026-01-08';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '7 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月8日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月9日（金）の申請 - 10件
  test_date := '2026-01-09';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '6 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月9日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月10日（土）の申請 - 10件（AMのみ）
  test_date := '2026-01-10';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '5 days' + (i || ' hours')::INTERVAL,
      test_date,
      'am',  -- 土曜日はAMのみ
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月10日・土曜AM）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月12日（月）の申請 - 10件（70件達成のため追加）
  test_date := '2026-01-12';
  date_priority := 1;
  FOR i IN 1..10 LOOP
    selected_user := user_ids[i];
    selected_level := levels[(i % 3) + 1];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '4 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      selected_level,
      true,
      'before_lottery',
      date_priority,
      'テストデータ（1月12日）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  RAISE NOTICE 'テスト申請を%件作成しました', app_count;
END $$;

-- テスト申請情報のコメント
COMMENT ON TABLE application IS 'テスト申請: 2026年1月5日〜12日、全70件（期間内申請、優先順位付き）';
