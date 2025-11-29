// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type User = Database["public"]["Tables"]["user"]["Row"];

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
  ArrowUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  ArrowDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  GripVertical: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
};

export default function MemberSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | 'all'>('all');

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
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .order("team", { ascending: true })
        .order("display_order", { ascending: true })
        .order("staff_id", { ascending: true });

      if (error) {
        console.error("Error fetching users:", error);
        alert("ユーザー一覧の取得に失敗しました");
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = async (staffId: string, team: 'A' | 'B') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user")
        .update({ team })
        .eq("staff_id", staffId);

      if (error) {
        alert("チームの更新に失敗しました");
        console.error("Error:", error);
      } else {
        setUsers(prev => prev.map(u => u.staff_id === staffId ? { ...u, team } : u));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNightShiftLevelChange = async (staffId: string, level: 'なし' | '上' | '中' | '下') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user")
        .update({ night_shift_level: level })
        .eq("staff_id", staffId);

      if (error) {
        alert("当直レベルの更新に失敗しました");
        console.error("Error:", error);
      } else {
        setUsers(prev => prev.map(u => u.staff_id === staffId ? { ...u, night_shift_level: level } : u));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePositionChange = async (staffId: string, position: '常勤' | '非常勤' | 'ローテーター' | '研修医') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user")
        .update({ position })
        .eq("staff_id", staffId);

      if (error) {
        alert("立場の更新に失敗しました");
        console.error("Error:", error);
      } else {
        setUsers(prev => prev.map(u => u.staff_id === staffId ? { ...u, position } : u));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCapabilityChange = async (staffId: string, field: 'can_cardiac' | 'can_obstetric' | 'can_icu' | 'can_remaining_duty', value: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user")
        .update({ [field]: value })
        .eq("staff_id", staffId);

      if (error) {
        alert("可否の更新に失敗しました");
        console.error("Error:", error);
      } else {
        setUsers(prev => prev.map(u => u.staff_id === staffId ? { ...u, [field]: value } : u));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSaving(false);
    }
  };

  const moveUser = async (staffId: string, direction: 'up' | 'down') => {
    const filteredUsers = getFilteredUsers();
    const currentIndex = filteredUsers.findIndex(u => u.staff_id === staffId);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === filteredUsers.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentUser = filteredUsers[currentIndex];
    const swapUser = filteredUsers[swapIndex];

    // 表示順を交換
    const currentOrder = currentUser.display_order ?? currentIndex;
    const swapOrder = swapUser.display_order ?? swapIndex;

    setSaving(true);
    try {
      await Promise.all([
        supabase.from("user").update({ display_order: swapOrder }).eq("staff_id", currentUser.staff_id),
        supabase.from("user").update({ display_order: currentOrder }).eq("staff_id", swapUser.staff_id),
      ]);

      setUsers(prev => {
        const newUsers = [...prev];
        const idx1 = newUsers.findIndex(u => u.staff_id === currentUser.staff_id);
        const idx2 = newUsers.findIndex(u => u.staff_id === swapUser.staff_id);
        newUsers[idx1] = { ...newUsers[idx1], display_order: swapOrder };
        newUsers[idx2] = { ...newUsers[idx2], display_order: currentOrder };
        return newUsers;
      });
    } catch (err) {
      console.error("Error:", err);
      alert("並び順の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const getFilteredUsers = (): User[] => {
    let filtered = [...users];
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(u => u.team === selectedTeam);
    }
    // チーム→表示順→職員IDでソート
    return filtered.sort((a, b) => {
      if (selectedTeam === 'all') {
        if (a.team !== b.team) return a.team === 'A' ? -1 : 1;
      }
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.staff_id.localeCompare(b.staff_id);
    });
  };

  const autoReorder = async () => {
    // チームA→B順、各チーム内で現在の表示順を維持しつつ連番を振り直す
    const teamA = users.filter(u => u.team === 'A').sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
    const teamB = users.filter(u => u.team === 'B').sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

    setSaving(true);
    try {
      const updates: Promise<any>[] = [];
      teamA.forEach((user, idx) => {
        updates.push(supabase.from("user").update({ display_order: idx }).eq("staff_id", user.staff_id));
      });
      teamB.forEach((user, idx) => {
        updates.push(supabase.from("user").update({ display_order: idx + 1000 }).eq("staff_id", user.staff_id));
      });

      await Promise.all(updates);
      await fetchUsers();
      alert("表示順を整理しました");
    } catch (err) {
      console.error("Error:", err);
      alert("表示順の整理に失敗しました");
    } finally {
      setSaving(false);
    }
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

  const filteredUsers = getFilteredUsers();
  const teamACount = users.filter(u => u.team === 'A').length;
  const teamBCount = users.filter(u => u.team === 'B').length;

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
              <div className="bg-purple-600 p-1.5 rounded-lg text-white">
                <Icons.Users />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">メンバー属性・並び順</h1>
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
        <div className="space-y-6">
          {/* フィルター・操作 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">チーム表示:</span>
                <div className="flex gap-1">
                  {(['all', 'A', 'B'] as const).map(team => (
                    <button
                      key={team}
                      onClick={() => setSelectedTeam(team)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedTeam === team
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {team === 'all' ? '全員' : `${team}表`}
                      {team !== 'all' && (
                        <span className="ml-1 text-xs">
                          ({team === 'A' ? teamACount : teamBCount})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={autoReorder}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                表示順を整理
              </button>
            </div>
          </div>

          {/* メンバー一覧 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                メンバー一覧
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                全{users.length}名（A表: {teamACount}名 / B表: {teamBCount}名）
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">順序</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">職員ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">氏名</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">チーム</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">立場</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">当直レベル</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">心外</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">産科</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">ICU</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">残り番</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.staff_id} className="hover:bg-gray-50 transition-colors">
                      {/* 順序操作 */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveUser(user.staff_id, 'up')}
                            disabled={idx === 0 || saving}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Icons.ArrowUp />
                          </button>
                          <button
                            onClick={() => moveUser(user.staff_id, 'down')}
                            disabled={idx === filteredUsers.length - 1 || saving}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Icons.ArrowDown />
                          </button>
                          <span className="text-gray-400 text-xs ml-1">{idx + 1}</span>
                        </div>
                      </td>
                      {/* 職員ID */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.staff_id}
                      </td>
                      {/* 氏名 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {user.name}
                      </td>
                      {/* チーム */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-1">
                          {(['A', 'B'] as const).map(team => (
                            <button
                              key={team}
                              onClick={() => handleTeamChange(user.staff_id, team)}
                              disabled={saving}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                user.team === team
                                  ? team === 'A'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-orange-600 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {team}
                            </button>
                          ))}
                        </div>
                      </td>
                      {/* 立場 */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <select
                          value={user.position || '常勤'}
                          onChange={(e) => handlePositionChange(user.staff_id, e.target.value as '常勤' | '非常勤' | 'ローテーター' | '研修医')}
                          disabled={saving}
                          className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        >
                          <option value="常勤">常勤</option>
                          <option value="非常勤">非常勤</option>
                          <option value="ローテーター">ローテーター</option>
                          <option value="研修医">研修医</option>
                        </select>
                      </td>
                      {/* 当直レベル */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-1">
                          {(['なし', '上', '中', '下'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => handleNightShiftLevelChange(user.staff_id, level)}
                              disabled={saving}
                              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                                user.night_shift_level === level
                                  ? level === 'なし'
                                    ? 'bg-gray-600 text-white'
                                    : level === '上'
                                    ? 'bg-green-600 text-white'
                                    : level === '中'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </td>
                      {/* 心外 */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCapabilityChange(user.staff_id, 'can_cardiac', !user.can_cardiac)}
                          disabled={saving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            user.can_cardiac
                              ? 'bg-pink-600 text-white'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {user.can_cardiac && <Icons.Check />}
                        </button>
                      </td>
                      {/* 産科 */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCapabilityChange(user.staff_id, 'can_obstetric', !user.can_obstetric)}
                          disabled={saving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            user.can_obstetric
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {user.can_obstetric && <Icons.Check />}
                        </button>
                      </td>
                      {/* ICU */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCapabilityChange(user.staff_id, 'can_icu', !user.can_icu)}
                          disabled={saving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            user.can_icu
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {user.can_icu && <Icons.Check />}
                        </button>
                      </td>
                      {/* 残り番 */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleCapabilityChange(user.staff_id, 'can_remaining_duty', !user.can_remaining_duty)}
                          disabled={saving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            user.can_remaining_duty
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {user.can_remaining_duty && <Icons.Check />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 凡例 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">凡例</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold">A</span>
                <span className="text-gray-600">A表チーム</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-orange-600 text-white rounded font-bold">B</span>
                <span className="text-gray-600">B表チーム</span>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                <span className="text-gray-600">立場: 常勤 / 非常勤 / ローテーター / 研修医</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-600 text-white rounded font-bold">なし</span>
                <span className="text-gray-600">当直なし</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-600 text-white rounded font-bold">上</span>
                <span className="text-gray-600">当直レベル上</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-500 text-white rounded font-bold">中</span>
                <span className="text-gray-600">当直レベル中</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500 text-white rounded font-bold">下</span>
                <span className="text-gray-600">当直レベル下</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-pink-600 text-white rounded flex items-center justify-center"><Icons.Check /></span>
                <span className="text-gray-600">心外可</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded flex items-center justify-center"><Icons.Check /></span>
                <span className="text-gray-600">産科可</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-teal-600 text-white rounded flex items-center justify-center"><Icons.Check /></span>
                <span className="text-gray-600">ICU可</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-600 text-white rounded flex items-center justify-center"><Icons.Check /></span>
                <span className="text-gray-600">残り番可</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
