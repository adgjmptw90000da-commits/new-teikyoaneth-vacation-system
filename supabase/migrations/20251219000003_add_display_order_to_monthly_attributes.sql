-- user_monthly_attributesテーブルにdisplay_orderカラムを追加
-- メンバーの表示順を月別に管理するため

ALTER TABLE user_monthly_attributes
ADD COLUMN display_order INTEGER DEFAULT 0;

-- インデックス
CREATE INDEX idx_user_monthly_attributes_display_order
  ON user_monthly_attributes(year, month, display_order);

-- コメント
COMMENT ON COLUMN user_monthly_attributes.display_order IS 'メンバー表示順';
