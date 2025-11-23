-- テスト用: 2025年12月1日〜6日の申請データを作成
-- 合計100件（期間内L1/L2/L3、期間外L3をランダムに配分）
-- 各日付ごとに申請順（applied_at順）で優先順位を1から振る

DO $$
DECLARE
  all_users TEXT[];
  user_idx INT := 1;
  selected_user TEXT;
  target_date DATE;
  app_count INT := 0;
  period_val TEXT;
  applied_timestamp TIMESTAMPTZ;
  is_within_period BOOLEAN;
  app_record RECORD;

  -- 日付ごとの配分設定
  dates_config CONSTANT JSONB := jsonb_build_array(
    jsonb_build_object('date', '2025-12-01', 'l1_in', 6, 'l2_in', 6, 'l3_in', 3, 'l3_out', 2),
    jsonb_build_object('date', '2025-12-02', 'l1_in', 6, 'l2_in', 6, 'l3_in', 3, 'l3_out', 2),
    jsonb_build_object('date', '2025-12-03', 'l1_in', 6, 'l2_in', 6, 'l3_in', 3, 'l3_out', 2),
    jsonb_build_object('date', '2025-12-04', 'l1_in', 6, 'l2_in', 6, 'l3_in', 3, 'l3_out', 2),
    jsonb_build_object('date', '2025-12-05', 'l1_in', 6, 'l2_in', 6, 'l3_in', 3, 'l3_out', 2),
    jsonb_build_object('date', '2025-12-06', 'l1_in', 5, 'l2_in', 5, 'l3_in', 3, 'l3_out', 2)
  );

  day_config JSONB;
  i INT;
  j INT;
  priority_counter INT;

BEGIN
  -- 既存ユーザーを全て取得（管理者以外）
  SELECT ARRAY_AGG(staff_id ORDER BY random())
  INTO all_users
  FROM "user"
  WHERE NOT is_admin;

  RAISE NOTICE 'ユーザー数: %', array_length(all_users, 1);

  -- 各日付ごとに処理
  FOR i IN 0..5 LOOP
    day_config := dates_config->i;
    target_date := (day_config->>'date')::DATE;

    -- 日付ごとにユーザーをシャッフル（重複を避けるため）
    SELECT ARRAY_AGG(staff_id ORDER BY random())
    INTO all_users
    FROM "user"
    WHERE NOT is_admin;
    user_idx := 1; -- 日付ごとにリセット

    RAISE NOTICE '% : ユーザー数=%', target_date, array_length(all_users, 1);

    -- レベル1期間内申請（優先順位はNULLで一旦作成）
    FOR j IN 1..(day_config->>'l1_in')::INT LOOP
      selected_user := all_users[user_idx];
      user_idx := user_idx + 1;

      -- 期間内: 2025年9月1日〜15日のランダム時刻
      applied_timestamp := '2025-09-01 09:00:00+09'::TIMESTAMPTZ +
                          (random() * INTERVAL '14 days') +
                          (random() * INTERVAL '12 hours');

      -- periodをランダムに選択（土曜日はamのみ）
      IF target_date = '2025-12-06' THEN
        period_val := 'am';
      ELSE
        period_val := (ARRAY['full_day', 'am', 'pm'])[floor(random() * 3 + 1)];
      END IF;

      INSERT INTO application (
        staff_id, applied_at, vacation_date, period, level,
        is_within_lottery_period, status, priority, created_at, updated_at
      ) VALUES (
        selected_user, applied_timestamp, target_date, period_val, 1,
        true, 'before_lottery', NULL, applied_timestamp, applied_timestamp
      );

      app_count := app_count + 1;
    END LOOP;

    -- レベル2期間内申請
    FOR j IN 1..(day_config->>'l2_in')::INT LOOP
      selected_user := all_users[user_idx];
      user_idx := user_idx + 1;

      applied_timestamp := '2025-09-01 09:00:00+09'::TIMESTAMPTZ +
                          (random() * INTERVAL '14 days') +
                          (random() * INTERVAL '12 hours');

      IF target_date = '2025-12-06' THEN
        period_val := 'am';
      ELSE
        period_val := (ARRAY['full_day', 'am', 'pm'])[floor(random() * 3 + 1)];
      END IF;

      INSERT INTO application (
        staff_id, applied_at, vacation_date, period, level,
        is_within_lottery_period, status, priority, created_at, updated_at
      ) VALUES (
        selected_user, applied_timestamp, target_date, period_val, 2,
        true, 'before_lottery', NULL, applied_timestamp, applied_timestamp
      );

      app_count := app_count + 1;
    END LOOP;

    -- レベル3期間内申請
    FOR j IN 1..(day_config->>'l3_in')::INT LOOP
      selected_user := all_users[user_idx];
      user_idx := user_idx + 1;

      applied_timestamp := '2025-09-01 09:00:00+09'::TIMESTAMPTZ +
                          (random() * INTERVAL '14 days') +
                          (random() * INTERVAL '12 hours');

      IF target_date = '2025-12-06' THEN
        period_val := 'am';
      ELSE
        period_val := (ARRAY['full_day', 'am', 'pm'])[floor(random() * 3 + 1)];
      END IF;

      INSERT INTO application (
        staff_id, applied_at, vacation_date, period, level,
        is_within_lottery_period, status, priority, created_at, updated_at
      ) VALUES (
        selected_user, applied_timestamp, target_date, period_val, 3,
        true, 'before_lottery', NULL, applied_timestamp, applied_timestamp
      );

      app_count := app_count + 1;
    END LOOP;

    -- レベル3期間外申請
    FOR j IN 1..(day_config->>'l3_out')::INT LOOP
      selected_user := all_users[user_idx];
      user_idx := user_idx + 1;

      -- 期間外: 2025年9月16日〜11月22日のランダム時刻
      applied_timestamp := '2025-09-16 09:00:00+09'::TIMESTAMPTZ +
                          (random() * INTERVAL '67 days') +
                          (random() * INTERVAL '12 hours');

      IF target_date = '2025-12-06' THEN
        period_val := 'am';
      ELSE
        period_val := (ARRAY['full_day', 'am', 'pm'])[floor(random() * 3 + 1)];
      END IF;

      INSERT INTO application (
        staff_id, applied_at, vacation_date, period, level,
        is_within_lottery_period, status, priority, created_at, updated_at
      ) VALUES (
        selected_user, applied_timestamp, target_date, period_val, 3,
        false, 'before_lottery', NULL, applied_timestamp, applied_timestamp
      );

      app_count := app_count + 1;
    END LOOP;

    -- この日付の申請を申請順（applied_at順）で優先順位を振り直し
    priority_counter := 1;
    FOR app_record IN (
      SELECT id FROM application
      WHERE vacation_date = target_date
        AND status = 'before_lottery'
        AND priority IS NULL
      ORDER BY applied_at ASC
    ) LOOP
      UPDATE application
      SET priority = priority_counter
      WHERE id = app_record.id;

      priority_counter := priority_counter + 1;
    END LOOP;

    RAISE NOTICE '% の申請を作成: L1期間内=%件, L2期間内=%件, L3期間内=%件, L3期間外=%件 (優先順位を申請順で付与)',
                 target_date,
                 (day_config->>'l1_in')::INT,
                 (day_config->>'l2_in')::INT,
                 (day_config->>'l3_in')::INT,
                 (day_config->>'l3_out')::INT;
  END LOOP;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'テスト申請データを合計 % 件作成しました', app_count;
  RAISE NOTICE '===========================================';

END $$;
