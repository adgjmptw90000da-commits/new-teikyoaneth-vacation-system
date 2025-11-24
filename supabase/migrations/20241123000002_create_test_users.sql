-- テストユーザー10人の作成
-- 全て一般ユーザー（is_admin = false）

INSERT INTO "user" (staff_id, name, password, is_admin, point_retention_rate) VALUES
  ('99001', 'テストユーザー1', 'password', false, 100),
  ('99002', 'テストユーザー2', 'password', false, 100),
  ('99003', 'テストユーザー3', 'password', false, 100),
  ('99004', 'テストユーザー4', 'password', false, 100),
  ('99005', 'テストユーザー5', 'password', false, 100),
  ('99006', 'テストユーザー6', 'password', false, 100),
  ('99007', 'テストユーザー7', 'password', false, 100),
  ('99008', 'テストユーザー8', 'password', false, 100),
  ('99009', 'テストユーザー9', 'password', false, 100),
  ('99010', 'テストユーザー10', 'password', false, 100)
ON CONFLICT (staff_id) DO NOTHING;

-- テストユーザー情報
COMMENT ON TABLE "user" IS 'テストユーザー: 職員ID 99001-99010, パスワード: password';
