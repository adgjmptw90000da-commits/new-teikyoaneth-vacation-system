// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { DisplaySettings } from "@/lib/database.types";

// デフォルトの表示設定（12月予定表の色に合わせる）
const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  research_day: {
    label: "研究日",
    label_first_year: "外勤",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFFF99",  // 薄い黄色（背景色）
  },
  vacation: {
    label_full: "年休",
    label_am: "AM",
    label_pm: "PM",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFCCCC",  // 薄いピンク（背景色）
  },
  vacation_applied: {
    color: "#000000",  // 黒（文字色）
    bg_color: "#99CCFF",  // 薄い青（背景色）
  },
  kensanbi_used: {
    label: "研鑽日",
    color: "#000000",  // 黒（文字色）
    bg_color: "#99FF99",  // 薄い緑（背景色）
  },
  secondment: {
    label: "出向",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFCC99",  // 薄いオレンジ（背景色）
  },
  leave_of_absence: {
    label: "休職",
    color: "#000000",  // 黒（文字色）
    bg_color: "#C0C0C0",  // 薄いグレー（背景色）
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
}

// 背景色（パステルカラー）
const BG_COLORS = [
  { name: "なし", value: "transparent" },
  { name: "白", value: "#FFFFFF" },
  { name: "黄", value: "#FFFF99" },
  { name: "オレンジ", value: "#FFCC99" },
  { name: "ピンク", value: "#FFCCCC" },
  { name: "赤", value: "#FF9999" },
  { name: "水色", value: "#CCFFFF" },
  { name: "青", value: "#99CCFF" },
  { name: "緑", value: "#CCFFCC" },
  { name: "紫", value: "#CC99FF" },
  { name: "グレー", value: "#C0C0C0" },
];

// 文字色（原色系）
const TEXT_COLORS = [
  { name: "黒", value: "#000000" },
  { name: "白", value: "#FFFFFF" },
  { name: "赤", value: "#FF0000" },
  { name: "青", value: "#0000FF" },
  { name: "緑", value: "#008000" },
  { name: "オレンジ", value: "#FF8C00" },
  { name: "紫", value: "#800080" },
  { name: "ピンク", value: "#FF1493" },
  { name: "茶", value: "#8B4513" },
  { name: "紺", value: "#000080" },
];

// システム予定の表示設定用（パステルカラー + 黒）
const COLORS = [
  { name: "白", value: "#FFFFFF" },
  { name: "黄", value: "#FFFF99" },
  { name: "オレンジ", value: "#FFCC99" },
  { name: "ピンク", value: "#FFCCCC" },
  { name: "赤", value: "#FF9999" },
  { name: "水色", value: "#CCFFFF" },
  { name: "青", value: "#99CCFF" },
  { name: "緑", value: "#CCFFCC" },
  { name: "紫", value: "#CC99FF" },
  { name: "グレー", value: "#C0C0C0" },
  { name: "黒", value: "#000000" },
];

