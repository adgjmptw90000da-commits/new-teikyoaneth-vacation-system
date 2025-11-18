// 認証関連のユーティリティ関数

export interface User {
  staff_id: string;
  name: string;
  is_admin: boolean;
}

const USER_STORAGE_KEY = 'user';

/**
 * ユーザー情報をLocalStorageに保存
 */
export const setUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
};

/**
 * ユーザー情報をLocalStorageから取得
 */
export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson) as User;
      } catch (e) {
        console.error('Failed to parse user data:', e);
        return null;
      }
    }
  }
  return null;
};

/**
 * ログアウト（LocalStorageをクリア）
 */
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

/**
 * ログイン状態のチェック
 */
export const isAuthenticated = (): boolean => {
  return getUser() !== null;
};

/**
 * 管理者かどうかのチェック
 */
export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.is_admin || false;
};
