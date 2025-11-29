// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { DisplaySettings } from "@/lib/database.types";

// デフォルトの表示設定（研究日・出向・休職はschedule_typeに移行）
const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  vacation: {
    label_full: "年休",
    label_am: "AM",
    label_pm: "PM",
    color: "#000000",
    bg_color: "#FFCCCC",
  },
  vacation_applied: {
    color: "#000000",
    bg_color: "#99CCFF",
  },
  kensanbi_used: {
    label: "研鑽日",
    color: "#000000",
    bg_color: "#99FF99",
  },
};

interface ScheduleType {
  id: number;
  name: string;
  display_label: string | null;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  prev_day_night_shift: boolean;
  same_day_night_shift: boolean;
  next_day_night_shift: boolean;
  display_order: number;
  color: string;
  text_color: string;
  monthly_limit: number | null;
  is_kensanbi_target: boolean;
  default_work_location_id: number | null;
  is_system: boolean;
  system_key: string | null;
}

interface ShiftType {
  id: number;
  name: string;
  display_label: string | null;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  prev_day_night_shift: boolean;
  same_day_night_shift: boolean;
  next_day_night_shift: boolean;
  display_order: number;
  color: string;
  text_color: string;
  is_kensanbi_target: boolean;
  monthly_limit: number | null;
  default_work_location_id: number | null;
}

interface NewScheduleType {
  name: string;
  display_label: string;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  prev_day_night_shift: boolean;
  same_day_night_shift: boolean;
  next_day_night_shift: boolean;
  color: string;
  text_color: string;
  monthly_limit: number | null;
  is_kensanbi_target: boolean;
  default_work_location_id: number | null;
}

interface NewShiftType {
  name: string;
  display_label: string;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  prev_day_night_shift: boolean;
  same_day_night_shift: boolean;
  next_day_night_shift: boolean;
  color: string;
  text_color: string;
  is_kensanbi_target: boolean;
  monthly_limit: number | null;
  default_work_location_id: number | null;
}

interface WorkLocation {
  id: number;
  name: string;
  display_label: string | null;
  color: string;
  text_color: string;
  display_order: number;
  is_default_weekday: boolean;
  is_default_holiday: boolean;
}

interface NewWorkLocation {
  name: string;
  display_label: string;
  color: string;
  text_color: string;
  is_default_weekday: boolean;
  is_default_holiday: boolean;
}

// 研究日・出向・休職はschedule_typeに移行したため、systemタブは年休・研鑽日のみ
type SystemSettingKey = 'vacation' | 'vacation_applied' | 'kensanbi_used';

const SYSTEM_SETTING_LABELS: Record<SystemSettingKey, string> = {
  vacation: '年休（未申請）',
  vacation_applied: '年休（One人事申請済み）',
  kensanbi_used: '研鑽日',
};

// カラーピッカーコンポーネント
const ColorPicker = ({
  label,
  color,
  onChange,
  allowTransparent = true,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  allowTransparent?: boolean;
}) => {
  const isTransparent = color === "transparent";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {allowTransparent && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={() => onChange(isTransparent ? "#FFFFFF" : "transparent")}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">透明</span>
          </label>
        )}
        <input
          type="color"
          value={isTransparent ? "#FFFFFF" : color}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTransparent}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300 disabled:opacity-50"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
        />
      </div>
    </div>
  );
};

