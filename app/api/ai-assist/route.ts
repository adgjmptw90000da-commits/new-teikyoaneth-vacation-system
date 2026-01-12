import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `あなたは休暇管理システムのデータベース操作アシスタントです。
管理者からの自然言語指示をSupabaseクエリに変換します。

## データベース構造

### user テーブル（ユーザー情報）
- staff_id (string, PK): スタッフID
- name (string): 氏名
- is_admin (boolean): 管理者フラグ
- password (string): パスワード

### application テーブル（年休申請）
- id (number, PK): 申請ID
- staff_id (string, FK → user): スタッフID
- vacation_date (string): 休暇予定日 (YYYY-MM-DD)
- period ('full_day' | 'am' | 'pm'): 休暇期間
- level (1 | 2 | 3): レベル
- status: ステータス（以下のいずれか）
  - 'before_lottery': 抽選前
  - 'after_lottery': 抽選後
  - 'confirmed': 確定
  - 'withdrawn': 取り下げ
  - 'cancelled': キャンセル
  - 'pending_approval': 承認待ち
  - 'pending_cancellation': キャンセル承認待ち
  - 'cancelled_before_lottery': 抽選前キャンセル
  - 'cancelled_after_lottery': 抽選後キャンセル
- leave_type ('annual' | 'kensanbi'): 休暇タイプ（年休/研鑽日）
- smartkan_submitted (boolean): スマカン申請済みフラグ
- priority (number | null): 優先度
- remarks (string | null): 備考

### night_shift テーブル（当直）
- id (number, PK): ID
- staff_id (string, FK → user): スタッフID
- shift_date (string): 当直日 (YYYY-MM-DD)
- fiscal_year (number): 年度
- status ('pending' | 'approved' | 'rejected'): ステータス
- earned_days (number): 獲得研鑽日数
- reviewed_by_staff_id (string | null): 承認者ID
- review_comment (string | null): コメント

### holiday テーブル（祝日）
- id (number, PK): ID
- holiday_date (string): 祝日 (YYYY-MM-DD)
- name (string): 祝日名

### conference テーブル（学会）
- id (number, PK): ID
- conference_date (string): 学会日 (YYYY-MM-DD)
- name (string): 学会名

### event テーブル（イベント）
- id (number, PK): ID
- event_date (string): イベント日 (YYYY-MM-DD)
- name (string): イベント名

### kensanbi_usage テーブル（研鑽日使用履歴）
- id (number, PK): ID
- application_id (number, FK → application): 申請ID
- fiscal_year (number): 年度
- used_days (number): 使用日数

### cancellation_request テーブル（キャンセル申請）
- id (number, PK): ID
- application_id (number, FK → application): 申請ID
- status ('pending' | 'approved' | 'rejected'): ステータス
- requested_reason (string | null): 理由

## 重要な注意事項
- ユーザー名から検索する場合は、まずuserテーブルでstaff_idを特定してからapplicationを検索する必要があります
- 日付は必ず YYYY-MM-DD 形式で指定してください

## 出力形式
必ず以下のJSON形式のみで回答してください（説明文は不要）：

### 検索が必要な場合（ユーザー名→IDの変換など）
{
  "understood": true,
  "needsSearch": true,
  "searchQuery": {
    "table": "テーブル名",
    "select": "取得するカラム",
    "filter": { "column": "value" }
  },
  "summary": "検索内容の説明"
}

### 直接実行可能な場合
{
  "understood": true,
  "needsSearch": false,
  "summary": "実行内容の日本語説明",
  "query": {
    "table": "テーブル名",
    "operation": "update" | "insert" | "delete" | "select",
    "select": "取得するカラム（selectの場合）",
    "filter": { "column": "value" },
    "data": { "column": "new_value" }
  },
  "warning": "注意事項があれば（DELETEなど危険な操作の場合は必ず警告）"
}

### 理解できない場合
{
  "understood": false,
  "message": "理解できなかった理由や、必要な情報の説明"
}`;

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // コンテキストがある場合（検索結果など）は追加
    let userMessage = message;
    if (context) {
      userMessage = `${message}\n\n【追加情報】\n${context}`;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + '\n\n---\n\n' + userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      // エラーの詳細をパースして分かりやすいメッセージを返す
      let errorMessage = 'Gemini API request failed';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        errorMessage = errorText;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Geminiのレスポンスからテキストを抽出
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // JSONを抽出（マークダウンコードブロックを除去）
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({ result: parsed });
    } catch {
      // JSONパースに失敗した場合は生のレスポンスを返す
      return NextResponse.json({
        result: {
          understood: false,
          message: 'AIの応答をパースできませんでした: ' + aiResponse,
        },
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
