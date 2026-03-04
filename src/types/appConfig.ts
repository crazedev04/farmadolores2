export type HomeConfig = {
  newsEnabled?: boolean;
  tipsEnabled?: boolean;
  promosEnabled?: boolean;
  newsOrder?: 'newest' | 'oldest';
  tipsOrder?: 'newest' | 'oldest';
  promosOrder?: 'newest' | 'oldest';
  speedThresholdMps?: number;
  distanceDisplayMode?: 'auto' | 'km' | 'min';
};

export type MaintenanceConfig = {
  enabled?: boolean;
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'error';
  ctaText?: string;
  ctaUrl?: string;
};

export type NotificationPreferences = {
  notificationsEnabled: boolean;
  channels: {
    updates: boolean;
    turno: boolean;
    promo: boolean;
  };
};

export type AdminActionLog = {
  actorUid: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt?: unknown;
};

export type AccountDeletionState = {
  deleteStatus: 'none' | 'requested' | 'scheduled' | 'deleted';
  deleteRequestedAt?: unknown;
  deleteAfterDays?: number;
};

export type DataReport = {
  id: string;
  reporterUid: string;
  reporterEmail?: string;
  entityType: 'farmacia' | 'emergencia' | 'local';
  entityId: string;
  entityName?: string;
  reason: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  createdAt?: unknown;
  resolvedAt?: unknown;
};
