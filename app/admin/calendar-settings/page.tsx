// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Database } from "@/lib/database.types";

type Holiday = Database["public"]["Tables"]["holiday"]["Row"];
type Conference = Database["public"]["Tables"]["conference"]["Row"];
type Event = Database["public"]["Tables"]["event"]["Row"];

type EntryType = "holiday" | "conference" | "event";

interface CalendarEntry {
  id: number;
  date: string;
  name: string;
  type: EntryType;
}

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const TYPE_LABELS: Record<EntryType, string> = {
  holiday: "祝日",
  conference: "主要学会",
  event: "イベント",
};

const TYPE_COLORS: Record<EntryType, { bg: string; text: string; border: string }> = {
  holiday: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  conference: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  event: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
};

export default function CalendarSettingsPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ダイアログ用
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [entryType, setEntryType] = useState<EntryType>("holiday");
  const [entryName, setEntryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/home");
      return;
    }

    fetchEntries();
  }, [router]);

  const fetchEntries = async () => {
    try {
      // 3つのテーブルから並列で取得
      const [holidaysRes, conferencesRes, eventsRes] = await Promise.all([
        supabase.from("holiday").select("*"),
        supabase.from("conference").select("*"),
        supabase.from("event").select("*"),
      ]);

      const allEntries: CalendarEntry[] = [];

      if (holidaysRes.data) {
        holidaysRes.data.forEach((h: Holiday) => {
          allEntries.push({
            id: h.id,
            date: h.holiday_date,
            name: h.name,
            type: "holiday",
          });
        });
      }

      if (conferencesRes.data) {
        conferencesRes.data.forEach((c: Conference) => {
          allEntries.push({
            id: c.id,
            date: c.conference_date,
            name: c.name,
            type: "conference",
          });
        });
      }

      if (eventsRes.data) {
        eventsRes.data.forEach((e: Event) => {
          allEntries.push({
            id: e.id,
            date: e.event_date,
            name: e.name,
            type: "event",
          });
        });
      }

      setEntries(allEntries);
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setLoading(false);
    }
  };

  // カレンダーのデータ生成
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // 先頭の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = formatDateStr(date);
    return entries.filter((e) => e.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateStr(date));
    setEntryType("holiday");
    setEntryName("");
    setError("");
    setDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryName.trim()) {
      setError("名前を入力してください");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let tableName: string;
      let dateColumn: string;

      switch (entryType) {
        case "holiday":
          tableName = "holiday";
          dateColumn = "holiday_date";
          break;
        case "conference":
          tableName = "conference";
          dateColumn = "conference_date";
          break;
        case "event":
          tableName = "event";
          dateColumn = "event_date";
          break;
      }

      const { error: insertError } = await supabase
        .from(tableName)
        .insert({
          [dateColumn]: selectedDate,
          name: entryName.trim(),
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setError(`この日付には既に${TYPE_LABELS[entryType]}が登録されています`);
        } else {
          setError("登録に失敗しました");
          console.error("Insert error:", insertError);
        }
        setSaving(false);
        return;
      }

      await fetchEntries();
      setDialogOpen(false);
      alert(`${TYPE_LABELS[entryType]}を登録しました`);
    } catch (err) {
      console.error("Error:", err);
      setError("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: CalendarEntry) => {
    const confirmed = await confirm({
      title: "削除の確認",
      message: `${TYPE_LABELS[entry.type]}「${entry.name}」（${entry.date}）を削除しますか？`,
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      let tableName: string;
      switch (entry.type) {
        case "holiday":
          tableName = "holiday";
          break;
        case "conference":
          tableName = "conference";
          break;
        case "event":
          tableName = "event";
          break;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", entry.id);

      if (error) {
        alert("削除に失敗しました");
        console.error("Delete error:", error);
        return;
      }

      await fetchEntries();
      alert(`${TYPE_LABELS[entry.type]}を削除しました`);
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    }
  };

  // 月タブを生成（現在の月から6ヶ月分を表示）
  const getMonthTabs = () => {
    const tabs = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      tabs.push({
        year: targetDate.getFullYear(),
        month: targetDate.getMonth(),
        label: `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`,
      });
    }
    return tabs;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ナビゲーション */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                カレンダー設定
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホーム
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 凡例 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-bold text-gray-700">凡例:</span>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${TYPE_COLORS.holiday.bg} ${TYPE_COLORS.holiday.border} border`}></span>
              <span className="text-sm text-gray-600">祝日（年休申請不可）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${TYPE_COLORS.conference.bg} ${TYPE_COLORS.conference.border} border`}></span>
              <span className="text-sm text-gray-600">主要学会（年休申請不可）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded ${TYPE_COLORS.event.bg} ${TYPE_COLORS.event.border} border`}></span>
              <span className="text-sm text-gray-600">イベント（警告のみ）</span>
            </div>
          </div>
        </div>

        {/* 月ナビゲーション */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.ChevronLeft />
              </button>
              <h2 className="text-xl font-bold text-gray-900">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.ChevronRight />
              </button>
            </div>
          </div>

          {/* 月タブ */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {getMonthTabs().map((tab) => (
                <button
                  key={`${tab.year}-${tab.month}`}
                  onClick={() => setCurrentDate(new Date(tab.year, tab.month, 1))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    currentDate.getMonth() === tab.month && currentDate.getFullYear() === tab.year
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* カレンダーグリッド */}
          <div className="p-4">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-bold py-2 ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-gray-600"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-[100px]" />;
                }

                const dateEntries = getEntriesForDate(date);
                const dayOfWeek = date.getDay();
                const isToday = formatDateStr(date) === formatDateStr(new Date());

                return (
                  <div
                    key={formatDateStr(date)}
                    className={`min-h-[100px] border border-gray-200 rounded-lg p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isToday ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => handleDateClick(date)}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dateEntries.map((entry) => (
                        <div
                          key={`${entry.type}-${entry.id}`}
                          className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[entry.type].bg} ${TYPE_COLORS[entry.type].text} flex items-center justify-between group`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate flex-1">{entry.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntry(entry);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* 登録ダイアログ */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedDate} に登録
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  種類
                </label>
                <div className="space-y-2">
                  {(["holiday", "conference", "event"] as EntryType[]).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        entryType === type
                          ? `${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].border}`
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="entryType"
                        value={type}
                        checked={entryType === type}
                        onChange={(e) => setEntryType(e.target.value as EntryType)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className={`font-medium ${entryType === type ? TYPE_COLORS[type].text : "text-gray-700"}`}>
                        {TYPE_LABELS[type]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {type === "event" ? "（警告のみ）" : "（年休申請不可）"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  名前 *
                </label>
                <input
                  type="text"
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  placeholder={`例: ${entryType === "holiday" ? "元日" : entryType === "conference" ? "日本内科学会" : "新年イベント"}`}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={saving}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving ? "登録中..." : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}
