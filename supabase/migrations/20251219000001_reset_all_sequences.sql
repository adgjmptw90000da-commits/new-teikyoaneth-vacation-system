-- 全テーブルのシーケンスをリセット
-- SERIAL PRIMARY KEYを使用しているテーブルのシーケンスを現在の最大IDに合わせる
-- 空テーブルの場合は1に設定（シーケンスの最小値が1のため）

SELECT setval('application_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM application), 0), 1));
SELECT setval('holiday_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM holiday), 0), 1));
SELECT setval('cancellation_request_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM cancellation_request), 0), 1));
SELECT setval('priority_exchange_log_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM priority_exchange_log), 0), 1));
SELECT setval('event_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM event), 0), 1));
SELECT setval('conference_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM conference), 0), 1));
SELECT setval('schedule_type_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM schedule_type), 0), 1));
SELECT setval('user_schedule_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_schedule), 0), 1));
SELECT setval('user_research_day_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_research_day), 0), 1));
SELECT setval('user_work_settings_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_work_settings), 0), 1));
SELECT setval('schedule_submission_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM schedule_submission), 0), 1));
SELECT setval('daily_schedule_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM daily_schedule), 0), 1));
SELECT setval('user_secondment_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_secondment), 0), 1));
SELECT setval('user_leave_of_absence_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_leave_of_absence), 0), 1));
SELECT setval('shift_type_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM shift_type), 0), 1));
SELECT setval('user_shift_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_shift), 0), 1));
SELECT setval('work_location_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM work_location), 0), 1));
SELECT setval('user_work_location_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_work_location), 0), 1));
SELECT setval('schedule_publish_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM schedule_publish), 0), 1));
SELECT setval('count_config_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM count_config), 0), 1));
SELECT setval('shift_assign_preset_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM shift_assign_preset), 0), 1));
SELECT setval('kensanbi_grant_history_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM kensanbi_grant_history), 0), 1));
SELECT setval('kensanbi_usage_history_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM kensanbi_usage_history), 0), 1));
SELECT setval('member_count_config_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM member_count_config), 0), 1));
SELECT setval('score_config_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM score_config), 0), 1));
SELECT setval('duty_assign_preset_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM duty_assign_preset), 0), 1));
SELECT setval('user_point_retention_rate_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM user_point_retention_rate), 0), 1));
SELECT setval('name_list_config_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM name_list_config), 0), 1));
SELECT setval('priority_exchange_request_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM priority_exchange_request), 0), 1));
SELECT setval('schedule_hidden_members_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM schedule_hidden_members), 0), 1));
