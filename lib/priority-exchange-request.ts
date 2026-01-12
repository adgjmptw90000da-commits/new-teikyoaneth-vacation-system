// @ts-nocheck
import { supabase } from './supabase';
import { exchangePriorityAndLevel } from './priority-exchange';

// 交換可能なステータス
const EXCHANGEABLE_STATUSES = ['after_lottery', 'confirmed', 'withdrawn'];

/**
 * 交換申請を作成
 */
export const createExchangeRequest = async (
  requesterApplicationId: number,
  targetApplicationId: number,
  requesterStaffId: string,
  requestReason?: string
): Promise<{ success: boolean; error?: string; requestId?: number }> => {
  try {
    // 両方の申請を取得
    const { data: requesterApp, error: error1 } = await supabase
      .from('application')
      .select('id, staff_id, vacation_date, level, priority, status')
      .eq('id', requesterApplicationId)
      .single();

    const { data: targetApp, error: error2 } = await supabase
      .from('application')
      .select('id, staff_id, vacation_date, level, priority, status')
      .eq('id', targetApplicationId)
      .single();

    if (error1 || error2 || !requesterApp || !targetApp) {
      return { success: false, error: '申請の取得に失敗しました' };
    }

    // バリデーション
    if (requesterApp.staff_id !== requesterStaffId) {
      return { success: false, error: '自分の申請のみ交換申請を作成できます' };
    }

    if (requesterApp.staff_id === targetApp.staff_id) {
      return { success: false, error: '自分自身の申請同士は交換できません' };
    }

    if (!EXCHANGEABLE_STATUSES.includes(requesterApp.status) || !EXCHANGEABLE_STATUSES.includes(targetApp.status)) {
      return { success: false, error: '交換可能なステータスの申請のみ交換できます' };
    }

    if (requesterApp.vacation_date !== targetApp.vacation_date) {
      return { success: false, error: '同じ日付の申請のみ交換可能です' };
    }

    if (requesterApp.priority === null || targetApp.priority === null) {
      return { success: false, error: '順位が設定されていない申請は交換できません' };
    }

    // 既存の申請がないか確認
    const { data: existingRequest, error: existingError } = await supabase
      .from('priority_exchange_request')
      .select('id')
      .or(`and(requester_application_id.eq.${requesterApplicationId},target_application_id.eq.${targetApplicationId}),and(requester_application_id.eq.${targetApplicationId},target_application_id.eq.${requesterApplicationId})`)
      .in('target_response', ['pending', 'accepted'])
      .in('admin_response', ['pending']);

    if (existingError) {
      console.error('Error checking existing request:', existingError);
      return { success: false, error: '既存申請の確認中にエラーが発生しました' };
    }

    if (existingRequest && existingRequest.length > 0) {
      return { success: false, error: '既に同じ申請ペアの交換申請が存在します' };
    }

    // 交換申請を作成
    const { data: newRequest, error: insertError } = await supabase
      .from('priority_exchange_request')
      .insert({
        requester_application_id: requesterApplicationId,
        requester_staff_id: requesterStaffId,
        target_application_id: targetApplicationId,
        target_staff_id: targetApp.staff_id,
        request_reason: requestReason,
        target_notified: false, // 相手に通知が必要
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting exchange request:', insertError);
      return { success: false, error: `交換申請の作成に失敗しました: ${insertError.message}` };
    }
    if (!newRequest) {
      return { success: false, error: '交換申請の作成に失敗しました（データなし）' };
    }

    return { success: true, requestId: newRequest.id };
  } catch (error) {
    console.error('Error creating exchange request:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * 相手ユーザーが交換申請に応答（承諾/拒否）
 */
export const respondToExchangeRequest = async (
  requestId: number,
  targetStaffId: string,
  response: 'accepted' | 'rejected',
  rejectReason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 交換申請を取得
    const { data: request, error: fetchError } = await supabase
      .from('priority_exchange_request')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: '交換申請が見つかりません' };
    }

    // バリデーション
    if (request.target_staff_id !== targetStaffId) {
      return { success: false, error: 'この申請に応答する権限がありません' };
    }

    if (request.target_response !== 'pending') {
      return { success: false, error: '既に応答済みです' };
    }

    // 応答を更新
    const { error: updateError } = await supabase
      .from('priority_exchange_request')
      .update({
        target_response: response,
        target_responded_at: new Date().toISOString(),
        target_reject_reason: response === 'rejected' ? rejectReason : null,
        requester_notified: false, // 申請者に通知が必要
        target_notified: true,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: '応答の更新に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error responding to exchange request:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * 管理者が交換申請を承認
 */
export const adminApproveExchangeRequest = async (
  requestId: number,
  adminStaffId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 交換申請を取得
    const { data: request, error: fetchError } = await supabase
      .from('priority_exchange_request')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: '交換申請が見つかりません' };
    }

    // バリデーション
    if (request.target_response !== 'accepted') {
      return { success: false, error: '相手ユーザーがまだ承諾していません' };
    }

    if (request.admin_response !== 'pending') {
      return { success: false, error: '既に管理者による判定済みです' };
    }

    // 交換を実行
    const exchangeResult = await exchangePriorityAndLevel(
      request.requester_application_id,
      request.target_application_id,
      adminStaffId
    );

    if (!exchangeResult.success) {
      return { success: false, error: exchangeResult.error || '交換の実行に失敗しました' };
    }

    // 承認を記録
    const { error: updateError } = await supabase
      .from('priority_exchange_request')
      .update({
        admin_response: 'approved',
        admin_staff_id: adminStaffId,
        admin_responded_at: new Date().toISOString(),
        executed: true,
        executed_at: new Date().toISOString(),
        requester_notified: false, // 両者に通知
        target_notified: false,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: '承認の記録に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving exchange request:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * 管理者が交換申請を却下
 */
export const adminRejectExchangeRequest = async (
  requestId: number,
  adminStaffId: string,
  rejectReason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 交換申請を取得
    const { data: request, error: fetchError } = await supabase
      .from('priority_exchange_request')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: '交換申請が見つかりません' };
    }

    if (request.admin_response !== 'pending') {
      return { success: false, error: '既に管理者による判定済みです' };
    }

    // 却下を記録
    const { error: updateError } = await supabase
      .from('priority_exchange_request')
      .update({
        admin_response: 'rejected',
        admin_staff_id: adminStaffId,
        admin_responded_at: new Date().toISOString(),
        admin_reject_reason: rejectReason,
        requester_notified: false, // 両者に通知
        target_notified: false,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: '却下の記録に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting exchange request:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * ユーザーの交換申請一覧を取得（今日以降のみ）
 */
export const getExchangeRequestsForUser = async (staffId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 受け取った交換申請（自分がtarget）
    const { data: receivedRequests, error: error1 } = await supabase
      .from('priority_exchange_request')
      .select(`
        *,
        requester_application:requester_application_id(id, vacation_date, level, priority, status),
        target_application:target_application_id(id, vacation_date, level, priority, status),
        requester:requester_staff_id(staff_id, name)
      `)
      .eq('target_staff_id', staffId)
      .order('requested_at', { ascending: false });

    // 送信した交換申請（自分がrequester）
    const { data: sentRequests, error: error2 } = await supabase
      .from('priority_exchange_request')
      .select(`
        *,
        requester_application:requester_application_id(id, vacation_date, level, priority, status),
        target_application:target_application_id(id, vacation_date, level, priority, status),
        target:target_staff_id(staff_id, name)
      `)
      .eq('requester_staff_id', staffId)
      .order('requested_at', { ascending: false });

    if (error1 || error2) {
      console.error('Error fetching exchange requests:', error1 || error2);
      return { receivedRequests: [], sentRequests: [] };
    }

    // 今日以降の日付のみフィルター
    const filteredReceived = receivedRequests?.filter(r =>
      r.requester_application?.vacation_date >= today
    ) || [];
    const filteredSent = sentRequests?.filter(r =>
      r.requester_application?.vacation_date >= today
    ) || [];

    return {
      receivedRequests: filteredReceived,
      sentRequests: filteredSent,
    };
  } catch (error) {
    console.error('Error fetching exchange requests for user:', error);
    return { receivedRequests: [], sentRequests: [] };
  }
};

/**
 * 管理者用：承認待ちの交換申請一覧を取得
 */
export const getPendingExchangeRequestsForAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('priority_exchange_request')
      .select(`
        *,
        requester_application:requester_application_id(id, vacation_date, level, priority, status),
        target_application:target_application_id(id, vacation_date, level, priority, status),
        requester:requester_staff_id(staff_id, name),
        target:target_staff_id(staff_id, name)
      `)
      .eq('target_response', 'accepted')
      .eq('admin_response', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending exchange requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching pending exchange requests for admin:', error);
    return [];
  }
};

/**
 * 同日の他者申請を取得（交換候補）
 */
export const getSameDateApplications = async (vacationDate: string, excludeStaffId: string) => {
  try {
    const { data, error } = await supabase
      .from('application')
      .select(`
        id,
        staff_id,
        vacation_date,
        level,
        priority,
        status,
        user:staff_id(name)
      `)
      .eq('vacation_date', vacationDate)
      .neq('staff_id', excludeStaffId)
      .in('status', EXCHANGEABLE_STATUSES)
      .not('priority', 'is', null)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching same date applications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching same date applications:', error);
    return [];
  }
};

/**
 * ユーザーの交換可能な申請一覧を取得（今日以降のみ）
 */
export const getExchangeableApplicationsForUser = async (staffId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('application')
      .select('id, vacation_date, level, priority, status')
      .eq('staff_id', staffId)
      .in('status', EXCHANGEABLE_STATUSES)
      .not('priority', 'is', null)
      .gte('vacation_date', today)
      .order('vacation_date', { ascending: true });

    if (error) {
      console.error('Error fetching exchangeable applications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching exchangeable applications for user:', error);
    return [];
  }
};

/**
 * 通知を確認済みにする
 */
export const markExchangeRequestNotified = async (
  requestId: number,
  staffId: string,
  isRequester: boolean
): Promise<{ success: boolean }> => {
  try {
    const updateField = isRequester ? 'requester_notified' : 'target_notified';

    const { error } = await supabase
      .from('priority_exchange_request')
      .update({ [updateField]: true })
      .eq('id', requestId)
      .eq(isRequester ? 'requester_staff_id' : 'target_staff_id', staffId);

    return { success: !error };
  } catch (error) {
    console.error('Error marking exchange request notified:', error);
    return { success: false };
  }
};
