/**
 * 日付ユーティリティ関数
 * タイムゾーンを考慮した日付処理を提供
 */

/**
 * 日本時間（JST/Asia/Tokyo）での現在日時を取得
 * @returns Date オブジェクト（日本時間）
 */
export const getJSTDate = (): Date => {
  // ブラウザの現在時刻を日本時間として取得
  const now = new Date();
  const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  return new Date(jstString);
};

/**
 * 日付を YYYY-MM-DD 形式に変換（タイムゾーンを考慮）
 * @param date 変換する日付
 * @returns YYYY-MM-DD 形式の文字列
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 日本時間での現在月の初日を YYYY-MM-DD 形式で取得
 * @returns YYYY-MM-DD 形式の文字列
 */
export const getCurrentMonthStartJST = (): string => {
  const today = getJSTDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  return formatDateToYYYYMMDD(firstDay);
};

/**
 * 日本時間での現在月の末日を YYYY-MM-DD 形式で取得
 * @returns YYYY-MM-DD 形式の文字列
 */
export const getCurrentMonthEndJST = (): string => {
  const today = getJSTDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  return formatDateToYYYYMMDD(lastDay);
};

/**
 * 日本時間で日付文字列を Date オブジェクトに変換
 * @param dateString YYYY-MM-DD 形式の日付文字列
 * @returns Date オブジェクト
 */
export const parseJSTDate = (dateString: string): Date => {
  // YYYY-MM-DD 形式の文字列を日本時間として解釈
  const [year, month, day] = dateString.split('-').map(Number);
  const jstDate = new Date(year, month - 1, day);
  return jstDate;
};

/**
 * 日付を日本時間でフォーマット
 * @param date フォーマットする日付
 * @param options Intl.DateTimeFormat のオプション
 * @returns フォーマットされた日付文字列
 */
export const formatJSTDate = (
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  };
  return new Date(date).toLocaleDateString('ja-JP', defaultOptions);
};

/**
 * 日時を日本時間でフォーマット
 * @param date フォーマットする日時
 * @param options Intl.DateTimeFormat のオプション
 * @returns フォーマットされた日時文字列
 */
export const formatJSTDateTime = (
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  };
  return new Date(date).toLocaleString('ja-JP', defaultOptions);
};
