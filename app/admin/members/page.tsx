// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getDefaultDisplayFiscalYear } from "@/lib/application";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Database } from "@/lib/database.types";

type User = Database["public"]["Tables"]["user"]["Row"];

type UserWithPoints = User & {
  remainingPoints: number | null;
  usedPoints: number | null;
  annualLeavePoints: number | null; // この年度での年休得点（個別設定値、nullならデフォルト）
};

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  ArrowUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  ArrowDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  ArrowUpDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
};

export default function MembersPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [users, setUsers] = useState<UserWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ staff_id: string } | null>(null);
  const [editingAnnualLeavePoints, setEditingAnnualLeavePoints] = useState<{ [key: string]: string }>({});
  const [sortColumn, setSortColumn] = useState<'staff_id' | 'name' | 'created_at' | 'annualLeavePoints' | 'remainingPoints' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | null>(null);
  const [defaultFiscalYear, setDefaultFiscalYear] = useState<number | null>(null);
  const [maxAnnualLeavePoints, setMaxAnnualLeavePoints] = useState<number | null>(null);
  // 職員ID変更用
  const [showStaffIdChangeModal, setShowStaffIdChangeModal] = useState(false);
  const [staffIdChangeTarget, setStaffIdChangeTarget] = useState<User | null>(null);
  const [newStaffId, setNewStaffId] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/admin/home");
      return;
    }

    setCurrentUser(user);

    // デフォルト年度を取得してから fetchUsers を呼ぶ
    const initialize = async () => {
      const fiscalYear = await getDefaultDisplayFiscalYear();
      setDefaultFiscalYear(fiscalYear);
      setSelectedFiscalYear(fiscalYear);
      await fetchUsersForYear(fiscalYear);
    };
    initialize();
  }, [router]);

  // 年度切替時の処理
  const handleFiscalYearChange = async (year: number) => {
    setSelectedFiscalYear(year);
    await fetchUsersForYear(year);
  };

  const fetchUsersForYear = async (fiscalYear: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .order("staff_id", { ascending: true });

      if (error) {
        console.error("Error fetching users:", error);
        alert("ユーザー一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      // 設定を取得（得点計算用の項目も含む）
      const { data: settingData } = await supabase
        .from("setting")
        .select("max_annual_leave_points, level1_points, level2_points, level3_points")
        .eq("id", 1)
        .single();

      if (!settingData) {
        setMaxAnnualLeavePoints(null);
        setUsers((data || []).map(user => ({ ...user, remainingPoints: null, usedPoints: null, annualLeavePoints: null })));
        setLoading(false);
        return;
      }

      setMaxAnnualLeavePoints(settingData.max_annual_leave_points);

      // 年度別の個別得点設定を取得
      const { data: yearlyPoints } = await supabase
        .from('user_annual_leave_points')
        .select('*')
        .eq('fiscal_year', fiscalYear);

      // 年度の開始日と終了日を計算（4月1日〜翌年3月31日）
      const fiscalYearStart = `${fiscalYear}-04-01`;
      const fiscalYearEnd = `${fiscalYear + 1}-03-31`;

      // 全ユーザーの申請を一括取得（パフォーマンス改善）
      const { data: allApplications } = await supabase
        .from('application')
        .select('staff_id, level, period, status')
        .gte('vacation_date', fiscalYearStart)
        .lte('vacation_date', fiscalYearEnd)
        .in('status', ['before_lottery', 'after_lottery', 'confirmed', 'pending_approval', 'pending_cancellation', 'cancelled_after_lottery']);

      // 各ユーザーの残り得点を計算（DBクエリなし、JavaScriptで処理）
      const usersWithPoints: UserWithPoints[] = (data || []).map((user) => {
        // このユーザーの申請をフィルタリング
        const userApps = allApplications?.filter(a => a.staff_id === user.staff_id) || [];

        // 得点を計算
        let usedPoints = 0;
        userApps.forEach(app => {
          const count = app.period === 'full_day' ? 1 : 0.5;
          const pointsPerApp = app.level === 1 ? settingData.level1_points
            : app.level === 2 ? settingData.level2_points
            : settingData.level3_points;
          usedPoints += count * pointsPerApp;
        });

        // 年度別の個別設定があればそれを使用、なければデフォルト値
        const yearlyPoint = yearlyPoints?.find(r => r.staff_id === user.staff_id);
        const annualLeavePoints = yearlyPoint?.annual_leave_points ?? null;
        const maxPoints = annualLeavePoints ?? settingData.max_annual_leave_points;
        const remainingPoints = maxPoints - usedPoints;

        return {
          ...user,
          remainingPoints,
          usedPoints,
          annualLeavePoints
        };
      });

      setUsers(usersWithPoints);
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getAdminCount = (): number => {
    return users.filter(u => u.is_admin).length;
  };

  const handleToggleAdmin = async (user: User) => {
    // 自分自身は変更不可
    if (currentUser && user.staff_id === currentUser.staff_id) {
      alert("自分自身の権限は変更できません");
      return;
    }

    // 最後の管理者は変更不可
    if (user.is_admin && getAdminCount() === 1) {
      alert("最後の管理者の権限は変更できません");
      return;
    }

    const newAdminStatus = !user.is_admin;
    const action = newAdminStatus ? "管理者権限を付与" : "管理者権限を解除";

    const confirmed = await confirm({
      title: "権限変更の確認",
      message: `${user.name}さんの${action}しますか？`,
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user")
        .update({ is_admin: newAdminStatus })
        .eq("staff_id", user.staff_id);

      if (error) {
        alert("権限の変更に失敗しました");
        console.error("Error:", error);
      } else {
        alert(`${action}しました`);
        await fetchUsersForYear(selectedFiscalYear);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    // 自分自身は削除不可
    if (currentUser && user.staff_id === currentUser.staff_id) {
      alert("自分自身は削除できません");
      return;
    }

    // 最後の管理者は削除不可
    if (user.is_admin && getAdminCount() === 1) {
      alert("最後の管理者は削除できません");
      return;
    }

    const confirmed = await confirm({
      title: "削除の確認",
      message: `${user.name}さん（職員ID: ${user.staff_id}）を削除しますか？\n\nこの操作は取り消せません。過去の申請データは残りますが、ユーザー情報は完全に削除されます。`,
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user")
        .delete()
        .eq("staff_id", user.staff_id);

      if (error) {
        alert("ユーザーの削除に失敗しました");
        console.error("Error:", error);
      } else {
        alert("ユーザーを削除しました");
        await fetchUsersForYear(selectedFiscalYear);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  // 職員ID変更モーダルを開く
  const openStaffIdChangeModal = (user: User) => {
    setStaffIdChangeTarget(user);
    setNewStaffId(user.staff_id);
    setShowStaffIdChangeModal(true);
  };

  // 職員ID変更処理
  const handleChangeStaffId = async () => {
    if (!staffIdChangeTarget) return;

    const oldStaffId = staffIdChangeTarget.staff_id;
    const newId = newStaffId.trim();

    // バリデーション
    if (!newId) {
      alert("新しい職員IDを入力してください");
      return;
    }

    if (!/^[0-9]+$/.test(newId)) {
      alert("職員IDは数字のみで入力してください");
      return;
    }

    if (oldStaffId === newId) {
      alert("職員IDが変更されていません");
      return;
    }

    // 既存IDとの重複チェック
    const existingUser = users.find(u => u.staff_id === newId);
    if (existingUser) {
      alert(`職員ID「${newId}」は既に使用されています（${existingUser.name}）`);
      return;
    }

    const confirmed = await confirm({
      title: "職員ID変更の確認",
      message: `${staffIdChangeTarget.name}さんの職員IDを変更しますか？\n\n現在のID: ${oldStaffId}\n新しいID: ${newId}\n\n関連する全てのデータ（シフト、年休申請など）も自動的に更新されます。`,
    });
    if (!confirmed) return;

    setProcessing(true);

    try {
      // 全ての関連テーブル
      const tablesToUpdate = [
        { table: 'application', column: 'staff_id' },
        { table: 'user_schedule', column: 'staff_id' },
        { table: 'user_research_day', column: 'staff_id' },
        { table: 'user_shift', column: 'staff_id' },
        { table: 'user_work_location', column: 'staff_id' },
        { table: 'user_monthly_attributes', column: 'staff_id' },
        { table: 'user_work_settings', column: 'staff_id' },
        { table: 'schedule_submission', column: 'staff_id' },
        { table: 'user_point_retention_rate', column: 'staff_id' },
        { table: 'user_annual_leave_points', column: 'staff_id' },
        { table: 'schedule_hidden_members', column: 'staff_id' },
        { table: 'user_secondment', column: 'staff_id' },
        { table: 'user_leave_of_absence', column: 'staff_id' },
        { table: 'kensanbi_grant_history', column: 'staff_id' },
        { table: 'kensanbi_grant_history', column: 'approved_by_staff_id' },
        { table: 'kensanbi_usage_history', column: 'staff_id' },
        { table: 'priority_exchange_log', column: 'exchanged_by_staff_id' },
        { table: 'priority_exchange_request', column: 'requester_staff_id' },
        { table: 'priority_exchange_request', column: 'target_staff_id' },
        { table: 'priority_exchange_request', column: 'admin_staff_id' },
        { table: 'cancellation_request', column: 'reviewed_by_staff_id' },
        { table: 'schedule_publish', column: 'published_by_staff_id' },
      ];

      // Step 1: 旧ユーザー情報を取得
      const { data: oldUser, error: fetchError } = await supabase
        .from("user")
        .select("*")
        .eq("staff_id", oldStaffId)
        .single();

      if (fetchError || !oldUser) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }

      // Step 2: 新しいIDでユーザーを先に作成（外部キー参照先を用意）
      const { error: insertError } = await supabase
        .from("user")
        .insert({
          ...oldUser,
          staff_id: newId,
        });

      if (insertError) {
        throw new Error(`新しいIDでのユーザー作成に失敗しました: ${insertError.message}`);
      }

      // Step 3: 全ての子テーブルを新IDに更新
      const updateErrors: string[] = [];
      for (const { table, column } of tablesToUpdate) {
        const { error } = await supabase
          .from(table)
          .update({ [column]: newId })
          .eq(column, oldStaffId);

        if (error) {
          console.log(`Table ${table}.${column} update:`, error.message);
          // 外部キー制約エラー以外の場合のみ記録（データが存在しない場合はOK）
          if (!error.message.includes('0 rows')) {
            updateErrors.push(`${table}.${column}`);
          }
        }
      }

      // Step 4: 古いユーザーを削除
      const { error: deleteError } = await supabase
        .from("user")
        .delete()
        .eq("staff_id", oldStaffId);

      if (deleteError) {
        // ロールバック: 子テーブルを元に戻し、新しいユーザーを削除
        for (const { table, column } of tablesToUpdate) {
          await supabase.from(table).update({ [column]: oldStaffId }).eq(column, newId);
        }
        await supabase.from("user").delete().eq("staff_id", newId);
        throw new Error(`古いユーザーの削除に失敗しました: ${deleteError.message}`);
      }

      if (updateErrors.length > 0) {
        console.warn("一部のテーブル更新でエラー:", updateErrors);
      }

      alert(`職員IDを「${oldStaffId}」から「${newId}」に変更しました`);
      setShowStaffIdChangeModal(false);
      setStaffIdChangeTarget(null);
      setNewStaffId('');

      // 現在のユーザーのIDを変更した場合はログアウト
      if (currentUser && currentUser.staff_id === oldStaffId) {
        alert("自分の職員IDを変更したため、再ログインが必要です");
        localStorage.removeItem("user");
        router.push("/auth/login");
        return;
      }

      await fetchUsersForYear(selectedFiscalYear);
    } catch (err) {
      console.error("職員ID変更エラー:", err);
      alert(`職員IDの変更に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAnnualLeavePointsChange = (staffId: string, value: string) => {
    setEditingAnnualLeavePoints(prev => ({
      ...prev,
      [staffId]: value
    }));
  };

  const handleAnnualLeavePointsBlur = async (user: UserWithPoints) => {
    const editedValue = editingAnnualLeavePoints[user.staff_id];

    // 編集中の値がない場合は何もしない
    if (editedValue === undefined) return;

    // 空欄の場合は削除（デフォルト値に戻す）
    const newPoints = editedValue === "" ? null : Number(editedValue);

    // 元の値と同じ場合は何もしない
    const currentPoints = user.annualLeavePoints;
    if (newPoints === currentPoints) {
      setEditingAnnualLeavePoints(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
      return;
    }

    // バリデーション（得点は0以上、上限なし）
    if (newPoints !== null && (newPoints < 0 || !Number.isInteger(newPoints))) {
      alert("年休得点は0以上の整数で入力してください");
      setEditingAnnualLeavePoints(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
      return;
    }

    if (!selectedFiscalYear) return;

    setProcessing(true);

    try {
      if (newPoints === null) {
        // 空欄の場合は削除
        const { error } = await supabase
          .from("user_annual_leave_points")
          .delete()
          .eq("staff_id", user.staff_id)
          .eq("fiscal_year", selectedFiscalYear);

        if (error) {
          alert("年休得点の更新に失敗しました");
          console.error("Error:", error);
        } else {
          // ローカル状態を更新
          setUsers(prev => prev.map(u => {
            if (u.staff_id !== user.staff_id) return u;
            const newMaxPoints = maxAnnualLeavePoints ?? 0;
            const newRemainingPoints = u.usedPoints !== null
              ? newMaxPoints - u.usedPoints
              : null;
            return {
              ...u,
              annualLeavePoints: null,
              remainingPoints: newRemainingPoints
            };
          }));
          setEditingAnnualLeavePoints(prev => {
            const newState = { ...prev };
            delete newState[user.staff_id];
            return newState;
          });
        }
      } else {
        // 年度別テーブルにupsert
        const { error } = await supabase
          .from("user_annual_leave_points")
          .upsert({
            staff_id: user.staff_id,
            fiscal_year: selectedFiscalYear,
            annual_leave_points: newPoints,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'staff_id,fiscal_year'
          });

        if (error) {
          alert("年休得点の更新に失敗しました");
          console.error("Error:", error);
        } else {
          // ローカル状態を更新
          setUsers(prev => prev.map(u => {
            if (u.staff_id !== user.staff_id) return u;
            const newRemainingPoints = u.usedPoints !== null
              ? newPoints - u.usedPoints
              : null;
            return {
              ...u,
              annualLeavePoints: newPoints,
              remainingPoints: newRemainingPoints
            };
          }));
          setEditingAnnualLeavePoints(prev => {
            const newState = { ...prev };
            delete newState[user.staff_id];
            return newState;
          });
        }
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleAnnualLeavePointsKeyDown = async (e: React.KeyboardEvent, user: UserWithPoints) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleAnnualLeavePointsBlur(user);
    } else if (e.key === "Escape") {
      setEditingAnnualLeavePoints(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
    }
  };

  const isCurrentUser = (user: User): boolean => {
    return currentUser ? user.staff_id === currentUser.staff_id : false;
  };

  const cannotModify = (user: UserWithPoints): boolean => {
    // 自分自身または最後の管理者は変更不可
    return isCurrentUser(user) || (user.is_admin && getAdminCount() === 1);
  };

  const handleSort = (column: 'staff_id' | 'name' | 'created_at' | 'annualLeavePoints' | 'remainingPoints') => {
    if (sortColumn === column) {
      // 同じ列をクリックした場合は方向を反転
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しい列をクリックした場合は昇順に設定
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = (): UserWithPoints[] => {
    if (!sortColumn) return users;

    return [...users].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'staff_id':
          aValue = a.staff_id;
          bValue = b.staff_id;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'annualLeavePoints':
          aValue = a.annualLeavePoints ?? maxAnnualLeavePoints ?? 0;
          bValue = b.annualLeavePoints ?? maxAnnualLeavePoints ?? 0;
          break;
        case 'remainingPoints':
          aValue = a.remainingPoints ?? -1;
          bValue = b.remainingPoints ?? -1;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (column: 'staff_id' | 'name' | 'created_at' | 'annualLeavePoints' | 'remainingPoints') => {
    if (sortColumn !== column) {
      return <Icons.ArrowUpDown />;
    }
    return sortDirection === 'asc' ? <Icons.ArrowUp /> : <Icons.ArrowDown />;
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Users />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">メンバー管理</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <Icons.Home />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                登録メンバー一覧
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                全{users.length}名（管理者: {getAdminCount()}名）
              </p>
            </div>
            {/* 年度切替タブ */}
            {defaultFiscalYear && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">年度:</span>
                <div className="flex gap-1">
                  {[defaultFiscalYear - 1, defaultFiscalYear, defaultFiscalYear + 1].map(year => (
                    <button
                      key={year}
                      onClick={() => handleFiscalYearChange(year)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedFiscalYear === year
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {year}年度
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('staff_id')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      職員ID
                      {getSortIcon('staff_id')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      氏名
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      登録日時
                      {getSortIcon('created_at')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    管理者権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('annualLeavePoints')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      年休得点
                      {getSortIcon('annualLeavePoints')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('remainingPoints')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      残り得点
                      {getSortIcon('remainingPoints')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedUsers().map((user) => (
                  <tr key={user.staff_id} className={`hover:bg-gray-50 transition-colors ${isCurrentUser(user) ? "bg-blue-50/50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.staff_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {isCurrentUser(user) && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                            あなた
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          disabled={cannotModify(user) || processing}
                          onClick={() => handleToggleAdmin(user)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${user.is_admin ? 'bg-blue-600' : 'bg-gray-200'
                            } ${cannotModify(user) || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.is_admin ? 'translate-x-5' : 'translate-x-0'
                              }`}
                          />
                        </button>
                        <span className={`text-sm font-medium flex items-center gap-1 ${user.is_admin ? 'text-blue-700' : 'text-gray-500'}`}>
                          {user.is_admin ? (
                            <>
                              <Icons.Shield />
                              管理者
                            </>
                          ) : (
                            <>
                              <Icons.User />
                              一般
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editingAnnualLeavePoints[user.staff_id] ?? (user.annualLeavePoints ?? maxAnnualLeavePoints ?? '')}
                          onChange={(e) => handleAnnualLeavePointsChange(user.staff_id, e.target.value)}
                          onBlur={() => handleAnnualLeavePointsBlur(user)}
                          onKeyDown={(e) => handleAnnualLeavePointsKeyDown(e, user)}
                          disabled={processing}
                          placeholder={`${maxAnnualLeavePoints ?? 0}`}
                          className={`w-20 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            user.annualLeavePoints === null
                              ? 'border-gray-200 text-gray-500 bg-gray-50'
                              : 'border-gray-300 text-gray-900'
                          }`}
                        />
                        <span className="text-gray-600 font-medium text-xs">
                          {user.annualLeavePoints === null ? '(既定)' : '点'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.remainingPoints !== null ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          user.remainingPoints > 10
                            ? "bg-green-100 text-green-800"
                            : user.remainingPoints > 5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.remainingPoints.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openStaffIdChangeModal(user)}
                          disabled={processing}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="職員IDを変更"
                        >
                          <Icons.Edit />
                          ID変更
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={cannotModify(user) || processing}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icons.Trash />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {ConfirmDialog}

      {/* 職員ID変更モーダル */}
      {showStaffIdChangeModal && staffIdChangeTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowStaffIdChangeModal(false);
              setStaffIdChangeTarget(null);
              setNewStaffId('');
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[400px] max-w-[90vw]">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">職員ID変更</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象者</label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                    {staffIdChangeTarget.name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">現在の職員ID</label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-mono">
                    {staffIdChangeTarget.staff_id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新しい職員ID</label>
                  <input
                    type="text"
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                    placeholder="新しい職員IDを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={processing}
                  />
                  <p className="mt-1 text-xs text-gray-500">※ 数字のみ入力可能です</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowStaffIdChangeModal(false);
                    setStaffIdChangeTarget(null);
                    setNewStaffId('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleChangeStaffId}
                  disabled={processing || !newStaffId.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? '処理中...' : '変更する'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
