"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
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

interface CalendarEvent {
  id: number;
  staff_id: string;
  category_id: number;
  event_date: string;
  title: string;
  description: string | null;
  created_at: string;
  user?: { name: string };
  category?: Category;
}

interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
}

interface Conference {
  id: number;
  conference_date: string;
  name: string;
}

interface Event {
  id: number;
  event_date: string;
  name: string;
}

interface DayData {
  date: string;
  day: number;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
  isConference: boolean;
  conferenceName?: string;
  isEvent: boolean;
  eventName?: string;
  events: CalendarEvent[];
}

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function SharedCalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 年月
  const [currentYear, setCurrentYear] = useState(() => {
    const now = new Date();
    return now.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });

  // データ
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [systemEvents, setSystemEvents] = useState<Event[]>([]);

  // モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // フォーム
  const [newEvent, setNewEvent] = useState({
    title: "",
    category_id: 0,
    description: "",
  });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
    fetchData();
  }, [router, currentYear, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const [
        { data: categoriesData },
        { data: eventsData },
        { data: holidaysData },
        { data: conferencesData },
        { data: systemEventsData },
      ] = await Promise.all([
        supabase.from("shared_calendar_category").select("*").eq("is_active", true).order("display_order"),
        supabase.from("shared_calendar_event")
          .select("*, user:staff_id(name), category:category_id(*)")
          .gte("event_date", startDate)
          .lte("event_date", endDate)
          .order("event_date"),
        supabase.from("holiday").select("*"),
        supabase.from("conference").select("*"),
        supabase.from("event").select("*"),
      ]);

      setCategories(categoriesData || []);
      setEvents(eventsData || []);
      setHolidays(holidaysData || []);
      setConferences(conferencesData || []);
      setSystemEvents(systemEventsData || []);

      // 初期カテゴリを設定
      if (categoriesData && categoriesData.length > 0 && newEvent.category_id === 0) {
        setNewEvent(prev => ({ ...prev, category_id: categoriesData[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  // 日付データを計算
  const daysData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getDay();
      const holiday = holidays.find(h => h.holiday_date === date);
      const conference = conferences.find(c => c.conference_date === date);
      const systemEvent = systemEvents.find(e => e.event_date === date);
      const dayEvents = events.filter(e => e.event_date === date);

      days.push({
        date,
        day,
        dayOfWeek,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        isConference: !!conference,
        conferenceName: conference?.name,
        isEvent: !!systemEvent,
        eventName: systemEvent?.name,
        events: dayEvents,
      });
    }
    return days;
  }, [currentYear, currentMonth, holidays, conferences, systemEvents, events]);

  // 直近5ヶ月のタブ
  const monthTabs = useMemo(() => {
    const tabs = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      tabs.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return tabs;
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEvent({
      title: "",
      category_id: categories.length > 0 ? categories[0].id : 0,
      description: "",
    });
    setShowAddModal(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    // 自分の予定または管理者のみ編集可能
    if (user && (event.staff_id === user.staff_id || user.is_admin)) {
      setEditingEvent(event);
      setSelectedDate(event.event_date);
      setNewEvent({
        title: event.title,
        category_id: event.category_id,
        description: event.description || "",
      });
      setShowAddModal(true);
    }
  };

  const handleAdd = async () => {
    if (!newEvent.title.trim()) {
      alert("タイトルを入力してください");
      return;
    }
    if (!selectedDate || !user) return;

    setSaving(true);
    const { error } = await supabase.from("shared_calendar_event").insert({
      staff_id: user.staff_id,
      category_id: newEvent.category_id,
      event_date: selectedDate,
      title: newEvent.title,
      description: newEvent.description || null,
    });

    if (error) {
      alert("登録に失敗しました: " + error.message);
    } else {
      setShowAddModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!newEvent.title.trim() || !editingEvent) {
      alert("タイトルを入力してください");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("shared_calendar_event")
      .update({
        category_id: newEvent.category_id,
        title: newEvent.title,
        description: newEvent.description || null,
      })
      .eq("id", editingEvent.id);

    if (error) {
      alert("更新に失敗しました: " + error.message);
    } else {
      setShowAddModal(false);
      setEditingEvent(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!confirm("この予定を削除しますか？")) return;

    setSaving(true);
    const { error } = await supabase
      .from("shared_calendar_event")
      .delete()
      .eq("id", editingEvent.id);

    if (error) {
      alert("削除に失敗しました: " + error.message);
    } else {
      setShowAddModal(false);
      setEditingEvent(null);
      fetchData();
    }
    setSaving(false);
  };

  const getDateBackgroundColor = (day: DayData) => {
    if (day.isHoliday || day.dayOfWeek === 0) return "bg-red-50";
    if (day.dayOfWeek === 6) return "bg-blue-50";
    return "bg-white";
  };

  const getDateTextColor = (day: DayData) => {
    if (day.isHoliday || day.dayOfWeek === 0) return "text-red-600";
    if (day.dayOfWeek === 6) return "text-blue-600";
    return "text-gray-900";
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(user.is_admin ? "/admin/home" : "/home")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.ChevronLeft />
            </button>
            <div className="flex items-center gap-2">
              <Icons.Calendar />
              <h1 className="text-lg font-bold text-gray-900">予定共有カレンダー</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.is_admin && (
              <button
                onClick={() => router.push("/admin/shared-calendar-settings")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="カテゴリ設定"
              >
                <Icons.Settings />
              </button>
            )}
            <button
              onClick={() => router.push(user.is_admin ? "/admin/home" : "/home")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.Home />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* 月選択 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.ChevronLeft />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {currentYear}年{currentMonth}月
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.ChevronRight />
            </button>
          </div>

          {/* 直近5ヶ月タブ */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {monthTabs.map((tab) => (
              <button
                key={`${tab.year}-${tab.month}`}
                onClick={() => {
                  setCurrentYear(tab.year);
                  setCurrentMonth(tab.month);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentYear === tab.year && currentMonth === tab.month
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.month}月
              </button>
            ))}
          </div>
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">凡例</h3>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700">
              祝日
            </div>
            <div className="px-3 py-1 rounded text-sm font-medium bg-purple-100 text-purple-700">
              主要学会
            </div>
            <div className="px-3 py-1 rounded text-sm font-medium bg-amber-100 text-amber-700">
              イベント
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ backgroundColor: cat.color, color: cat.text_color }}
              >
                {cat.display_label || cat.name}
              </div>
            ))}
          </div>
        </div>

        {/* カレンダー */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            読み込み中...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`py-2 text-center text-sm font-medium ${
                    i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
              {/* 月初の空白セル */}
              {Array.from({ length: daysData[0]?.dayOfWeek || 0 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50" />
              ))}

              {/* 日付セル */}
              {daysData.map((day) => (
                <div
                  key={day.date}
                  onClick={() => handleDateClick(day.date)}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${getDateBackgroundColor(day)}`}
                >
                  <div className={`text-sm font-medium mb-1 ${getDateTextColor(day)}`}>
                    {day.day}
                  </div>

                  {/* 祝日・学会・イベント */}
                  <div className="space-y-0.5 mb-1">
                    {day.holidayName && (
                      <div className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 truncate" title={day.holidayName}>
                        {day.holidayName}
                      </div>
                    )}
                    {day.conferenceName && (
                      <div className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 truncate" title={day.conferenceName}>
                        {day.conferenceName}
                      </div>
                    )}
                    {day.eventName && (
                      <div className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 truncate" title={day.eventName}>
                        {day.eventName}
                      </div>
                    )}
                  </div>

                  {/* ユーザー登録イベント */}
                  <div className="space-y-1">
                    {day.events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: event.category?.color || "#6B7280",
                          color: event.category?.text_color || "#FFFFFF",
                        }}
                        title={`${event.title} (${event.user?.name || "不明"})`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {day.events.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{day.events.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 追加/編集モーダル */}
      {showAddModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">
                {editingEvent ? "予定の編集" : "予定の登録"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 日付表示 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">日付：</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: チームミーティング"
                />
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select
                  value={newEvent.category_id}
                  onChange={(e) => setNewEvent({ ...newEvent, category_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明（任意）
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="詳細を入力..."
                />
              </div>

              {/* 登録者表示（編集時） */}
              {editingEvent && (
                <div className="text-sm text-gray-500">
                  登録者: {editingEvent.user?.name || "不明"}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 p-4 border-t border-gray-200">
              <div>
                {editingEvent && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icons.Trash />
                    削除
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={editingEvent ? handleUpdate : handleAdd}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中..." : editingEvent ? "更新" : "登録"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
