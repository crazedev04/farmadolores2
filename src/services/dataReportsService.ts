import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  updateDoc,
  doc,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export type DataReportEntityType = 'farmacia' | 'emergencia' | 'local';
export type DataReportStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

type CreateDataReportInput = {
  reporterUid: string;
  reporterEmail?: string | null;
  entityType: DataReportEntityType;
  entityId: string;
  entityName?: string;
  reason: string;
};

export const createDataReport = async (input: CreateDataReportInput) => {
  await addDoc(collection(db, 'dataReports'), {
    reporterUid: input.reporterUid,
    reporterEmail: input.reporterEmail || '',
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName || '',
    reason: input.reason.trim(),
    status: 'open',
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });
};

export const updateDataReportStatus = async (id: string, status: DataReportStatus) => {
  await updateDoc(doc(db, 'dataReports', id), {
    status,
    resolvedAt: status === 'resolved' || status === 'rejected' ? serverTimestamp() : null,
  });
};
