import { getFirestore, serverTimestamp } from '@react-native-firebase/firestore';

const db = getFirestore();

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_UPDATE';

interface AuditLog {
  actionByUid: string;
  actionByEmail: string;
  actionType: AuditActionType;
  collectionName: string;
  documentId?: string;
  details: string;
}

export const AuditService = {
  /**
   * Logs an administrative action to Firestore.
   */
  async logAction(logData: AuditLog): Promise<void> {
    try {
      await db.collection('audit_logs').add({
        ...logData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('[AuditService] Failed to log action:', error);
      // We don't throw here to avoid breaking the main operation if logging fails.
    }
  }
};
