import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from '@react-native-firebase/firestore';
import { writeAdminAuditLogSafe } from '../services/adminAuditService';

const db = getFirestore();

type CrudDocMapper<TItem> = (id: string, data: Record<string, unknown>) => TItem;

type UseAdminCollectionCrudParams<TItem extends { id: string }> = {
  collectionName: string;
  orderByField?: string;
  mapDoc: CrudDocMapper<TItem>;
  targetType: string;
};

type SaveInput = {
  id?: string | null;
  payload: Record<string, unknown>;
  summary: string;
};

type RemoveInput = {
  id: string;
  summary: string;
};

export const useAdminCollectionCrud = <TItem extends { id: string }>(
  params: UseAdminCollectionCrudParams<TItem>
) => {
  const { collectionName, mapDoc, orderByField = 'name', targetType } = params;
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = collection(db, collectionName);
    const q = query(ref, orderBy(orderByField));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((entry) =>
          mapDoc(entry.id, (entry.data() || {}) as Record<string, unknown>)
        );
        setItems(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [collectionName, mapDoc, orderByField]);

  const saveItem = async (input: SaveInput) => {
    setSaving(true);
    try {
      const cleanPayload = Object.fromEntries(
        Object.entries(input.payload).filter(([, value]) => value !== undefined),
      );
      if (input.id) {
        await updateDoc(doc(db, collectionName, input.id), cleanPayload);
        writeAdminAuditLogSafe({
          action: `${targetType}_update`,
          targetType,
          targetId: input.id,
          summary: input.summary,
        });
        return input.id;
      }

      const created = await addDoc(collection(db, collectionName), cleanPayload);
      writeAdminAuditLogSafe({
        action: `${targetType}_create`,
        targetType,
        targetId: created.id,
        summary: input.summary,
      });
      return created.id;
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (input: RemoveInput) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, collectionName, input.id));
      writeAdminAuditLogSafe({
        action: `${targetType}_delete`,
        targetType,
        targetId: input.id,
        summary: input.summary,
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    loading,
    saving,
    saveItem,
    removeItem,
  };
};
