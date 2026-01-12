// @ts-nocheck
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

interface UserData {
  staff_id: string;
  name: string;
  display_order: number | null;
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
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function SharedCalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ビュー切り替え
  const [viewMode, setViewMode] = useState<'personal' | 'overview'>('personal');

  // 年月（デフォルトは4ヶ月後）
  const [currentYear, setCurrentYear] = useState(() => {
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 4, 1);
    return futureDate.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 4, 1);
    return futureDate.getMonth() + 1;
  });

  // データ
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [systemEvents, setSystemEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);

  // モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // 一括登録モーダル
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEvent, setBulkEvent] = useState({
    category_id: 0,
    start_date: "",
    end_date: "",
    weekdays: [] as number[],
  });

  // フォーム
  const [newEvent, setNewEvent] = useState({
    category_id: 0,
  });

  // 管理者用: 対象ユーザー選択
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
    // 初回のみselectedStaffIdを設定
    if (!selectedStaffId) {
      setSelectedStaffId(currentUser.staff_id);
    }
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
        { data: usersData },
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
        supabase.from("user").select("staff_id, name, display_order").order("display_order"),
      ]);

      setCategories(categoriesData || []);
      setEvents(eventsData || []);
      setHolidays(holidaysData || []);
      setConferences(conferencesData || []);
      setSystemEvents(systemEventsData || []);
      setAllUsers(usersData || []);

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

  // 現在操作対象のstaff_idを取得（管理者は選択ユーザー、一般は自分）
  const targetStaffId = useMemo(() => {
    if (user?.is_admin && selectedStaffId) {
      return selectedStaffId;
    }
    return user?.staff_id || "";
  }, [user, selectedStaffId]);

  // 対象ユーザーの名前を取得
  const targetUserName = useMemo(() => {
    const targetUser = allUsers.find(u => u.staff_id === targetStaffId);
    return targetUser?.name || user?.name || "";
  }, [allUsers, targetStaffId, user]);

  // 一括登録対象日の計算
  const bulkTargetDates = useMemo(() => {
    if (!bulkEvent.start_date || !bulkEvent.end_date || bulkEvent.weekdays.length === 0) {
      return [];
    }
    const dates: string[] = [];
    const start = new Date(bulkEvent.start_date);
    const end = new Date(bulkEvent.end_date);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (bulkEvent.weekdays.includes(d.getDay())) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  }, [bulkEvent]);

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
      category_id: categories.length > 0 ? categories[0].id : 0,
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
        category_id: event.category_id,
      });
      setShowAddModal(true);
    }
  };

  const handleAdd = async () => {
    if (!newEvent.category_id) {
      alert("予定を選択してください");
      return;
    }
    if (!selectedDate || !user || !targetStaffId) return;

    // 既存予定の重複チェック（対象ユーザー）
    const { data: existingEvent } = await supabase
      .from("shared_calendar_event")
      .select("id")
      .eq("staff_id", targetStaffId)
      .eq("event_date", selectedDate)
      .single();

    if (existingEvent) {
      alert("この日には既に予定が登録されています");
      return;
    }

    const selectedCategory = categories.find(c => c.id === newEvent.category_id);

    setSaving(true);
    const { error } = await supabase.from("shared_calendar_event").insert({
      staff_id: targetStaffId,
      category_id: newEvent.category_id,
      event_date: selectedDate,
      title: selectedCategory?.name || "",
      description: null,
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
    if (!newEvent.category_id || !editingEvent) {
      alert("予定を選択してください");
      return;
    }

    const selectedCategory = categories.find(c => c.id === newEvent.category_id);

    setSaving(true);
    const { error } = await supabase
      .from("shared_calendar_event")
      .update({
        category_id: newEvent.category_id,
        title: selectedCategory?.name || "",
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

  // 一括登録モーダルを開く
  const openBulkModal = () => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonthStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

    setBulkEvent({
      category_id: 0,
      start_date: startOfMonth,
      end_date: endOfMonthStr,
      weekdays: [],
    });
    setShowBulkModal(true);
  };

  // 一括登録処理
  const handleBulkAdd = async () => {
    if (!bulkEvent.category_id) {
      alert("予定を選択してください");
      return;
    }
    if (bulkTargetDates.length === 0) {
      alert("対象日がありません。期間と曜日を選択してください");
      return;
    }
    if (!user || !targetStaffId) return;

    setSaving(true);

    // DBから既存予定を直接取得（対象ユーザー、期間全体をカバー）
    const { data: existingEvents } = await supabase
      .from("shared_calendar_event")
      .select("event_date")
      .eq("staff_id", targetStaffId)
      .gte("event_date", bulkEvent.start_date)
      .lte("event_date", bulkEvent.end_date);

    const existingDates = (existingEvents || []).map(e => e.event_date);

    const selectedCategory = categories.find(c => c.id === bulkEvent.category_id);
    const insertData = bulkTargetDates
      .filter(date => !existingDates.includes(date))
      .map(date => ({
        staff_id: targetStaffId,
        category_id: bulkEvent.category_id,
        event_date: date,
        title: selectedCategory?.name || "",
        description: null,
      }));

    const skippedCount = bulkTargetDates.length - insertData.length;

    if (insertData.length === 0) {
      alert("すべての日付に既に予定が登録されています");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("shared_calendar_event").insert(insertData);

    if (error) {
      alert("登録に失敗しました: " + error.message);
    } else {
      const message = skippedCount > 0
        ? `${insertData.length}件登録しました（${skippedCount}件は既存予定のためスキップ）`
        : `${insertData.length}件登録しました`;
      alert(message);
      setShowBulkModal(false);
      fetchData();
    }
    setSaving(false);
  };

  // 曜日の選択/解除
  const toggleWeekday = (weekday: number) => {
    setBulkEvent(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(weekday)
        ? prev.weekdays.filter(w => w !== weekday)
        : [...prev.weekdays, weekday],
    }));
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

  // 全体予定確認用: ユーザーごとの予定を取得
  const getUserEventForDate = (staffId: string, date: string) => {
    return events.find(e => e.staff_id === staffId && e.event_date === date);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* ビュー切り替えタブ */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('personal')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'personal'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icons.Calendar />
              個人予定登録
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icons.Users />
              全体予定確認
            </button>
          </div>
        </div>

        {/* 管理者用: 対象メンバー選択 */}
        {user?.is_admin && viewMode === 'personal' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                対象メンバー
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {allUsers.map((u) => (
                  <option key={u.staff_id} value={u.staff_id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedStaffId !== user.staff_id && (
              <p className="mt-2 text-sm text-orange-600">
                {targetUserName}さんの予定を管理しています
              </p>
            )}
          </div>
        )}

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

          {/* 直近5ヶ月タブ + 一括登録ボタン */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
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
            {viewMode === 'personal' && (
              <button
                onClick={openBulkModal}
                className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Icons.Plus />
                一括登録
              </button>
            )}
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

        {/* メインコンテンツ */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            読み込み中...
          </div>
        ) : viewMode === 'personal' ? (
          /* 個人予定登録ビュー（カレンダーグリッド） */
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

                  {/* ユーザー登録イベント（対象ユーザーの予定のみ表示） */}
                  <div className="space-y-1">
                    {day.events
                      .filter(e => e.staff_id === targetStaffId)
                      .slice(0, 3)
                      .map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: event.category?.color || "#6B7280",
                            color: event.category?.text_color || "#FFFFFF",
                          }}
                          title={`${event.category?.display_label || event.category?.name || event.title}`}
                        >
                          {event.category?.display_label || event.category?.name || event.title}
                        </div>
                      ))}
                    {day.events.filter(e => e.staff_id === targetStaffId).length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{day.events.filter(e => e.staff_id === targetStaffId).length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 全体予定確認ビュー（テーブルレイアウト） */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse w-auto min-w-full">
                <thead className="sticky top-0 z-10">
                  {/* 日付ヘッダー */}
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-20 bg-gray-100 border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900 min-w-[80px]">
                      メンバー
                    </th>
                    {daysData.map((day) => (
                      <th
                        key={day.date}
                        className={`border border-gray-300 px-1 py-2 text-xs font-bold min-w-[40px] ${
                          day.isHoliday || day.dayOfWeek === 0
                            ? "bg-red-100 text-red-700"
                            : day.dayOfWeek === 6
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div>{day.day}</div>
                        <div className="text-[10px]">{WEEKDAYS[day.dayOfWeek]}</div>
                      </th>
                    ))}
                  </tr>
                  {/* 祝日・学会・イベント行 */}
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-20 bg-gray-50 border border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-600 min-w-[80px]">
                      予定
                    </th>
                    {daysData.map((day) => (
                      <td
                        key={`event-${day.date}`}
                        className="border border-gray-300 px-0.5 py-0.5 text-[9px] text-center align-top"
                      >
                        <div className="space-y-0.5">
                          {day.holidayName && (
                            <div className="bg-red-100 text-red-700 rounded px-0.5 truncate" title={day.holidayName}>
                              {day.holidayName.slice(0, 3)}
                            </div>
                          )}
                          {day.conferenceName && (
                            <div className="bg-purple-100 text-purple-700 rounded px-0.5 truncate" title={day.conferenceName}>
                              {day.conferenceName.slice(0, 3)}
                            </div>
                          )}
                          {day.eventName && (
                            <div className="bg-amber-100 text-amber-700 rounded px-0.5 truncate" title={day.eventName}>
                              {day.eventName.slice(0, 3)}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((member) => (
                    <tr key={member.staff_id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">
                        {member.name}
                      </td>
                      {daysData.map((day) => {
                        const event = getUserEventForDate(member.staff_id, day.date);
                        return (
                          <td
                            key={`${member.staff_id}-${day.date}`}
                            className={`border border-gray-300 px-1 py-1 text-center text-[10px] ${
                              day.isHoliday || day.dayOfWeek === 0
                                ? "bg-red-50"
                                : day.dayOfWeek === 6
                                ? "bg-blue-50"
                                : ""
                            }`}
                            style={event ? {
                              backgroundColor: event.category?.color || "#6B7280",
                              color: event.category?.text_color || "#FFFFFF",
                            } : {}}
                          >
                            {event && (
                              <span className="font-medium" title={event.category?.name || event.title}>
                                {(event.category?.display_label || event.category?.name || "").slice(0, 2)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
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

              {/* 予定選択（ラジオボタン） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予定 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newEvent.category_id === cat.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.id}
                        checked={newEvent.category_id === cat.id}
                        onChange={() => setNewEvent({ ...newEvent, category_id: cat.id })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </label>
                  ))}
                </div>
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
                  disabled={saving || !newEvent.category_id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中..." : editingEvent ? "更新" : "登録"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 一括登録モーダル */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">一括予定登録</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 予定選択（ドロップダウン） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予定 <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulkEvent.category_id}
                  onChange={(e) => setBulkEvent({ ...bulkEvent, category_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value={0}>選択してください</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 期間選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期間 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={bulkEvent.start_date}
                    onChange={(e) => setBulkEvent({ ...bulkEvent, start_date: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="date"
                    value={bulkEvent.end_date}
                    onChange={(e) => setBulkEvent({ ...bulkEvent, end_date: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* 曜日選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  曜日 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleWeekday(i)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        bulkEvent.weekdays.includes(i)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                      } ${i === 0 ? "text-red-600" : ""} ${i === 6 ? "text-blue-600" : ""}`}
                      style={bulkEvent.weekdays.includes(i) ? {} : { color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : undefined }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* 対象日数表示 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">対象日数：</span>
                <span className="font-bold text-lg text-blue-600">{bulkTargetDates.length}</span>
                <span className="text-sm text-gray-600">日</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={saving || !bulkEvent.category_id || bulkTargetDates.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? "登録中..." : `${bulkTargetDates.length}件登録`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
