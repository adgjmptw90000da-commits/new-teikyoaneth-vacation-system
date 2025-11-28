// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  AlertTriangle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Loader: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  ),
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  aiResult?: AIResult;
  executed?: boolean;
  executionResult?: string;
};

type AIResult = {
  understood: boolean;
  needsSearch?: boolean;
  searchQuery?: {
    table: string;
    select: string;
    filter: Record<string, unknown>;
  };
  summary?: string;
  query?: {
    table: string;
    operation: "update" | "insert" | "delete" | "select";
    select?: string;
    filter?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  warning?: string;
  message?: string;
};

export default function AIAssistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = getUser();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/home");
      return;
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const sendMessage = async () => {
    if (!input.trim() || processing) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setProcessing(true);

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `エラー: ${data.error}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const aiResult = data.result as AIResult;

      // 検索が必要な場合は先に検索を実行
      if (aiResult.needsSearch && aiResult.searchQuery) {
        const searchResult = await executeSearch(aiResult.searchQuery);

        // 検索結果を含めて再度AIに問い合わせ
        const followUpResponse = await fetch("/api/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.content,
            context: `検索結果: ${JSON.stringify(searchResult)}`,
          }),
        });

        const followUpData = await followUpResponse.json();
        const finalResult = followUpData.result as AIResult;

        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: formatAIResponse(finalResult),
          aiResult: finalResult,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: formatAIResponse(aiResult),
          aiResult: aiResult,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "エラーが発生しました。もう一度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setProcessing(false);
    }
  };

  const executeSearch = async (searchQuery: {
    table: string;
    select: string;
    filter: Record<string, unknown>;
  }) => {
    try {
      let query = supabase
        .from(searchQuery.table)
        .select(searchQuery.select || "*");

      // フィルターを適用
      for (const [key, value] of Object.entries(searchQuery.filter)) {
        if (typeof value === "string" && value.includes("%")) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return data;
    } catch (error) {
      return { error: "検索に失敗しました" };
    }
  };

  const formatAIResponse = (result: AIResult): string => {
    if (!result.understood) {
      return result.message || "リクエストを理解できませんでした。";
    }

    let response = result.summary || "";

    if (result.query) {
      response += "\n\n**実行予定のクエリ:**\n";
      response += `- テーブル: ${result.query.table}\n`;
      response += `- 操作: ${result.query.operation}\n`;
      if (result.query.filter) {
        response += `- 条件: ${JSON.stringify(result.query.filter)}\n`;
      }
      if (result.query.data) {
        response += `- 変更内容: ${JSON.stringify(result.query.data)}\n`;
      }
    }

    if (result.warning) {
      response += `\n\n**警告:** ${result.warning}`;
    }

    return response;
  };

  const executeQuery = async (messageId: string, aiResult: AIResult) => {
    if (!aiResult.query) return;

    const { table, operation, filter, data } = aiResult.query;

    try {
      let result;
      let query;

      switch (operation) {
        case "select":
          query = supabase.from(table).select(aiResult.query.select || "*");
          if (filter) {
            for (const [key, value] of Object.entries(filter)) {
              query = query.eq(key, value);
            }
          }
          result = await query;
          break;

        case "update":
          if (!data || !filter) {
            throw new Error("更新データまたは条件が指定されていません");
          }
          query = supabase.from(table).update(data);
          for (const [key, value] of Object.entries(filter)) {
            query = query.eq(key, value);
          }
          result = await query.select();
          break;

        case "insert":
          if (!data) {
            throw new Error("挿入データが指定されていません");
          }
          result = await supabase.from(table).insert(data).select();
          break;

        case "delete":
          if (!filter) {
            throw new Error("削除条件が指定されていません");
          }
          query = supabase.from(table).delete();
          for (const [key, value] of Object.entries(filter)) {
            query = query.eq(key, value);
          }
          result = await query.select();
          break;

        default:
          throw new Error(`未対応の操作: ${operation}`);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // メッセージを更新して実行結果を表示
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                executed: true,
                executionResult: `実行成功！\n結果: ${JSON.stringify(result.data, null, 2)}`,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                executed: true,
                executionResult: `実行失敗: ${error instanceof Error ? error.message : "不明なエラー"}`,
              }
            : msg
        )
      );
    }
  };

  const cancelQuery = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              executed: true,
              executionResult: "キャンセルしました",
            }
          : msg
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-purple-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
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
                <Icons.Bot />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                AIアシスト
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <Icons.Home />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col">
        {/* 警告 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-amber-600">
              <Icons.AlertTriangle />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-800">注意</h3>
              <p className="text-sm text-amber-700 mt-1">
                この機能はデータベースを直接操作します。操作は取り消せない場合があります。
                実行前に必ず内容を確認してください。
              </p>
            </div>
          </div>
        </div>

        {/* チャットエリア */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
                  <Icons.Bot />
                </div>
                <p className="font-medium">データベース操作をお手伝いします</p>
                <p className="text-sm mt-2">
                  例: 「山田さんの12/25のキャンセルした申請を承認待ちに戻して」
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                    <Icons.Bot />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-2xl rounded-tr-md px-4 py-2"
                      : "bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-4 py-3"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

                  {/* 実行ボタン（AIの応答で、まだ実行されていない場合） */}
                  {msg.role === "assistant" &&
                    msg.aiResult?.understood &&
                    msg.aiResult?.query &&
                    !msg.executed && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                        <button
                          onClick={() => executeQuery(msg.id, msg.aiResult!)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Icons.Check />
                          実行する
                        </button>
                        <button
                          onClick={() => cancelQuery(msg.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white text-xs font-bold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <Icons.X />
                          キャンセル
                        </button>
                      </div>
                    )}

                  {/* 実行結果 */}
                  {msg.executed && msg.executionResult && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {msg.executionResult}
                      </pre>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
                    <Icons.User />
                  </div>
                )}
              </div>
            ))}

            {processing && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <Icons.Bot />
                </div>
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icons.Loader />
                    考え中...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="操作を入力してください..."
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={processing}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || processing}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.Send />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
