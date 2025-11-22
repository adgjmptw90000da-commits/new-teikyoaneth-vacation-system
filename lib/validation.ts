// バリデーション関連の関数

import { getJSTDate, formatDateToYYYYMMDD } from './dateUtils';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 職員IDのバリデーション（数字のみ）
 */
export const validateStaffId = (staffId: string): ValidationResult => {
  if (!staffId) {
    return { isValid: false, error: '職員IDを入力してください' };
  }
  if (!/^[0-9]+$/.test(staffId)) {
    return { isValid: false, error: '職員IDは数字のみで入力してください' };
  }
  return { isValid: true };
};

/**
 * パスワードのバリデーション（半角英数6文字以上）
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'パスワードを入力してください' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'パスワードは6文字以上で入力してください' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return { isValid: false, error: 'パスワードは半角英数字のみで入力してください' };
  }
  return { isValid: true };
};

/**
 * パスワード確認のバリデーション
 */
export const validatePasswordConfirmation = (
  password: string,
  passwordConfirmation: string
): ValidationResult => {
  if (password !== passwordConfirmation) {
    return { isValid: false, error: 'パスワードが一致しません' };
  }
  return { isValid: true };
};

/**
 * 氏名のバリデーション（空でないこと）
 */
export const validateName = (name: string): ValidationResult => {
  if (!name) {
    return { isValid: false, error: '氏名を入力してください' };
  }
  if (name.trim().length === 0) {
    return { isValid: false, error: '氏名を入力してください' };
  }
  return { isValid: true };
};

/**
 * 組織コードのバリデーション
 */
export const validateOrganizationCode = (code: string): ValidationResult => {
  if (!code) {
    return { isValid: false, error: '組織コードを入力してください' };
  }
  if (code.trim().length === 0) {
    return { isValid: false, error: '組織コードを入力してください' };
  }
  return { isValid: true };
};

/**
 * 年休申請日のバリデーション（未来日のみ）
 */
export const validateVacationDate = (date: string): ValidationResult => {
  if (!date) {
    return { isValid: false, error: '年休取得希望日を入力してください' };
  }

  // 日付文字列を比較するために、YYYY-MM-DD形式で今日の日付を取得（日本時間）
  const today = getJSTDate();
  const todayString = formatDateToYYYYMMDD(today);

  if (date <= todayString) {
    return { isValid: false, error: '年休取得希望日は未来の日付を指定してください' };
  }

  return { isValid: true };
};

/**
 * 日曜日チェック
 */
export const validateNotSunday = (date: string): ValidationResult => {
  const vacationDate = new Date(date);
  if (vacationDate.getDay() === 0) {
    return { isValid: false, error: '日曜日は年休申請できません' };
  }
  return { isValid: true };
};

/**
 * 土曜日のPMチェック
 */
export const validateSaturdayPeriod = (date: string, period: string): ValidationResult => {
  const vacationDate = new Date(date);
  if (vacationDate.getDay() === 6 && (period === 'pm' || period === 'full_day')) {
    return { isValid: false, error: '土曜日はAMのみ申請可能です' };
  }
  return { isValid: true };
};

/**
 * 備考のバリデーション（任意）
 */
export const validateRemarks = (remarks: string): ValidationResult => {
  // 備考は任意なので、常にtrueを返す
  // 将来的に文字数制限などを追加する場合はここで実装
  return { isValid: true };
};
