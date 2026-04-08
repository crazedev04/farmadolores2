import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const functionsInstance = getFunctions();

type AdminAccountActionInput = {
  uid: string;
  requestId?: string;
  reason?: string;
};

type AdminResponse = {
  ok?: boolean;
  sent?: number;
  message?: string;
};

const invoke = async (name: string, payload: Record<string, unknown>): Promise<AdminResponse | undefined> => {
  const callable = httpsCallable(functionsInstance, name);
  const response = await callable(payload);
  return response?.data as AdminResponse | undefined;
};

export const adminReactivateAccount = async ({ uid, requestId }: AdminAccountActionInput): Promise<void> => {
  await invoke('adminReactivateAccount', { uid, requestId: requestId || null });
};

export const adminDeleteUserData = async ({ uid, requestId, reason }: AdminAccountActionInput): Promise<void> => {
  await invoke('adminDeleteUserData', {
    uid,
    requestId: requestId || null,
    reason: reason || '',
  });
};

export const adminSendBroadcast = async (title: string, body: string, options?: { type?: string }): Promise<AdminResponse | undefined> => {
  const result = await invoke('adminSendBroadcast', {
    title,
    body,
    type: options?.type || 'admin_broadcast',
  });
  return result;
};
