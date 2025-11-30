-- schedule-images バケット用のStorageポリシー
-- 注意: バケット自体はSupabase Dashboardで手動作成が必要（public: true）

-- 既存のポリシーを削除（エラーが出ても無視してOK）
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images insert" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images update" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images select" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images delete" ON storage.objects;

-- INSERT: 認証済みユーザーがアップロード可能
CREATE POLICY "schedule-images insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'schedule-images');

-- UPDATE: 認証済みユーザーが更新可能（upsert用）
CREATE POLICY "schedule-images update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'schedule-images')
WITH CHECK (bucket_id = 'schedule-images');

-- SELECT: 公開読み取り
CREATE POLICY "schedule-images select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'schedule-images');

-- DELETE: 認証済みユーザーが削除可能
CREATE POLICY "schedule-images delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'schedule-images');
