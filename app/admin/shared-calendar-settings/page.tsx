// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Category {
  id: number;
  name: string;
  display_label: string | null;
  color: string;
  text_color: string;
  display_order: number;
  is_active: boolean;
}

interface NewCategory {
  name: string;
  display_label: string;
  color: string;
  text_color: string;
}

// カラーピッカーコンポーネント
const ColorPicker = ({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300"
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

// アイコン
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
  ),
  GripVertical: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
};

export default function SharedCalendarSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: "",
    display_label: "",
    color: "#3B82F6",
    text_color: "#FFFFFF",
  });

  // ドラッグ
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);

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
    const { data, error } = await supabase
      .from("shared_calendar_category")
      .select("*")
      .order("display_order");

    if (data) setCategories(data);
    setLoading(false);
  };

  const resetForm = () => {
    setNewCategory({
      name: "",
      display_label: "",
      color: "#3B82F6",
      text_color: "#FFFFFF",
    });
  };

  const handleAdd = async () => {
    if (!newCategory.name.trim()) {
      alert("カテゴリ名を入力してください");
      return;
    }
    setSaving(true);
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : 0;
    const { error } = await supabase.from("shared_calendar_category").insert({
      name: newCategory.name,
      display_label: newCategory.display_label || null,
      color: newCategory.color,
      text_color: newCategory.text_color,
      display_order: maxOrder + 1,
    });
    if (error) {
      alert("追加に失敗しました: " + error.message);
    } else {
      setShowModal(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      alert("カテゴリ名を入力してください");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("shared_calendar_category")
      .update({
        name: editingCategory.name,
        display_label: editingCategory.display_label || null,
        color: editingCategory.color,
        text_color: editingCategory.text_color,
      })
      .eq("id", editingCategory.id);
    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setEditingCategory(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このカテゴリを削除しますか？\n\n※ このカテゴリに紐づく予定がある場合は削除できません。")) return;

    const { error } = await supabase
      .from("shared_calendar_category")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.message.includes("violates foreign key constraint")) {
        alert("このカテゴリには予定が登録されているため削除できません。");
      } else {
        alert("削除に失敗しました: " + error.message);
      }
    } else {
      fetchData();
    }
  };

  const handleToggleActive = async (category: Category) => {
    const { error } = await supabase
      .from("shared_calendar_category")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      fetchData();
    }
  };

  // ドラッグ&ドロップ
  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

    const newCategories = [...categories];
    const draggedIndex = newCategories.findIndex(c => c.id === draggedCategory.id);
    const targetIndex = newCategories.findIndex(c => c.id === targetCategory.id);

    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedCategory);

    // display_orderを更新
    const updates = newCategories.map((c, index) => ({
      id: c.id,
      display_order: index + 1,
    }));

    setCategories(newCategories.map((c, index) => ({ ...c, display_order: index + 1 })));

    for (const update of updates) {
      await supabase
        .from("shared_calendar_category")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    setDraggedCategory(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/home")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.ChevronLeft />
            </button>
            <div className="flex items-center gap-2">
              <Icons.Calendar />
              <h1 className="text-lg font-bold text-gray-900">予定共有カレンダー設定</h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/home")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.Home />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            予定共有カレンダーのカテゴリを管理します。カテゴリをドラッグして並び替えができます。
          </p>
        </div>

        {/* 追加ボタン */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Plus />
            カテゴリ追加
          </button>
        </div>

        {/* カテゴリ一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">読み込み中...</div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              カテゴリがありません。「カテゴリ追加」ボタンから追加してください。
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {categories.map((category) => (
                <li
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category)}
                  className={`p-4 hover:bg-gray-50 cursor-move flex items-center gap-4 ${
                    draggedCategory?.id === category.id ? "opacity-50" : ""
                  } ${!category.is_active ? "opacity-60" : ""}`}
                >
                  {/* ドラッグハンドル */}
                  <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                    <Icons.GripVertical />
                  </div>

                  {/* カラーチップ */}
                  <div
                    className="w-16 h-8 rounded flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: category.color, color: category.text_color }}
                  >
                    {category.display_label || category.name}
                  </div>

                  {/* カテゴリ名 */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{category.name}</div>
                    {category.display_label && (
                      <div className="text-sm text-gray-500">表示: {category.display_label}</div>
                    )}
                  </div>

                  {/* 有効/無効トグル */}
                  <button
                    onClick={() => handleToggleActive(category)}
                    className={`px-3 py-1 rounded text-sm ${
                      category.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {category.is_active ? "有効" : "無効"}
                  </button>

                  {/* 編集ボタン */}
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    編集
                  </button>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Icons.Trash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* 追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">カテゴリ追加</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* カテゴリ名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 会議"
                />
              </div>

              {/* 表示ラベル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示ラベル（短縮名）
                </label>
                <input
                  type="text"
                  value={newCategory.display_label}
                  onChange={(e) => setNewCategory({ ...newCategory, display_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 会"
                />
              </div>

              {/* 色設定 */}
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker
                  label="背景色"
                  color={newCategory.color}
                  onChange={(color) => setNewCategory({ ...newCategory, color })}
                />
                <ColorPicker
                  label="文字色"
                  color={newCategory.text_color}
                  onChange={(color) => setNewCategory({ ...newCategory, text_color: color })}
                />
              </div>

              {/* プレビュー */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div
                  className="inline-block px-4 py-2 rounded text-sm font-medium"
                  style={{ backgroundColor: newCategory.color, color: newCategory.text_color }}
                >
                  {newCategory.display_label || newCategory.name || "カテゴリ名"}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">カテゴリ編集</h2>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* カテゴリ名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 表示ラベル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示ラベル（短縮名）
                </label>
                <input
                  type="text"
                  value={editingCategory.display_label || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, display_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 色設定 */}
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker
                  label="背景色"
                  color={editingCategory.color}
                  onChange={(color) => setEditingCategory({ ...editingCategory, color })}
                />
                <ColorPicker
                  label="文字色"
                  color={editingCategory.text_color}
                  onChange={(color) => setEditingCategory({ ...editingCategory, text_color: color })}
                />
              </div>

              {/* プレビュー */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
                <div
                  className="inline-block px-4 py-2 rounded text-sm font-medium"
                  style={{ backgroundColor: editingCategory.color, color: editingCategory.text_color }}
                >
                  {editingCategory.display_label || editingCategory.name}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "更新中..." : "更新"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