export default function ScheduleSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'shift' | 'workLocation' | 'system'>('schedule');

  // 予定タイプ
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleType | null>(null);
  const [newSchedule, setNewSchedule] = useState<NewScheduleType>({
    name: "",
    display_label: "",
    position_am: true,
    position_pm: true,
    position_night: false,
    prev_day_night_shift: false,
    same_day_night_shift: true,
    next_day_night_shift: true,
    color: "#CCFFFF",
    text_color: "#000000",
    monthly_limit: null,
    is_kensanbi_target: false,
    default_work_location_id: null,
  });

  // シフトタイプ
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [newShift, setNewShift] = useState<NewShiftType>({
    name: "",
    display_label: "",
    position_am: false,
    position_pm: false,
    position_night: true,
    prev_day_night_shift: true,
    same_day_night_shift: true,
    next_day_night_shift: true,
    color: "#CCFFFF",
    text_color: "#000000",
    is_kensanbi_target: false,
    monthly_limit: null,
    default_work_location_id: null,
  });

  // 表示設定
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [editingSystemSetting, setEditingSystemSetting] = useState<SystemSettingKey | null>(null);
  const [tempSystemSetting, setTempSystemSetting] = useState<any>(null);

  // 勤務場所
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [showWorkLocationModal, setShowWorkLocationModal] = useState(false);
  const [editingWorkLocation, setEditingWorkLocation] = useState<WorkLocation | null>(null);
  const [newWorkLocation, setNewWorkLocation] = useState<NewWorkLocation>({
    name: "",
    display_label: "",
    color: "#CCFFFF",
    text_color: "#000000",
    is_default_weekday: false,
    is_default_holiday: false,
  });
  const [draggedWorkLocation, setDraggedWorkLocation] = useState<WorkLocation | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleType | null>(null);
  const [draggedShift, setDraggedShift] = useState<ShiftType | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    const userData = JSON.parse(userStr);
    if (!userData.is_admin) {
      router.push("/home");
      return;
    }
    setUser(userData);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: schedules },
      { data: shifts },
      { data: settings },
      { data: locations },
    ] = await Promise.all([
      supabase.from("schedule_type").select("*").order("display_order"),
      supabase.from("shift_type").select("*").order("display_order"),
      supabase.from("setting").select("display_settings").single(),
      supabase.from("work_location").select("*").order("display_order"),
    ]);

    if (schedules) setScheduleTypes(schedules);
    if (shifts) setShiftTypes(shifts);
    if (settings?.display_settings) {
      setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...settings.display_settings });
    }
    if (locations) setWorkLocations(locations);
    setLoading(false);
  };

  // ===== 予定タイプ関連 =====
  const handleAddSchedule = async () => {
    if (!newSchedule.name.trim()) {
      alert("予定名を入力してください");
      return;
    }
    setSaving(true);
    const maxOrder = scheduleTypes.length > 0 ? Math.max(...scheduleTypes.map(t => t.display_order)) : 0;
    const { error } = await supabase.from("schedule_type").insert({
      ...newSchedule,
      display_label: newSchedule.display_label || null,
      display_order: maxOrder + 1,
    });
    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowScheduleModal(false);
      setNewSchedule({
        name: "", display_label: "", position_am: true, position_pm: true, position_night: false,
        prev_day_night_shift: false, same_day_night_shift: true, next_day_night_shift: true,
        color: "#CCFFFF", text_color: "#000000", monthly_limit: null, is_kensanbi_target: false, default_work_location_id: null,
      });
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !editingSchedule.name.trim()) {
      alert("予定名を入力してください");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("schedule_type").update({
      name: editingSchedule.name,
      display_label: editingSchedule.display_label || null,
      position_am: editingSchedule.position_am,
      position_pm: editingSchedule.position_pm,
      position_night: editingSchedule.position_night,
      prev_day_night_shift: editingSchedule.prev_day_night_shift,
      same_day_night_shift: editingSchedule.same_day_night_shift,
      next_day_night_shift: editingSchedule.next_day_night_shift,
      color: editingSchedule.color,
      text_color: editingSchedule.text_color,
      monthly_limit: editingSchedule.monthly_limit,
      is_kensanbi_target: editingSchedule.is_kensanbi_target,
      default_work_location_id: editingSchedule.default_work_location_id,
    }).eq("id", editingSchedule.id);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingSchedule(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm("この予定タイプを削除しますか？\n既存の予定データも削除されます。")) return;
    const { error } = await supabase.from("schedule_type").delete().eq("id", id);
    if (error) alert("削除に失敗しました: " + error.message);
    else fetchData();
  };

  const handleScheduleDragStart = (e: React.DragEvent, item: ScheduleType) => {
    setDraggedSchedule(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleScheduleDrop = async (e: React.DragEvent, targetItem: ScheduleType) => {
    e.preventDefault();
    if (!draggedSchedule || draggedSchedule.id === targetItem.id) return;
    const newTypes = [...scheduleTypes];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedSchedule.id);
    const targetIndex = newTypes.findIndex(t => t.id === targetItem.id);
    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedSchedule);
    const updates = newTypes.map((t, index) => ({ id: t.id, display_order: index + 1 }));
    setScheduleTypes(newTypes.map((t, index) => ({ ...t, display_order: index + 1 })));
    for (const update of updates) {
      await supabase.from("schedule_type").update({ display_order: update.display_order }).eq("id", update.id);
    }
    setDraggedSchedule(null);
  };

  // ===== シフトタイプ関連 =====
  const handleAddShift = async () => {
    if (!newShift.name.trim()) {
      alert("シフト名を入力してください");
      return;
    }
    setSaving(true);
    const maxOrder = shiftTypes.length > 0 ? Math.max(...shiftTypes.map(t => t.display_order)) : 0;
    const { error } = await supabase.from("shift_type").insert({
      ...newShift,
      display_label: newShift.display_label || null,
      display_order: maxOrder + 1,
    });
    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowShiftModal(false);
      setNewShift({
        name: "", display_label: "", position_am: false, position_pm: false, position_night: true,
        prev_day_night_shift: true, same_day_night_shift: true, next_day_night_shift: true,
        color: "#CCFFFF", text_color: "#000000", is_kensanbi_target: false, monthly_limit: null, default_work_location_id: null,
      });
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdateShift = async () => {
    if (!editingShift || !editingShift.name.trim()) {
      alert("シフト名を入力してください");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("shift_type").update({
      name: editingShift.name,
      display_label: editingShift.display_label || null,
      position_am: editingShift.position_am,
      position_pm: editingShift.position_pm,
      position_night: editingShift.position_night,
      prev_day_night_shift: editingShift.prev_day_night_shift,
      same_day_night_shift: editingShift.same_day_night_shift,
      next_day_night_shift: editingShift.next_day_night_shift,
      color: editingShift.color,
      text_color: editingShift.text_color,
      is_kensanbi_target: editingShift.is_kensanbi_target,
      monthly_limit: editingShift.monthly_limit,
      default_work_location_id: editingShift.default_work_location_id,
    }).eq("id", editingShift.id);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingShift(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteShift = async (id: number) => {
    if (!confirm("このシフトタイプを削除しますか？")) return;
    const { error } = await supabase.from("shift_type").delete().eq("id", id);
    if (error) alert("削除に失敗しました: " + error.message);
    else fetchData();
  };

  const handleShiftDragStart = (e: React.DragEvent, item: ShiftType) => {
    setDraggedShift(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleShiftDrop = async (e: React.DragEvent, targetItem: ShiftType) => {
    e.preventDefault();
    if (!draggedShift || draggedShift.id === targetItem.id) return;
    const newTypes = [...shiftTypes];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedShift.id);
    const targetIndex = newTypes.findIndex(t => t.id === targetItem.id);
    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedShift);
    const updates = newTypes.map((t, index) => ({ id: t.id, display_order: index + 1 }));
    setShiftTypes(newTypes.map((t, index) => ({ ...t, display_order: index + 1 })));
    for (const update of updates) {
      await supabase.from("shift_type").update({ display_order: update.display_order }).eq("id", update.id);
    }
    setDraggedShift(null);
  };

  // ===== システム表示設定関連 =====
  const handleOpenSystemSettingModal = (key: SystemSettingKey) => {
    setEditingSystemSetting(key);
    setTempSystemSetting({ ...displaySettings[key] });
  };

  const handleSaveSystemSetting = async () => {
    if (!editingSystemSetting || !tempSystemSetting) return;
    setSaving(true);
    const newSettings = { ...displaySettings, [editingSystemSetting]: tempSystemSetting };
    const { error } = await supabase.from("setting").update({ display_settings: newSettings }).eq("id", 1);
    if (error) {
      alert("保存に失敗しました: " + error.message);
    } else {
      setDisplaySettings(newSettings);
      setEditingSystemSetting(null);
      setTempSystemSetting(null);
    }
    setSaving(false);
  };

  // ===== 勤務場所関連 =====
  const handleAddWorkLocation = async () => {
    if (!newWorkLocation.name.trim()) {
      alert("勤務場所名を入力してください");
      return;
    }
    setSaving(true);
    const maxOrder = workLocations.length > 0 ? Math.max(...workLocations.map(t => t.display_order)) : 0;

    // デフォルト設定時、他のデフォルトをクリア
    if (newWorkLocation.is_default_weekday) {
      await supabase.from("work_location").update({ is_default_weekday: false }).eq("is_default_weekday", true);
    }
    if (newWorkLocation.is_default_holiday) {
      await supabase.from("work_location").update({ is_default_holiday: false }).eq("is_default_holiday", true);
    }

    const { error } = await supabase.from("work_location").insert({
      ...newWorkLocation,
      display_label: newWorkLocation.display_label || null,
      display_order: maxOrder + 1,
    });
    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowWorkLocationModal(false);
      setNewWorkLocation({
        name: "", display_label: "", color: "#CCFFFF", text_color: "#000000",
        is_default_weekday: false, is_default_holiday: false,
      });
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdateWorkLocation = async () => {
    if (!editingWorkLocation || !editingWorkLocation.name.trim()) {
      alert("勤務場所名を入力してください");
      return;
    }
    setSaving(true);

    // デフォルト設定時、他のデフォルトをクリア
    if (editingWorkLocation.is_default_weekday) {
      await supabase.from("work_location").update({ is_default_weekday: false }).neq("id", editingWorkLocation.id);
    }
    if (editingWorkLocation.is_default_holiday) {
      await supabase.from("work_location").update({ is_default_holiday: false }).neq("id", editingWorkLocation.id);
    }

    const { error } = await supabase.from("work_location").update({
      name: editingWorkLocation.name,
      display_label: editingWorkLocation.display_label || null,
      color: editingWorkLocation.color,
      text_color: editingWorkLocation.text_color,
      is_default_weekday: editingWorkLocation.is_default_weekday,
      is_default_holiday: editingWorkLocation.is_default_holiday,
    }).eq("id", editingWorkLocation.id);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingWorkLocation(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteWorkLocation = async (id: number) => {
    if (!confirm("この勤務場所を削除しますか？")) return;
    const { error } = await supabase.from("work_location").delete().eq("id", id);
    if (error) alert("削除に失敗しました: " + error.message);
    else fetchData();
  };

  const handleWorkLocationDragStart = (e: React.DragEvent, item: WorkLocation) => {
    setDraggedWorkLocation(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleWorkLocationDrop = async (e: React.DragEvent, targetItem: WorkLocation) => {
    e.preventDefault();
    if (!draggedWorkLocation || draggedWorkLocation.id === targetItem.id) return;
    const newTypes = [...workLocations];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedWorkLocation.id);
    const targetIndex = newTypes.findIndex(t => t.id === targetItem.id);
    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedWorkLocation);
    const updates = newTypes.map((t, index) => ({ id: t.id, display_order: index + 1 }));
    setWorkLocations(newTypes.map((t, index) => ({ ...t, display_order: index + 1 })));
    for (const update of updates) {
      await supabase.from("work_location").update({ display_order: update.display_order }).eq("id", update.id);
    }
    setDraggedWorkLocation(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">予定・シフト設定</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </button>
              {activeTab === 'schedule' && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  予定タイプ追加
                </button>
              )}
              {activeTab === 'shift' && (
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  シフト追加
                </button>
              )}
              {activeTab === 'workLocation' && (
                <button
                  onClick={() => setShowWorkLocationModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  勤務場所追加
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* タブナビゲーション */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'schedule' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            予定タイプ
          </button>
          <button
            onClick={() => setActiveTab('shift')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            シフトタイプ
          </button>
          <button
            onClick={() => setActiveTab('workLocation')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'workLocation' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            勤務場所
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            表示設定
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* 予定タイプタブ */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    予定タイプをドラッグして並び替えができます。予定提出画面の選択肢に表示されます。
                  </p>
                </div>
                {scheduleTypes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    予定タイプがありません。「予定タイプ追加」から追加してください。
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {scheduleTypes.map((type) => (
                      <li
                        key={type.id}
                        draggable
                        onDragStart={(e) => handleScheduleDragStart(e, type)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleScheduleDrop(e, type)}
                        className="p-4 hover:bg-gray-50 cursor-move flex items-center gap-4"
                      >
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div
                          className="px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center"
                          style={{ backgroundColor: type.color === 'transparent' ? 'transparent' : type.color, color: type.text_color, border: type.color === 'transparent' ? '1px dashed #ccc' : 'none' }}
                        >
                          {type.display_label || type.name}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {type.name}
                            {type.is_system && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">システム</span>
                            )}
                            {type.monthly_limit && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">月{type.monthly_limit}回まで</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex gap-2 mt-1 flex-wrap">
                            <span className={type.position_am ? "text-blue-600" : "text-gray-400"}>AM</span>
                            <span className={type.position_pm ? "text-blue-600" : "text-gray-400"}>PM</span>
                            <span className={type.position_night ? "text-blue-600" : "text-gray-400"}>夜勤</span>
                            {type.is_kensanbi_target && <span className="text-green-600 ml-2">研鑽日対象</span>}
                            <span className="ml-2 text-gray-400">|</span>
                            <span className={type.prev_day_night_shift ? "text-green-600" : "text-red-400"}>前日当直{type.prev_day_night_shift ? '○' : '×'}</span>
                            <span className={type.same_day_night_shift ? "text-green-600" : "text-red-400"}>当日当直{type.same_day_night_shift ? '○' : '×'}</span>
                            <span className={type.next_day_night_shift ? "text-green-600" : "text-red-400"}>翌日当直{type.next_day_night_shift ? '○' : '×'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingSchedule(type)} className="text-gray-600 hover:text-blue-600 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {!type.is_system && (
                            <button onClick={() => handleDeleteSchedule(type.id)} className="text-gray-600 hover:text-red-600 p-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* シフトタイプタブ */}
            {activeTab === 'shift' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    管理者が予定表作成時に割り振るシフトを設定します。ドラッグして並び替えができます。
                  </p>
                </div>
                {shiftTypes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    シフトタイプがありません。「シフト追加」から追加してください。
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {shiftTypes.map((type) => (
                      <li
                        key={type.id}
                        draggable
                        onDragStart={(e) => handleShiftDragStart(e, type)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleShiftDrop(e, type)}
                        className="p-4 hover:bg-gray-50 cursor-move flex items-center gap-4"
                      >
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div
                          className="px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center"
                          style={{ backgroundColor: type.color === 'transparent' ? 'transparent' : type.color, color: type.text_color, border: type.color === 'transparent' ? '1px dashed #ccc' : 'none' }}
                        >
                          {type.display_label || type.name}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {type.name}
                            {type.monthly_limit && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">月{type.monthly_limit}回まで</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex gap-2 mt-1 flex-wrap">
                            <span className={type.position_am ? "text-blue-600" : "text-gray-400"}>AM</span>
                            <span className={type.position_pm ? "text-blue-600" : "text-gray-400"}>PM</span>
                            <span className={type.position_night ? "text-blue-600" : "text-gray-400"}>夜勤</span>
                            {type.is_kensanbi_target && <span className="text-green-600 ml-2">研鑽日対象</span>}
                            <span className="ml-2 text-gray-400">|</span>
                            <span className={type.prev_day_night_shift ? "text-green-600" : "text-red-400"}>前日当直{type.prev_day_night_shift ? '○' : '×'}</span>
                            <span className={type.same_day_night_shift ? "text-green-600" : "text-red-400"}>当日当直{type.same_day_night_shift ? '○' : '×'}</span>
                            <span className={type.next_day_night_shift ? "text-green-600" : "text-red-400"}>翌日当直{type.next_day_night_shift ? '○' : '×'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingShift(type)} className="text-gray-600 hover:text-blue-600 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteShift(type.id)} className="text-gray-600 hover:text-red-600 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 勤務場所タブ */}
            {activeTab === 'workLocation' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    勤務場所の設定を管理します。ドラッグして並び替えができます。予定表で予定がない時間帯の背景色として使用されます。
                  </p>
                </div>
                {workLocations.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    勤務場所がありません。「勤務場所追加」から追加してください。
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {workLocations.map((loc) => (
                      <li
                        key={loc.id}
                        draggable
                        onDragStart={(e) => handleWorkLocationDragStart(e, loc)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleWorkLocationDrop(e, loc)}
                        className="p-4 hover:bg-gray-50 cursor-move flex items-center gap-4"
                      >
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div
                          className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: loc.color, color: loc.text_color }}
                        >
                          {loc.display_label || loc.name.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {loc.name}
                            {loc.is_default_weekday && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">平日デフォルト</span>
                            )}
                            {loc.is_default_holiday && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">休日デフォルト</span>
                            )}
                          </div>
                          {loc.display_label && (
                            <div className="text-sm text-gray-500">表示: {loc.display_label}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingWorkLocation(loc)} className="text-gray-600 hover:text-blue-600 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteWorkLocation(loc.id)} className="text-gray-600 hover:text-red-600 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 表示設定タブ（年休・研鑽日のみ。研究日・出向・休職はscheduleタブに移行） */}
            {activeTab === 'system' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    年休・研鑽日の表示ラベルと色を設定できます。研究日・出向・休職は「予定タイプ」タブで設定してください。
                  </p>
                </div>
                <ul className="divide-y divide-gray-200">
                  {(Object.keys(SYSTEM_SETTING_LABELS) as SystemSettingKey[]).map((key) => {
                    const setting = displaySettings[key];
                    const label = key === 'vacation' ? (setting?.label_full || '年休') :
                                  key === 'vacation_applied' ? (displaySettings.vacation?.label_full || '年休') :
                                  setting?.label || SYSTEM_SETTING_LABELS[key];
                    return (
                      <li key={key} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                        <div
                          className="px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center"
                          style={{
                            backgroundColor: setting?.bg_color === 'transparent' ? 'transparent' : (setting?.bg_color || '#ccc'),
                            color: setting?.color || '#000',
                            border: setting?.bg_color === 'transparent' ? '1px dashed #ccc' : 'none'
                          }}
                        >
                          {label}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{SYSTEM_SETTING_LABELS[key]}</div>
                        </div>
                        <button onClick={() => handleOpenSystemSettingModal(key)} className="text-gray-600 hover:text-blue-600 p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      {/* 予定タイプ追加モーダル */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">予定タイプ追加</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">予定名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="例: 外勤、出張、学会"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input
                  type="text"
                  value={newSchedule.display_label}
                  onChange={(e) => setNewSchedule({ ...newSchedule, display_label: e.target.value })}
                  placeholder="空欄の場合は予定名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ColorPicker label="背景色" color={newSchedule.color} onChange={(c) => setNewSchedule({ ...newSchedule, color: c })} />
              <ColorPicker label="文字色" color={newSchedule.text_color} onChange={(c) => setNewSchedule({ ...newSchedule, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div
                  className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: newSchedule.color === 'transparent' ? 'transparent' : newSchedule.color, color: newSchedule.text_color, border: newSchedule.color === 'transparent' ? '1px dashed #ccc' : 'none' }}
                >
                  {newSchedule.display_label || newSchedule.name || "予定名"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newSchedule.position_am} onChange={(e) => setNewSchedule({ ...newSchedule, position_am: e.target.checked })} className="w-4 h-4" />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newSchedule.position_pm} onChange={(e) => setNewSchedule({ ...newSchedule, position_pm: e.target.checked })} className="w-4 h-4" />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newSchedule.position_night} onChange={(e) => setNewSchedule({ ...newSchedule, position_night: e.target.checked })} className="w-4 h-4" />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当直可否ルール</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button type="button" onClick={() => setNewSchedule({ ...newSchedule, prev_day_night_shift: !newSchedule.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newSchedule.prev_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newSchedule.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button type="button" onClick={() => setNewSchedule({ ...newSchedule, same_day_night_shift: !newSchedule.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newSchedule.same_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newSchedule.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button type="button" onClick={() => setNewSchedule({ ...newSchedule, next_day_night_shift: !newSchedule.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newSchedule.next_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newSchedule.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">月あたりの回数制限</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newSchedule.monthly_limit !== null} onChange={(e) => setNewSchedule({ ...newSchedule, monthly_limit: e.target.checked ? 3 : null })} className="w-4 h-4" />
                    <span className="text-sm">制限あり</span>
                  </label>
                  {newSchedule.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">月</span>
                      <input type="number" min="1" max="31" value={newSchedule.monthly_limit} onChange={(e) => setNewSchedule({ ...newSchedule, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center" />
                      <span className="text-sm">回まで</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newSchedule.is_kensanbi_target} onChange={(e) => setNewSchedule({ ...newSchedule, is_kensanbi_target: e.target.checked })} className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">この予定で研鑽日が付与される場合にチェック</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">デフォルト勤務場所</label>
                <select
                  value={newSchedule.default_work_location_id ?? ""}
                  onChange={(e) => setNewSchedule({ ...newSchedule, default_work_location_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {workLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">この予定を追加したとき、自動的に設定される勤務場所</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleAddSchedule} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 予定タイプ編集モーダル */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                予定タイプ編集
                {editingSchedule.is_system && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">システム予約</span>
                )}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">予定名 <span className="text-red-500">*</span></label>
                <input type="text" value={editingSchedule.name} onChange={(e) => setEditingSchedule({ ...editingSchedule, name: e.target.value })}
                  disabled={editingSchedule.is_system}
                  className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingSchedule.is_system ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                {editingSchedule.is_system && (
                  <p className="text-xs text-gray-500 mt-1">システム予約タイプの名前は変更できません</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input type="text" value={editingSchedule.display_label || ""} onChange={(e) => setEditingSchedule({ ...editingSchedule, display_label: e.target.value })}
                  placeholder="空欄の場合は予定名を使用" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <ColorPicker label="背景色" color={editingSchedule.color} onChange={(c) => setEditingSchedule({ ...editingSchedule, color: c })} />
              <ColorPicker label="文字色" color={editingSchedule.text_color} onChange={(c) => setEditingSchedule({ ...editingSchedule, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: editingSchedule.color === 'transparent' ? 'transparent' : editingSchedule.color, color: editingSchedule.text_color, border: editingSchedule.color === 'transparent' ? '1px dashed #ccc' : 'none' }}>
                  {editingSchedule.display_label || editingSchedule.name || "予定名"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingSchedule.position_am} onChange={(e) => setEditingSchedule({ ...editingSchedule, position_am: e.target.checked })} className="w-4 h-4" />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingSchedule.position_pm} onChange={(e) => setEditingSchedule({ ...editingSchedule, position_pm: e.target.checked })} className="w-4 h-4" />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingSchedule.position_night} onChange={(e) => setEditingSchedule({ ...editingSchedule, position_night: e.target.checked })} className="w-4 h-4" />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当直可否ルール</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button type="button" onClick={() => setEditingSchedule({ ...editingSchedule, prev_day_night_shift: !editingSchedule.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingSchedule.prev_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingSchedule.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button type="button" onClick={() => setEditingSchedule({ ...editingSchedule, same_day_night_shift: !editingSchedule.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingSchedule.same_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingSchedule.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button type="button" onClick={() => setEditingSchedule({ ...editingSchedule, next_day_night_shift: !editingSchedule.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingSchedule.next_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingSchedule.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">月あたりの回数制限</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingSchedule.monthly_limit !== null} onChange={(e) => setEditingSchedule({ ...editingSchedule, monthly_limit: e.target.checked ? 3 : null })} className="w-4 h-4" />
                    <span className="text-sm">制限あり</span>
                  </label>
                  {editingSchedule.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">月</span>
                      <input type="number" min="1" max="31" value={editingSchedule.monthly_limit} onChange={(e) => setEditingSchedule({ ...editingSchedule, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center" />
                      <span className="text-sm">回まで</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingSchedule.is_kensanbi_target} onChange={(e) => setEditingSchedule({ ...editingSchedule, is_kensanbi_target: e.target.checked })} className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">この予定で研鑽日が付与される場合にチェック</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">デフォルト勤務場所</label>
                <select
                  value={editingSchedule.default_work_location_id ?? ""}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, default_work_location_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {workLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">この予定を追加したとき、自動的に設定される勤務場所</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditingSchedule(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleUpdateSchedule} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* シフト追加モーダル */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">シフト追加</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">シフト名 <span className="text-red-500">*</span></label>
                <input type="text" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="例: 当直、日直、オンコール" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input type="text" value={newShift.display_label} onChange={(e) => setNewShift({ ...newShift, display_label: e.target.value })}
                  placeholder="空欄の場合はシフト名を使用" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <ColorPicker label="背景色" color={newShift.color} onChange={(c) => setNewShift({ ...newShift, color: c })} />
              <ColorPicker label="文字色" color={newShift.text_color} onChange={(c) => setNewShift({ ...newShift, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: newShift.color === 'transparent' ? 'transparent' : newShift.color, color: newShift.text_color, border: newShift.color === 'transparent' ? '1px dashed #ccc' : 'none' }}>
                  {newShift.display_label || newShift.name || "シフト名"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newShift.position_am} onChange={(e) => setNewShift({ ...newShift, position_am: e.target.checked })} className="w-4 h-4" />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newShift.position_pm} onChange={(e) => setNewShift({ ...newShift, position_pm: e.target.checked })} className="w-4 h-4" />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newShift.position_night} onChange={(e) => setNewShift({ ...newShift, position_night: e.target.checked })} className="w-4 h-4" />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">当直可否設定</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button type="button" onClick={() => setNewShift({ ...newShift, prev_day_night_shift: !newShift.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newShift.prev_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newShift.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button type="button" onClick={() => setNewShift({ ...newShift, same_day_night_shift: !newShift.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newShift.same_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newShift.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button type="button" onClick={() => setNewShift({ ...newShift, next_day_night_shift: !newShift.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${newShift.next_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {newShift.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">月あたりの回数制限</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newShift.monthly_limit !== null} onChange={(e) => setNewShift({ ...newShift, monthly_limit: e.target.checked ? 3 : null })} className="w-4 h-4" />
                    <span className="text-sm">制限あり</span>
                  </label>
                  {newShift.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">月</span>
                      <input type="number" min="1" max="31" value={newShift.monthly_limit} onChange={(e) => setNewShift({ ...newShift, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center" />
                      <span className="text-sm">回まで</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newShift.is_kensanbi_target} onChange={(e) => setNewShift({ ...newShift, is_kensanbi_target: e.target.checked })} className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">このシフトで研鑽日が付与される場合にチェック</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">デフォルト勤務場所</label>
                <select
                  value={newShift.default_work_location_id ?? ""}
                  onChange={(e) => setNewShift({ ...newShift, default_work_location_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {workLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">このシフトを追加したとき、自動的に設定される勤務場所</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleAddShift} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* シフト編集モーダル */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">シフト編集</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">シフト名 <span className="text-red-500">*</span></label>
                <input type="text" value={editingShift.name} onChange={(e) => setEditingShift({ ...editingShift, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input type="text" value={editingShift.display_label || ""} onChange={(e) => setEditingShift({ ...editingShift, display_label: e.target.value })}
                  placeholder="空欄の場合はシフト名を使用" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <ColorPicker label="背景色" color={editingShift.color} onChange={(c) => setEditingShift({ ...editingShift, color: c })} />
              <ColorPicker label="文字色" color={editingShift.text_color} onChange={(c) => setEditingShift({ ...editingShift, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: editingShift.color === 'transparent' ? 'transparent' : editingShift.color, color: editingShift.text_color, border: editingShift.color === 'transparent' ? '1px dashed #ccc' : 'none' }}>
                  {editingShift.display_label || editingShift.name || "シフト名"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">配置</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingShift.position_am} onChange={(e) => setEditingShift({ ...editingShift, position_am: e.target.checked })} className="w-4 h-4" />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingShift.position_pm} onChange={(e) => setEditingShift({ ...editingShift, position_pm: e.target.checked })} className="w-4 h-4" />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingShift.position_night} onChange={(e) => setEditingShift({ ...editingShift, position_night: e.target.checked })} className="w-4 h-4" />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">当直可否設定</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button type="button" onClick={() => setEditingShift({ ...editingShift, prev_day_night_shift: !editingShift.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingShift.prev_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingShift.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button type="button" onClick={() => setEditingShift({ ...editingShift, same_day_night_shift: !editingShift.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingShift.same_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingShift.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button type="button" onClick={() => setEditingShift({ ...editingShift, next_day_night_shift: !editingShift.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg ${editingShift.next_day_night_shift ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {editingShift.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">月あたりの回数制限</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingShift.monthly_limit !== null} onChange={(e) => setEditingShift({ ...editingShift, monthly_limit: e.target.checked ? 3 : null })} className="w-4 h-4" />
                    <span className="text-sm">制限あり</span>
                  </label>
                  {editingShift.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">月</span>
                      <input type="number" min="1" max="31" value={editingShift.monthly_limit} onChange={(e) => setEditingShift({ ...editingShift, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center" />
                      <span className="text-sm">回まで</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingShift.is_kensanbi_target} onChange={(e) => setEditingShift({ ...editingShift, is_kensanbi_target: e.target.checked })} className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">このシフトで研鑽日が付与される場合にチェック</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">デフォルト勤務場所</label>
                <select
                  value={editingShift.default_work_location_id ?? ""}
                  onChange={(e) => setEditingShift({ ...editingShift, default_work_location_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {workLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">このシフトを追加したとき、自動的に設定される勤務場所</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditingShift(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleUpdateShift} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* システム表示設定編集モーダル */}
      {editingSystemSetting && tempSystemSetting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{SYSTEM_SETTING_LABELS[editingSystemSetting]}の設定</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* ラベル設定（項目によって異なる） */}
              {editingSystemSetting === 'vacation' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ラベル（終日）</label>
                    <input type="text" value={tempSystemSetting.label_full || ""} onChange={(e) => setTempSystemSetting({ ...tempSystemSetting, label_full: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ラベル（AM）</label>
                    <input type="text" value={tempSystemSetting.label_am || ""} onChange={(e) => setTempSystemSetting({ ...tempSystemSetting, label_am: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ラベル（PM）</label>
                    <input type="text" value={tempSystemSetting.label_pm || ""} onChange={(e) => setTempSystemSetting({ ...tempSystemSetting, label_pm: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              {editingSystemSetting === 'vacation_applied' && (
                <p className="text-sm text-gray-500">ラベルは「年休（未申請）」と同じものが使用されます。</p>
              )}
              {editingSystemSetting === 'kensanbi_used' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ラベル</label>
                  <input type="text" value={tempSystemSetting.label || ""} onChange={(e) => setTempSystemSetting({ ...tempSystemSetting, label: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <ColorPicker label="背景色" color={tempSystemSetting.bg_color || "#FFFFFF"} onChange={(c) => setTempSystemSetting({ ...tempSystemSetting, bg_color: c })} />
              <ColorPicker label="文字色" color={tempSystemSetting.color || "#000000"} onChange={(c) => setTempSystemSetting({ ...tempSystemSetting, color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{
                    backgroundColor: tempSystemSetting.bg_color === 'transparent' ? 'transparent' : (tempSystemSetting.bg_color || '#ccc'),
                    color: tempSystemSetting.color || '#000',
                    border: tempSystemSetting.bg_color === 'transparent' ? '1px dashed #ccc' : 'none'
                  }}>
                  {editingSystemSetting === 'vacation' ? (tempSystemSetting.label_full || '年休') :
                   editingSystemSetting === 'vacation_applied' ? (displaySettings.vacation?.label_full || '年休') :
                   tempSystemSetting.label || SYSTEM_SETTING_LABELS[editingSystemSetting]}
                </div>
              </div>
              {editingSystemSetting !== 'vacation_applied' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">デフォルト勤務場所</label>
                  <select
                    value={tempSystemSetting.default_work_location_id ?? ""}
                    onChange={(e) => setTempSystemSetting({ ...tempSystemSetting, default_work_location_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">なし</option>
                    {workLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">この項目が適用されたとき、自動的に設定される勤務場所</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setEditingSystemSetting(null); setTempSystemSetting(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleSaveSystemSetting} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 勤務場所追加モーダル */}
      {showWorkLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">勤務場所追加</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">勤務場所名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newWorkLocation.name}
                  onChange={(e) => setNewWorkLocation({ ...newWorkLocation, name: e.target.value })}
                  placeholder="例: 手術室、ICU、院内、院外"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input
                  type="text"
                  value={newWorkLocation.display_label}
                  onChange={(e) => setNewWorkLocation({ ...newWorkLocation, display_label: e.target.value })}
                  placeholder="空欄の場合は勤務場所名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ColorPicker label="背景色" color={newWorkLocation.color} onChange={(c) => setNewWorkLocation({ ...newWorkLocation, color: c })} allowTransparent={false} />
              <ColorPicker label="文字色" color={newWorkLocation.text_color} onChange={(c) => setNewWorkLocation({ ...newWorkLocation, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div
                  className="inline-block w-12 h-12 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: newWorkLocation.color, color: newWorkLocation.text_color }}
                >
                  {newWorkLocation.display_label || newWorkLocation.name.slice(0, 2) || "場所"}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">デフォルト設定</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newWorkLocation.is_default_weekday}
                    onChange={(e) => setNewWorkLocation({ ...newWorkLocation, is_default_weekday: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">平日のデフォルト</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newWorkLocation.is_default_holiday}
                    onChange={(e) => setNewWorkLocation({ ...newWorkLocation, is_default_holiday: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">休日のデフォルト（日曜・祝日）</span>
                </label>
                <p className="text-xs text-gray-500">※デフォルトは各1つまで。設定すると既存のデフォルトは解除されます。</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowWorkLocationModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleAddWorkLocation} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 勤務場所編集モーダル */}
      {editingWorkLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">勤務場所編集</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">勤務場所名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingWorkLocation.name}
                  onChange={(e) => setEditingWorkLocation({ ...editingWorkLocation, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示ラベル</label>
                <input
                  type="text"
                  value={editingWorkLocation.display_label || ""}
                  onChange={(e) => setEditingWorkLocation({ ...editingWorkLocation, display_label: e.target.value })}
                  placeholder="空欄の場合は勤務場所名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ColorPicker label="背景色" color={editingWorkLocation.color} onChange={(c) => setEditingWorkLocation({ ...editingWorkLocation, color: c })} allowTransparent={false} />
              <ColorPicker label="文字色" color={editingWorkLocation.text_color} onChange={(c) => setEditingWorkLocation({ ...editingWorkLocation, text_color: c })} allowTransparent={false} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div
                  className="inline-block w-12 h-12 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: editingWorkLocation.color, color: editingWorkLocation.text_color }}
                >
                  {editingWorkLocation.display_label || editingWorkLocation.name.slice(0, 2) || "場所"}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">デフォルト設定</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingWorkLocation.is_default_weekday}
                    onChange={(e) => setEditingWorkLocation({ ...editingWorkLocation, is_default_weekday: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">平日のデフォルト</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingWorkLocation.is_default_holiday}
                    onChange={(e) => setEditingWorkLocation({ ...editingWorkLocation, is_default_holiday: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">休日のデフォルト（日曜・祝日）</span>
                </label>
                <p className="text-xs text-gray-500">※デフォルトは各1つまで。設定すると既存のデフォルトは解除されます。</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditingWorkLocation(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleUpdateWorkLocation} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
