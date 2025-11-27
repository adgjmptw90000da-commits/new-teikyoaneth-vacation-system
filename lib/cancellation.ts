// @ts-nocheck
// キャンセル関連のユーティリティ関数

import { supabase } from './supabase';
import { recalculatePriorities, isCurrentlyInLotteryPeriodForDate } from './application';

/**
 * 年休申請のキャンセルを要求
 * 期間・ステータスに応じて即座にキャンセルまたは承認待ちに設定
 */
export const requestCancellation = async (
  applicationId: number
): Promise<{
  success: boolean;
  error?: string;
  requiresApproval?: boolean;
  pointsWillRecover?: boolean;
}> => {
  try {
    // 1. 申請を取得
    const { data: application, error: fetchError } = await supabase
      .from('application')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: '申請の取得に失敗しました' };
    }

    // 確定済みはキャンセル不可
    if (application.status === 'confirmed') {
      return {
        success: false,
        error: '確定済みの申請はキャンセルできません'
      };
    }

    // キャンセル済み・承認待ち系もキャンセル不可
    if (application.status === 'cancelled' ||
        application.status === 'cancelled_before_lottery' ||
        application.status === 'cancelled_after_lottery' ||
        application.status === 'pending_cancellation' ||
        application.status === 'pending_approval' ||
        application.status === 'withdrawn') {
      return {
        success: false,
        error: 'この申請はキャンセルできません'
      };
    }

    // 2. 期間判定
    const isInPeriod = await isCurrentlyInLotteryPeriodForDate(
      application.vacation_date
    );

    if (isInPeriod) {
      // ケース1: 期間内 → 即座にキャンセル、得点回復
      const { error: updateError } = await supabase
        .from('application')
        .update({
          status: 'cancelled_before_lottery',
          priority: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) {
        return { success: false, error: '申請の更新に失敗しました' };
      }

      await recalculatePriorities(application.vacation_date);

      return {
        success: true,
        requiresApproval: false,
        pointsWillRecover: true
      };
    } else {
      if (application.status === 'before_lottery') {
        // ケース2: 期間外・抽選前 → 承認待ち
        const { error: updateError } = await supabase
          .from('application')
          .update({
            status: 'pending_cancellation',
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) {
          return { success: false, error: '申請の更新に失敗しました' };
        }

        const { error: insertError } = await supabase
          .from('cancellation_request')
          .insert({
            application_id: applicationId,
            status: 'pending'
          });

        if (insertError) {
          // キャンセル申請記録の作成に失敗した場合は、ステータスを戻す
          await supabase
            .from('application')
            .update({ status: 'before_lottery' })
            .eq('id', applicationId);
          return { success: false, error: 'キャンセル申請の記録に失敗しました' };
        }

        return {
          success: true,
          requiresApproval: true,
          pointsWillRecover: true
        };
      } else if (application.status === 'after_lottery') {
        // ケース3: 抽選後 → 即座にキャンセル、得点回復なし
        const { error: updateError } = await supabase
          .from('application')
          .update({
            status: 'cancelled_after_lottery',
            priority: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) {
          return { success: false, error: '申請の更新に失敗しました' };
        }

        await recalculatePriorities(application.vacation_date);

        return {
          success: true,
          requiresApproval: false,
          pointsWillRecover: false
        };
      }
    }

    return { success: false, error: '想定外のステータスです' };
  } catch (error) {
    console.error('Error requesting cancellation:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * キャンセル申請を承認
 */
export const approveCancellation = async (
  cancellationRequestId: number,
  adminStaffId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. cancellation_requestを取得
    const { data: request, error: fetchError } = await supabase
      .from('cancellation_request')
      .select('*')
      .eq('id', cancellationRequestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'キャンセル申請が見つかりません' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: '既に処理済みの申請です' };
    }

    // 2. applicationを cancelled_before_lottery に更新
    const { error: updateAppError } = await supabase
      .from('application')
      .update({
        status: 'cancelled_before_lottery',
        priority: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.application_id);

    if (updateAppError) {
      return { success: false, error: '申請の更新に失敗しました' };
    }

    // 3. cancellation_request を承認済みに
    const { error: updateReqError } = await supabase
      .from('cancellation_request')
      .update({
        status: 'approved',
        reviewed_by_staff_id: adminStaffId,
        reviewed_at: new Date().toISOString(),
        user_notified: false
      })
      .eq('id', cancellationRequestId);

    if (updateReqError) {
      return { success: false, error: 'キャンセル申請の更新に失敗しました' };
    }

    // 4. 優先順位再計算
    const { data: app } = await supabase
      .from('application')
      .select('vacation_date')
      .eq('id', request.application_id)
      .single();

    if (app) {
      await recalculatePriorities(app.vacation_date);
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving cancellation:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * キャンセル申請を却下
 */
export const rejectCancellation = async (
  cancellationRequestId: number,
  adminStaffId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. cancellation_requestを取得
    const { data: request, error: fetchError } = await supabase
      .from('cancellation_request')
      .select('*')
      .eq('id', cancellationRequestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'キャンセル申請が見つかりません' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: '既に処理済みの申請です' };
    }

    // 2. applicationを before_lottery に戻す
    const { error: updateAppError } = await supabase
      .from('application')
      .update({
        status: 'before_lottery',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.application_id);

    if (updateAppError) {
      return { success: false, error: '申請の更新に失敗しました' };
    }

    // 3. cancellation_request を却下済みに
    const { error: updateReqError } = await supabase
      .from('cancellation_request')
      .update({
        status: 'rejected',
        reviewed_by_staff_id: adminStaffId,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || null,
        user_notified: false
      })
      .eq('id', cancellationRequestId);

    if (updateReqError) {
      return { success: false, error: 'キャンセル申請の更新に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting cancellation:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};