export default function ScheduleSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<ScheduleType | null>(null);
  const [newType, setNewType] = useState<NewScheduleType>({
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
  });
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ScheduleType | null>(null);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [savingDisplaySettings, setSavingDisplaySettings] = useState(false);

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
    fetchScheduleTypes();
    fetchDisplaySettings();
  }, [router]);

  const fetchDisplaySettings = async () => {
    const { data, error } = await supabase
      .from("setting")
      .select("display_settings")
      .single();

    if (!error && data?.display_settings) {
      setDisplaySettings({
        ...DEFAULT_DISPLAY_SETTINGS,
        ...data.display_settings,
      });
    }
  };

  const handleSaveDisplaySettings = async () => {
    setSavingDisplaySettings(true);
    const { error } = await supabase
      .from("setting")
      .update({ display_settings: displaySettings })
      .eq("id", 1);

    if (error) {
      alert("表示設定の保存に失敗しました: " + error.message);
    } else {
      alert("表示設定を保存しました");
    }
    setSavingDisplaySettings(false);
  };

  const fetchScheduleTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_type")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setScheduleTypes(data);
    }
    setLoading(false);
  };

  const handleAddType = async () => {
    if (!newType.name.trim()) {
      alert("予定名を入力してください");
      return;
    }

    setSaving(true);
    const maxOrder = scheduleTypes.length > 0
      ? Math.max(...scheduleTypes.map(t => t.display_order))
      : 0;

    const { error } = await supabase.from("schedule_type").insert({
      name: newType.name,
      display_label: newType.display_label || null,
      position_am: newType.position_am,
      position_pm: newType.position_pm,
      position_night: newType.position_night,
      prev_day_night_shift: newType.prev_day_night_shift,
      same_day_night_shift: newType.same_day_night_shift,
      next_day_night_shift: newType.next_day_night_shift,
      display_order: maxOrder + 1,
      color: newType.color,
      text_color: newType.text_color,
      monthly_limit: newType.monthly_limit,
    });

    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowAddModal(false);
      setNewType({
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
      });
      fetchScheduleTypes();
    }
    setSaving(false);
  };

  const handleUpdateType = async () => {
    if (!editingType) return;
    if (!editingType.name.trim()) {
      alert("予定名を入力してください");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("schedule_type")
      .update({
        name: editingType.name,
        display_label: editingType.display_label || null,
        position_am: editingType.position_am,
        position_pm: editingType.position_pm,
        position_night: editingType.position_night,
        prev_day_night_shift: editingType.prev_day_night_shift,
        same_day_night_shift: editingType.same_day_night_shift,
        next_day_night_shift: editingType.next_day_night_shift,
        color: editingType.color,
        text_color: editingType.text_color,
        monthly_limit: editingType.monthly_limit,
      })
      .eq("id", editingType.id);

    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingType(null);
      fetchScheduleTypes();
    }
    setSaving(false);
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm("この予定タイプを削除しますか？\n既存の予定データも削除されます。")) {
      return;
    }

    const { error } = await supabase.from("schedule_type").delete().eq("id", id);
    if (error) {
      alert("削除に失敗しました: " + error.message);
    } else {
      fetchScheduleTypes();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: ScheduleType) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetItem: ScheduleType) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newTypes = [...scheduleTypes];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedItem.id);
    const targetIndex = newTypes.findIndex(t => t.id === targetItem.id);

    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedItem);

    // Update display_order
    const updates = newTypes.map((t, index) => ({
      id: t.id,
      display_order: index + 1,
    }));

    setScheduleTypes(newTypes.map((t, index) => ({ ...t, display_order: index + 1 })));

    // Save to database
    for (const update of updates) {
      await supabase
        .from("schedule_type")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    setDraggedItem(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">予定提出設定</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            予定タイプ追加
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
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
                    onDragStart={(e) => handleDragStart(e, type)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, type)}
                    className="p-4 hover:bg-gray-50 cursor-move flex items-center gap-4"
                  >
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    <div
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: type.color, color: type.text_color }}
                    >
                      {type.display_label || type.name}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {type.name}
                        {type.monthly_limit && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                            月{type.monthly_limit}回まで
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex gap-2 mt-1">
                        <span className={type.position_am ? "text-blue-600" : "text-gray-400"}>
                          AM
                        </span>
                        <span className={type.position_pm ? "text-blue-600" : "text-gray-400"}>
                          PM
                        </span>
                        <span className={type.position_night ? "text-blue-600" : "text-gray-400"}>
                          夜勤
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingType(type)}
                        className="text-gray-600 hover:text-blue-600 p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className="text-gray-600 hover:text-red-600 p-2"
                      >
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

        {/* システム予定の表示設定 */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">システム予定の表示設定</h2>
            <p className="text-sm text-gray-600 mt-1">
              予定表で表示するラベルと色を設定できます。
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* 研究日/外勤 */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.research_day?.bg_color || displaySettings.research_day?.color }} />
                研究日/外勤
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（通常）</label>
                  <input
                    type="text"
                    value={displaySettings.research_day?.label || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      research_day: { ...displaySettings.research_day!, label: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（1年目）</label>
                  <input
                    type="text"
                    value={displaySettings.research_day?.label_first_year || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      research_day: { ...displaySettings.research_day!, label_first_year: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.research_day?.bg_color || "#FFFF99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        research_day: { ...displaySettings.research_day!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.research_day?.bg_color || "#FFFF99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        research_day: { ...displaySettings.research_day!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.research_day?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        research_day: { ...displaySettings.research_day!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.research_day?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        research_day: { ...displaySettings.research_day!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-xs text-gray-500">プレビュー: </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: displaySettings.research_day?.bg_color, color: displaySettings.research_day?.color }}
                  >
                    {displaySettings.research_day?.label || "研究日"}
                  </span>
                </div>
              </div>
            </div>

            {/* 年休（未申請） */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.vacation?.bg_color || displaySettings.vacation?.color }} />
                年休（未申請）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（終日）</label>
                  <input
                    type="text"
                    value={displaySettings.vacation?.label_full || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      vacation: { ...displaySettings.vacation!, label_full: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（AM）</label>
                  <input
                    type="text"
                    value={displaySettings.vacation?.label_am || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      vacation: { ...displaySettings.vacation!, label_am: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル（PM）</label>
                  <input
                    type="text"
                    value={displaySettings.vacation?.label_pm || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      vacation: { ...displaySettings.vacation!, label_pm: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.vacation?.bg_color || "#FFCCCC"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation: { ...displaySettings.vacation!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.vacation?.bg_color || "#FFCCCC"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation: { ...displaySettings.vacation!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.vacation?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation: { ...displaySettings.vacation!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.vacation?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation: { ...displaySettings.vacation!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <div>
                    <span className="text-xs text-gray-500">プレビュー: </span>
                    <span
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: displaySettings.vacation?.bg_color, color: displaySettings.vacation?.color }}
                    >
                      {displaySettings.vacation?.label_full || "年休"}1
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 年休（One人事申請済み） */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.vacation_applied?.bg_color || "#99CCFF" }} />
                年休（One人事申請済み）
              </h3>
              <p className="text-xs text-gray-500 pl-5">One人事への申請が完了した年休の表示色です。ラベルは年休（未申請）と同じものが使用されます。</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.vacation_applied?.bg_color || "#99CCFF"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation_applied: { ...displaySettings.vacation_applied!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.vacation_applied?.bg_color || "#99CCFF"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation_applied: { ...displaySettings.vacation_applied!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.vacation_applied?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation_applied: { ...displaySettings.vacation_applied!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.vacation_applied?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        vacation_applied: { ...displaySettings.vacation_applied!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-xs text-gray-500">プレビュー: </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: displaySettings.vacation_applied?.bg_color || "#99CCFF", color: displaySettings.vacation_applied?.color || "#000000" }}
                  >
                    {displaySettings.vacation?.label_full || "年休"}1
                  </span>
                </div>
              </div>
            </div>

            {/* 研鑽日 */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.kensanbi_used?.bg_color || "#99FF99" }} />
                研鑽日
              </h3>
              <p className="text-xs text-gray-500 pl-5">研鑽日に変換された年休の表示です。</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
                  <input
                    type="text"
                    value={displaySettings.kensanbi_used?.label || "研鑽日"}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      kensanbi_used: { ...displaySettings.kensanbi_used!, label: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.kensanbi_used?.bg_color || "#99FF99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        kensanbi_used: { ...displaySettings.kensanbi_used!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.kensanbi_used?.bg_color || "#99FF99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        kensanbi_used: { ...displaySettings.kensanbi_used!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.kensanbi_used?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        kensanbi_used: { ...displaySettings.kensanbi_used!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.kensanbi_used?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        kensanbi_used: { ...displaySettings.kensanbi_used!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-gray-500">プレビュー: </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: displaySettings.kensanbi_used?.bg_color || "#99FF99", color: displaySettings.kensanbi_used?.color || "#000000" }}
                  >
                    {displaySettings.kensanbi_used?.label || "研鑽日"}
                  </span>
                </div>
              </div>
            </div>

            {/* 出向 */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.secondment?.bg_color || "#FFCC99" }} />
                出向
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
                  <input
                    type="text"
                    value={displaySettings.secondment?.label || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      secondment: { ...displaySettings.secondment!, label: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.secondment?.bg_color || "#FFCC99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        secondment: { ...displaySettings.secondment!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.secondment?.bg_color || "#FFCC99"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        secondment: { ...displaySettings.secondment!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.secondment?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        secondment: { ...displaySettings.secondment!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.secondment?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        secondment: { ...displaySettings.secondment!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-gray-500">プレビュー: </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: displaySettings.secondment?.bg_color || "#FFCC99", color: displaySettings.secondment?.color || "#000000" }}
                  >
                    {displaySettings.secondment?.label || "出向"}
                  </span>
                </div>
              </div>
            </div>

            {/* 休職 */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || "#C0C0C0" }} />
                休職
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
                  <input
                    type="text"
                    value={displaySettings.leave_of_absence?.label || ""}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      leave_of_absence: { ...displaySettings.leave_of_absence!, label: e.target.value }
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">背景色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.leave_of_absence?.bg_color || "#C0C0C0"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        leave_of_absence: { ...displaySettings.leave_of_absence!, bg_color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.leave_of_absence?.bg_color || "#C0C0C0"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        leave_of_absence: { ...displaySettings.leave_of_absence!, bg_color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文字色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={displaySettings.leave_of_absence?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        leave_of_absence: { ...displaySettings.leave_of_absence!, color: e.target.value }
                      })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={displaySettings.leave_of_absence?.color || "#000000"}
                      onChange={(e) => setDisplaySettings({
                        ...displaySettings,
                        leave_of_absence: { ...displaySettings.leave_of_absence!, color: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-gray-500">プレビュー: </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || "#C0C0C0", color: displaySettings.leave_of_absence?.color || "#000000" }}
                  >
                    {displaySettings.leave_of_absence?.label || "休職"}
                  </span>
                </div>
              </div>
            </div>

            {/* 保存ボタン */}
            <div className="pt-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveDisplaySettings}
                disabled={savingDisplaySettings}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {savingDisplaySettings ? "保存中..." : "表示設定を保存"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">予定タイプ追加</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予定名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="例: 外勤、出張、学会"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示ラベル（予定表上で表示）
                </label>
                <input
                  type="text"
                  value={newType.display_label}
                  onChange={(e) => setNewType({ ...newType, display_label: e.target.value })}
                  placeholder="空欄の場合は予定名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">予定表のセル内に表示される短いラベル（例: 外勤→外、学会→学）</p>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewType({ ...newType, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 relative overflow-hidden ${
                        newType.color === color.value
                          ? "border-gray-900"
                          : color.value === "#FFFFFF" || color.value === "transparent" ? "border-gray-300" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value === "transparent" ? "#f3f4f6" : color.value }}
                      title={color.name}
                    >
                      {color.value === "transparent" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-400 rotate-45 absolute"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文字色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewType({ ...newType, text_color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newType.text_color === color.value
                          ? "border-gray-900"
                          : color.value === "#FFFFFF" ? "border-gray-300" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プレビュー
                </label>
                <div
                  className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: newType.color, color: newType.text_color }}
                >
                  {newType.display_label || newType.name || "予定名"}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配置（複数選択可）
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newType.position_am}
                      onChange={(e) => setNewType({ ...newType, position_am: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newType.position_pm}
                      onChange={(e) => setNewType({ ...newType, position_pm: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newType.position_night}
                      onChange={(e) => setNewType({ ...newType, position_night: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>

              {/* Night Shift Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当直可否ルール
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* 前日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button
                      type="button"
                      onClick={() => setNewType({ ...newType, prev_day_night_shift: !newType.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        newType.prev_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {newType.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  {/* 当日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button
                      type="button"
                      onClick={() => setNewType({ ...newType, same_day_night_shift: !newType.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        newType.same_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {newType.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  {/* 翌日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button
                      type="button"
                      onClick={() => setNewType({ ...newType, next_day_night_shift: !newType.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        newType.next_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {newType.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月あたりの回数制限（任意）
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newType.monthly_limit !== null}
                      onChange={(e) => setNewType({ ...newType, monthly_limit: e.target.checked ? 3 : null })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">制限あり</span>
                  </label>
                  {newType.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">月</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newType.monthly_limit}
                        onChange={(e) => setNewType({ ...newType, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">回まで</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddType}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">予定タイプ編集</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予定名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingType.name}
                  onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示ラベル（予定表上で表示）
                </label>
                <input
                  type="text"
                  value={editingType.display_label || ""}
                  onChange={(e) => setEditingType({ ...editingType, display_label: e.target.value })}
                  placeholder="空欄の場合は予定名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">予定表のセル内に表示される短いラベル（例: 外勤→外、学会→学）</p>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditingType({ ...editingType, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 relative overflow-hidden ${
                        editingType.color === color.value
                          ? "border-gray-900"
                          : color.value === "#FFFFFF" || color.value === "transparent" ? "border-gray-300" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value === "transparent" ? "#f3f4f6" : color.value }}
                      title={color.name}
                    >
                      {color.value === "transparent" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-400 rotate-45 absolute"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文字色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditingType({ ...editingType, text_color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingType.text_color === color.value
                          ? "border-gray-900"
                          : color.value === "#FFFFFF" ? "border-gray-300" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プレビュー
                </label>
                <div
                  className="inline-block px-3 py-1 rounded text-sm font-bold"
                  style={{ backgroundColor: editingType.color, color: editingType.text_color }}
                >
                  {editingType.display_label || editingType.name || "予定名"}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配置（複数選択可）
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingType.position_am}
                      onChange={(e) => setEditingType({ ...editingType, position_am: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>AM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingType.position_pm}
                      onChange={(e) => setEditingType({ ...editingType, position_pm: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>PM</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingType.position_night}
                      onChange={(e) => setEditingType({ ...editingType, position_night: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>夜勤帯</span>
                  </label>
                </div>
              </div>

              {/* Night Shift Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当直可否ルール
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* 前日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">前日当直</span>
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, prev_day_night_shift: !editingType.prev_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        editingType.prev_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {editingType.prev_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  {/* 当日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">当日当直</span>
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, same_day_night_shift: !editingType.same_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        editingType.same_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {editingType.same_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                  {/* 翌日当直 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">翌日当直</span>
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, next_day_night_shift: !editingType.next_day_night_shift })}
                      className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        editingType.next_day_night_shift
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {editingType.next_day_night_shift ? '○' : '×'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月あたりの回数制限（任意）
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingType.monthly_limit !== null}
                      onChange={(e) => setEditingType({ ...editingType, monthly_limit: e.target.checked ? 3 : null })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">制限あり</span>
                  </label>
                  {editingType.monthly_limit !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">月</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editingType.monthly_limit}
                        onChange={(e) => setEditingType({ ...editingType, monthly_limit: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">回まで</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingType(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateType}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
