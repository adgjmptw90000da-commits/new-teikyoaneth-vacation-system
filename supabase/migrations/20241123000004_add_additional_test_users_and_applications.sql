-- 追加テストユーザー3人の作成と期間外レベル3申請の追加

-- 追加テストユーザー3人を作成
INSERT INTO "user" (staff_id, name, password, is_admin, point_retention_rate) VALUES
  ('99011', 'テストユーザー11', 'password', false, 100),
  ('99012', 'テストユーザー12', 'password', false, 100),
  ('99013', 'テストユーザー13', 'password', false, 100)
ON CONFLICT (staff_id) DO NOTHING;

-- 期間外レベル3申請の作成（各日3件ずつ、合計21件）
DO $$
DECLARE
  test_date DATE;
  user_ids TEXT[] := ARRAY['99011', '99012', '99013'];
  periods TEXT[] := ARRAY['full_day', 'am', 'pm'];
  selected_user TEXT;
  selected_period TEXT;
  app_count INT := 0;
  date_priority INT;
BEGIN
  -- 1月5日（月）の期間外レベル3申請 - 3件
  test_date := '2026-01-05';

  -- その日の最大優先順位を取得して、その後に追加
  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,  -- レベル3
      false,  -- 期間外
      'before_lottery',
      date_priority,
      'テストデータ（1月5日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月6日（火）の期間外レベル3申請 - 3件
  test_date := '2026-01-06';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月6日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月7日（水）の期間外レベル3申請 - 3件
  test_date := '2026-01-07';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月7日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月8日（木）の期間外レベル3申請 - 3件
  test_date := '2026-01-08';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月8日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月9日（金）の期間外レベル3申請 - 3件
  test_date := '2026-01-09';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月9日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月10日（土）の期間外レベル3申請 - 3件（AMのみ）
  test_date := '2026-01-10';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      'am',  -- 土曜日はAMのみ
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月10日・土曜AM・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  -- 1月12日（月）の期間外レベル3申請 - 3件
  test_date := '2026-01-12';

  SELECT COALESCE(MAX(priority), 0) + 1 INTO date_priority
  FROM application
  WHERE vacation_date = test_date;

  FOR i IN 1..3 LOOP
    selected_user := user_ids[i];
    selected_period := periods[(i % 3) + 1];

    INSERT INTO application (staff_id, applied_at, vacation_date, period, level, is_within_lottery_period, status, priority, remarks)
    VALUES (
      selected_user,
      NOW() - INTERVAL '3 days' + (i || ' hours')::INTERVAL,
      test_date,
      selected_period,
      3,
      false,
      'before_lottery',
      date_priority,
      'テストデータ（1月12日・期間外レベル3）'
    );

    date_priority := date_priority + 1;
    app_count := app_count + 1;
  END LOOP;

  RAISE NOTICE '期間外レベル3申請を%件作成しました', app_count;
END $$;

-- コメント追加
COMMENT ON TABLE "user" IS 'テストユーザー: 職員ID 99001-99013, パスワード: password';
COMMENT ON TABLE application IS 'テスト申請: 2026年1月5日〜12日、全91件（期間内70件、期間外レベル3が21件、優先順位付き）';
