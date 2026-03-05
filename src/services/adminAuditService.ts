import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

type AdminAuditInput = {
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
};

const functionsInstance = getFunctions();

export const writeAdminAuditLog = async (input: AdminAuditInput) => {
  const callable = httpsCallable(functionsInstance, 'adminWriteAuditLog');
  await callable({
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
  });
};

export const writeAdminAuditLogSafe = async (input: AdminAuditInput) => {
  try {
    await writeAdminAuditLog(input);
    return true;
  } catch {
    // Non-blocking on purpose. CRUD should not fail because of audit transport.
    return false;
  }
};
