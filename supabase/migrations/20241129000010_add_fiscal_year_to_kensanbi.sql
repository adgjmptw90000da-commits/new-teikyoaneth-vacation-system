-- kensanbi_grant_history に年度カラム追加
ALTER TABLE kensanbi_grant_history ADD COLUMN IF NOT EXISTS
  fiscal_year INTEGER;

-- kensanbi_usage_history に年度カラム追加
ALTER TABLE kensanbi_usage_history ADD COLUMN IF NOT EXISTS
  fiscal_year INTEGER;

-- 年度の計算関数（shift_dateから自動計算）
-- 2月〜12月はその年、1月は前年の年度
CREATE OR REPLACE FUNCTION calc_fiscal_year_from_shift_date(shift_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF EXTRACT(MONTH FROM shift_date) >= 2 THEN
    RETURN EXTRACT(YEAR FROM shift_date);
  ELSE
    RETURN EXTRACT(YEAR FROM shift_date) - 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 消費日から年度を計算（4月〜12月はその年、1月〜3月は前年の年度）
CREATE OR REPLACE FUNCTION calc_fiscal_year_from_usage_date(usage_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF EXTRACT(MONTH FROM usage_date) >= 4 THEN
    RETURN EXTRACT(YEAR FROM usage_date);
  ELSE
    RETURN EXTRACT(YEAR FROM usage_date) - 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_kensanbi_grant_fiscal_year
  ON kensanbi_grant_history(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_kensanbi_usage_fiscal_year
  ON kensanbi_usage_history(fiscal_year);

COMMENT ON COLUMN kensanbi_grant_history.fiscal_year IS '対象年度（4月〜翌3月）。shift_dateから計算。';
COMMENT ON COLUMN kensanbi_usage_history.fiscal_year IS '消費した年度。usage_dateから計算。';
