// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ShiftType {
  id: number;
  name: string;
  display_label: string | null;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  display_order: number;
  color: string;
  text_color: string;
  is_kensanbi_target: boolean;
}

interface NewShiftType {
  name: string;
  display_label: string;
  position_am: boolean;
  position_pm: boolean;
  position_night: boolean;
  color: string;
  text_color: string;
  is_kensanbi_target: boolean;
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

export default function ShiftSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<ShiftType | null>(null);
  const [newType, setNewType] = useState<NewShiftType>({
    name: "",
    display_label: "",
    position_am: false,
    position_pm: false,
    position_night: true,
    color: "#CCFFFF",
    text_color: "#000000",
    is_kensanbi_target: false,
  });
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ShiftType | null>(null);

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
    fetchShiftTypes();
  }, [router]);

  const fetchShiftTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_type")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setShiftTypes(data);
    }
    setLoading(false);
  };

  const handleAddType = async () => {
    if (!newType.name.trim()) {
      alert("シフト名を入力してください");
      return;
    }

    setSaving(true);
    const maxOrder = shiftTypes.length > 0
      ? Math.max(...shiftTypes.map(t => t.display_order))
      : 0;

    const { error } = await supabase.from("shift_type").insert({
      name: newType.name,
      display_label: newType.display_label || null,
      position_am: newType.position_am,
      position_pm: newType.position_pm,
      position_night: newType.position_night,
      display_order: maxOrder + 1,
      color: newType.color,
      text_color: newType.text_color,
      is_kensanbi_target: newType.is_kensanbi_target,
    });

    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowAddModal(false);
      setNewType({
        name: "",
        display_label: "",
        position_am: false,
        position_pm: false,
        position_night: true,
        color: "#CCFFFF",
        text_color: "#000000",
        is_kensanbi_target: false,
      });
      fetchShiftTypes();
    }
    setSaving(false);
  };

  const handleUpdateType = async () => {
    if (!editingType) return;
    if (!editingType.name.trim()) {
      alert("シフト名を入力してください");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("shift_type")
      .update({
        name: editingType.name,
        display_label: editingType.display_label || null,
        position_am: editingType.position_am,
        position_pm: editingType.position_pm,
        position_night: editingType.position_night,
        color: editingType.color,
        text_color: editingType.text_color,
        is_kensanbi_target: editingType.is_kensanbi_target,
      })
      .eq("id", editingType.id);

    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingType(null);
      fetchShiftTypes();
    }
    setSaving(false);
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm("このシフトタイプを削除しますか？")) {
      return;
    }

    const { error } = await supabase.from("shift_type").delete().eq("id", id);
    if (error) {
      alert("削除に失敗しました: " + error.message);
    } else {
      fetchShiftTypes();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: ShiftType) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetItem: ShiftType) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newTypes = [...shiftTypes];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedItem.id);
    const targetIndex = newTypes.findIndex(t => t.id === targetItem.id);

    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedItem);

    const updates = newTypes.map((t, index) => ({
      id: t.id,
      display_order: index + 1,
    }));

    setShiftTypes(newTypes.map((t, index) => ({ ...t, display_order: index + 1 })));

    for (const update of updates) {
      await supabase
        .from("shift_type")
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
            <h1 className="text-xl font-bold text-gray-900">シフト設定</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            シフト追加
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
                      <div className="font-medium text-gray-900">
                        {type.name}
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
                        {type.is_kensanbi_target && (
                          <span className="text-green-600 ml-2">研鑽日対象</span>
                        )}
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
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">シフト追加</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  シフト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="例: 当直、日直、オンコール"
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
                  placeholder="空欄の場合はシフト名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">予定表のセル内に表示される短いラベル（例: 当直→当、日直→日）</p>
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
                  {newType.display_label || newType.name || "シフト名"}
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

              {/* Kensanbi Target */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newType.is_kensanbi_target}
                    onChange={(e) => setNewType({ ...newType, is_kensanbi_target: e.target.checked })}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">このシフトで研鑽日が付与される場合にチェック</p>
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
              <h2 className="text-xl font-bold text-gray-900">シフト編集</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  シフト名 <span className="text-red-500">*</span>
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
                  placeholder="空欄の場合はシフト名を使用"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">予定表のセル内に表示される短いラベル（例: 当直→当、日直→日）</p>
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
                  {editingType.display_label || editingType.name || "シフト名"}
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

              {/* Kensanbi Target */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingType.is_kensanbi_target}
                    onChange={(e) => setEditingType({ ...editingType, is_kensanbi_target: e.target.checked })}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-gray-700">研鑽日付与対象</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">このシフトで研鑽日が付与される場合にチェック</p>
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
