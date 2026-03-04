import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const functionsInstance = getFunctions();

type AdminAccountActionInput = {
  uid: string;
  requestId?: string;
  reason?: string;
};

const invoke = async (name: string, payload: Record<string, unknown>) => {
  const callable = httpsCallable(functionsInstance, name);
  const response = await callable(payload);
  return response?.data as { ok?: boolean } | undefined;
};

export const adminReactivateAccount = async ({ uid, requestId }: AdminAccountActionInput) => {
  await invoke('adminReactivateAccount', { uid, requestId: requestId || null });
};

export const adminDeleteUserData = async ({ uid, requestId, reason }: AdminAccountActionInput) => {
  await invoke('adminDeleteUserData', {
    uid,
    requestId: requestId || null,
    reason: reason || '',
  });
};
