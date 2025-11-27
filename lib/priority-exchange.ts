// @ts-nocheck
import { supabase } from './supabase';

/**
 * 優先順位とレベルを交換
 * @param applicationId1 交換対象の申請1のID
 * @param applicationId2 交換対象の申請2のID
 * @param adminStaffId 交換を実行する管理者の職員ID
 * @returns 成功/失敗の結果
 */
export const exchangePriorityAndLevel = async (
    applicationId1: number,
    applicationId2: number,
    adminStaffId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. 両方の申請を取得
        // @ts-ignore - Supabase type inference issue
        const { data: app1, error: error1 } = await supabase
            .from('application')
            .select('id, vacation_date, level, priority, status')
            .eq('id', applicationId1)
            .single();

        // @ts-ignore - Supabase type inference issue
        const { data: app2, error: error2 } = await supabase
            .from('application')
            .select('id, vacation_date, level, priority, status')
            .eq('id', applicationId2)
            .single();

        if (error1 || error2 || !app1 || !app2) {
            return { success: false, error: '申請の取得に失敗しました' };
        }

        // 2. バリデーション
        if (app1.status !== 'after_lottery' || app2.status !== 'after_lottery') {
            return { success: false, error: '抽選後(after_lottery)ステータスの申請のみ交換可能です' };
        }

        if (app1.vacation_date !== app2.vacation_date) {
            return { success: false, error: '同じ日付の申請のみ交換可能です' };
        }

        if (app1.status === 'confirmed' || app2.status === 'confirmed') {
            return { success: false, error: '確定済みの申請は交換できません' };
        }

        if (app1.priority === null || app2.priority === null) {
            return { success: false, error: '順位が設定されていない申請は交換できません' };
        }

        // 3. 交換実行
        // @ts-ignore - Supabase type inference issue
        const { error: updateError1 } = await supabase
            .from('application')
            .update({
                priority: app2.priority,
                level: app2.level,
                updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId1);

        // @ts-ignore - Supabase type inference issue
        const { error: updateError2 } = await supabase
            .from('application')
            .update({
                priority: app1.priority,
                level: app1.level,
                updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId2);

        if (updateError1 || updateError2) {
            return { success: false, error: '申請の更新に失敗しました' };
        }

        // 4. 履歴を記録
        // @ts-ignore - Supabase type inference issue
        const { error: logError } = await supabase
            .from('priority_exchange_log')
            .insert({
                application_id_1: applicationId1,
                application_id_2: applicationId2,
                before_priority_1: app1.priority,
                before_priority_2: app2.priority,
                before_level_1: app1.level,
                before_level_2: app2.level,
                after_priority_1: app2.priority,
                after_priority_2: app1.priority,
                after_level_1: app2.level,
                after_level_2: app1.level,
                exchanged_by_staff_id: adminStaffId,
            });

        if (logError) {
            console.error('Failed to log exchange:', logError);
            // ログの記録に失敗しても交換自体は成功とする
        }

        return { success: true };
    } catch (error) {
        console.error('Error exchanging priority and level:', error);
        return { success: false, error: '予期しないエラーが発生しました' };
    }
};
