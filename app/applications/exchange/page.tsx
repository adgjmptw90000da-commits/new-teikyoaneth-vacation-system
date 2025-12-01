// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import {
  createExchangeRequest,
  respondToExchangeRequest,
  getExchangeRequestsForUser,
  getExchangeableApplicationsForUser,
  getSameDateApplications,
} from "@/lib/priority-exchange-request";
import { useConfirm } from "@/components/ConfirmDialog";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Exchange: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
  ),
};

// ステータス表示名
const getStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    after_lottery: "抽選後",
    confirmed: "確定",
    withdrawn: "取り消し",
  };
  return labels[status] || status;
};

// レベルごとの左ボーダー色
const getLevelBorderColor = (level: number): string => {
  switch (level) {
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-blue-500";
    case 3:
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

// レベルバッジの色
const getLevelBadgeColor = (level: number): string => {
  switch (level) {
    case 1:
      return "bg-[#ffb3c8] text-red-900";
    case 2:
      return "bg-blue-100 text-blue-800";
    case 3:
      return "bg-[#e0ffe0] text-green-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function ExchangePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  // モーダル関連
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedMyApp, setSelectedMyApp] = useState<any>(null);
  const [targetApplications, setTargetApplications] = useState<any[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // 確認ダイアログ
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
    fetchData(currentUser.staff_id);
  }, [router]);

  const fetchData = async (staffId: string) => {
    setLoading(true);
    try {
      const [applications, requests] = await Promise.all([
        getExchangeableApplicationsForUser(staffId),
        getExchangeRequestsForUser(staffId),
      ]);
      setMyApplications(applications);
      setReceivedRequests(requests.receivedRequests);
      setSentRequests(requests.sentRequests);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 交換申請作成ボタンをクリック
  const handleCreateRequest = async (app: any) => {
    setSelectedMyApp(app);
    setLoadingTargets(true);
    setShowTargetModal(true);

    const targets = await getSameDateApplications(app.vacation_date, user.staff_id);
    setTargetApplications(targets);
    setLoadingTargets(false);
  };

  // 相手を選択して交換申請を作成
  const handleSelectTarget = async (targetApp: any) => {
    const confirmed = await confirm({
      title: "交換申請の確認",
      message: `${targetApp.user?.name || "相手"}さんの申請と交換申請を作成しますか？\n\n自分: レベル${selectedMyApp.level} 優先順位${selectedMyApp.priority}\n相手: レベル${targetApp.level} 優先順位${targetApp.priority}`,
      confirmText: "申請する",
      cancelText: "キャンセル",
    });

    if (!confirmed) return;

    const result = await createExchangeRequest(
      selectedMyApp.id,
      targetApp.id,
      user.staff_id
    );

    if (result.success) {
      alert("交換申請を作成しました");
      setShowTargetModal(false);
      fetchData(user.staff_id);
    } else {
      alert(result.error || "エラーが発生しました");
    }
  };

  // 受け取った申請に応答
  const handleRespond = async (requestId: number, response: 'accepted' | 'rejected') => {
    const actionText = response === 'accepted' ? '承諾' : '拒否';
    const confirmed = await confirm({
      title: `交換申請の${actionText}`,
      message: `この交換申請を${actionText}しますか？`,
      confirmText: actionText,
      cancelText: "キャンセル",
    });

    if (!confirmed) return;

    const result = await respondToExchangeRequest(requestId, user.staff_id, response);

    if (result.success) {
      alert(`交換申請を${actionText}しました`);
      fetchData(user.staff_id);
    } else {
      alert(result.error || "エラーが発生しました");
    }
  };

  // ステータスの表示
  const getRequestStatus = (request: any, isSent: boolean) => {
    if (request.admin_response === 'approved') {
      return { text: "交換完了", color: "bg-[#e0ffe0] text-green-900" };
    } else if (request.admin_response === 'rejected') {
      return { text: "管理者却下", color: "bg-[#ffb3c8] text-red-900" };
    } else if (request.target_response === 'rejected') {
      return { text: isSent ? "相手が拒否" : "拒否済み", color: "bg-[#ffb3c8] text-red-900" };
    } else if (request.target_response === 'accepted') {
      return { text: "管理者承認待ち", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { text: isSent ? "相手の承諾待ち" : "対応待ち", color: "bg-blue-100 text-blue-800" };
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未対応の受け取り申請
  const pendingReceivedRequests = receivedRequests.filter(r => r.target_response === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {ConfirmDialog}
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
              <div className="bg-orange-600 p-1.5 rounded-lg text-white">
                <Icons.Exchange />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                優先順位交換申請
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push(isAdmin() ? "/admin/home" : "/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <Icons.Home />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* 説明 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="text-orange-500 mt-0.5">
                <Icons.AlertCircle />
              </div>
              <p className="text-sm font-medium text-gray-600">
                抽選後・確定済み・取り消しステータスの申請について、同日の他ユーザーと優先順位・レベル・ステータスを交換できます。相手の承諾後、管理者が承認すると交換が実行されます。
              </p>
            </div>
          </div>

          {/* 受け取った交換申請（未対応） */}
          {pendingReceivedRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-orange-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">受け取った交換申請</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  {pendingReceivedRequests.length}件
                </span>
              </div>

              <div className="grid gap-4">
                {pendingReceivedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="relative overflow-hidden rounded-xl border border-orange-200 shadow-sm bg-orange-50"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                    <div className="p-5 pl-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {request.requester?.name || "不明"}さんから
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-md bg-white text-gray-700 text-xs font-medium border border-gray-200">
                              {new Date(request.requester_application?.vacation_date).toLocaleDateString('ja-JP', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                                timeZone: 'Asia/Tokyo'
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              相手: Lv.{request.requester_application?.level} / 順位{request.requester_application?.priority} / {getStatusLabel(request.requester_application?.status)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              自分: Lv.{request.target_application?.level} / 順位{request.target_application?.priority} / {getStatusLabel(request.target_application?.status)}
                            </span>
                          </div>

                          {request.request_reason && (
                            <div className="text-sm text-gray-600 bg-white/50 p-2 rounded border border-gray-100">
                              <span className="font-medium text-gray-900">理由:</span> {request.request_reason}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleRespond(request.id, 'accepted')}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            承諾
                          </button>
                          <button
                            onClick={() => handleRespond(request.id, 'rejected')}
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            拒否
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 自分の申請一覧 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">交換可能な自分の申請</h2>
            </div>

            {myApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <Icons.Exchange />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">交換可能な申請がありません</h3>
                <p className="text-gray-500">抽選後・確定済み・取り消しの申請が交換対象です</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getLevelBorderColor(app.level)}`}></div>
                    <div className="p-5 pl-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {new Date(app.vacation_date).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                                timeZone: 'Asia/Tokyo'
                              })}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(app.level)}`}>
                              レベル{app.level}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              順位: {app.priority}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {getStatusLabel(app.status)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCreateRequest(app)}
                          className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                          <Icons.Exchange />
                          交換申請
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 送信済み交換申請 */}
          {sentRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-purple-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">送信済み交換申請</h2>
              </div>

              <div className="grid gap-4">
                {sentRequests.map((request) => {
                  const status = getRequestStatus(request, true);
                  return (
                    <div
                      key={request.id}
                      className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500"></div>
                      <div className="p-5 pl-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {new Date(request.requester_application?.vacation_date).toLocaleDateString('ja-JP', {
                                  month: 'long',
                                  day: 'numeric',
                                  weekday: 'short',
                                  timeZone: 'Asia/Tokyo'
                                })}
                              </h3>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium text-gray-700">{request.target?.name || "不明"}さん</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                自分: Lv.{request.requester_application?.level} / 順位{request.requester_application?.priority}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                相手: Lv.{request.target_application?.level} / 順位{request.target_application?.priority}
                              </span>
                            </div>
                          </div>

                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 対応済み受け取り申請 */}
          {receivedRequests.filter(r => r.target_response !== 'pending').length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gray-400 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">受け取った交換申請（対応済み）</h2>
              </div>

              <div className="grid gap-4">
                {receivedRequests.filter(r => r.target_response !== 'pending').map((request) => {
                  const status = getRequestStatus(request, false);
                  return (
                    <div
                      key={request.id}
                      className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-gray-50"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-400"></div>
                      <div className="p-5 pl-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {request.requester?.name || "不明"}さんから
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-md bg-white text-gray-700 text-xs font-medium border border-gray-200">
                                {new Date(request.requester_application?.vacation_date).toLocaleDateString('ja-JP', {
                                  month: 'long',
                                  day: 'numeric',
                                  weekday: 'short',
                                  timeZone: 'Asia/Tokyo'
                                })}
                              </span>
                            </div>
                          </div>

                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 相手選択モーダル */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">交換相手を選択</h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X />
              </button>
            </div>
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">
                  {new Date(selectedMyApp?.vacation_date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                    timeZone: 'Asia/Tokyo'
                  })}
                </p>
                <p>自分: レベル{selectedMyApp?.level} / 優先順位{selectedMyApp?.priority} / {getStatusLabel(selectedMyApp?.status)}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingTargets ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-pulse">読み込み中...</div>
                </div>
              ) : targetApplications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  同日の交換可能な申請がありません
                </div>
              ) : (
                <div className="divide-y">
                  {targetApplications.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleSelectTarget(app)}
                      className="w-full p-4 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 mb-1">
                        {app.user?.name || "不明"}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLevelBadgeColor(app.level)}`}>
                          レベル{app.level}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          順位{app.priority}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {getStatusLabel(app.status)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowTargetModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
