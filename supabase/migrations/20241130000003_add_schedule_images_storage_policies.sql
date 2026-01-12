-- schedule-images バケット用のStorageポリシー
-- 注意: バケット自体はSupabase Dashboardで手動作成が必要（public: true）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images insert" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images update" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images select" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images delete" ON storage.objects;
DROP POLICY IF EXISTS "schedule-images all" ON storage.objects;

-- 全許可ポリシー（シンプル）
CREATE POLICY "schedule-images all"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'schedule-images')
WITH CHECK (bucket_id = 'schedule-images');
