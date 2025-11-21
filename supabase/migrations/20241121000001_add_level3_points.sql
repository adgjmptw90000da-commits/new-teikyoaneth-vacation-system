-- Add level3_points column to setting table
ALTER TABLE setting
ADD COLUMN level3_points NUMERIC(3,1) NOT NULL DEFAULT 0.1;

-- Add comment
COMMENT ON COLUMN setting.level3_points IS 'レベル3(マンパワーに余裕があれば休みたい)の全日申請時の消費得点';
