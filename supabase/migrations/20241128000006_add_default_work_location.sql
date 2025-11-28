-- schedule_type に default_work_location_id を追加
ALTER TABLE schedule_type ADD COLUMN IF NOT EXISTS default_work_location_id INTEGER REFERENCES work_location(id);

-- shift_type に default_work_location_id を追加
ALTER TABLE shift_type ADD COLUMN IF NOT EXISTS default_work_location_id INTEGER REFERENCES work_location(id);
