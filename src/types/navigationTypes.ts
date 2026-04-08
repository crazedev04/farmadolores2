import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { NavigatorScreenParams } from '@react-navigation/native';

export type HorarioFranja = {
  abre: string;
  cierra: string;
};

export type HorariosPorDia = Partial<
  Record<'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo', HorarioFranja[]>
>;

export type Farmacia = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  image: string;
  detail: string;
  gallery?: string[];
  horarios?: HorariosPorDia;
  horarioAperturaMañana?: FirebaseFirestoreTypes.Timestamp;
  horarioCierreMañana?: FirebaseFirestoreTypes.Timestamp;
  horarioAperturaTarde?: FirebaseFirestoreTypes.Timestamp;
  horarioCierreTarde?: FirebaseFirestoreTypes.Timestamp;
  turn?: FirebaseFirestoreTypes.Timestamp[];
  gps: FirebaseFirestoreTypes.GeoPoint;
};

export type FarmaciaConTiempos = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  horarioAperturaMañana?: FirebaseFirestoreTypes.Timestamp;
  horarioCierreMañana?: FirebaseFirestoreTypes.Timestamp;
  horarioAperturaTarde?: FirebaseFirestoreTypes.Timestamp;
  horarioCierreTarde?: FirebaseFirestoreTypes.Timestamp;
  image: string;
  detail: string;
  gallery?: string[];
  turn?: FirebaseFirestoreTypes.Timestamp[];
  horarios?: HorariosPorDia;
};

export type Local = {
  id: string;
  name: string;
  descrip: string;
  image: string;
  direccion: string;
  tel: string;
  url: string;
  gallery?: string[];
};

export type Emergencia = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  image: string;
  detail: string;
  gps?: FirebaseFirestoreTypes.GeoPoint;
  guardiaEnabled?: boolean;
  badge?: {
    enabled?: boolean;
    text?: string;
    type?: 'urgencias' | 'alerta' | 'info';
    icon?: string;
  };
};

/**
 * Parameter list for the Authentication flow.
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Welcome: undefined;
  Onboarding: undefined;
};

/**
 * Parameter list for the Admin section of the app.
 */
export type AdminStackParamList = {
  AdminPanel: undefined; // The dashboard
  AdminHomeConfig: undefined;
  AdminSuggestions: undefined;
  AdminEmergencias: undefined;
  AdminFarmacias: undefined;
  AdminEmergenciasCrud: undefined;
  AdminLocales: undefined;
  AdminPrimerosAuxilios: undefined;
  AdminAnalytics: undefined;
  AdminAccountRequests: undefined;
  AdminDataReports: undefined;
  ActualizarHorarios: undefined;
  ActualizarTurnos: undefined;
  AdminPushBroadcast: undefined;
};

/**
 * Parameter list for the Main Application flow.
 */
export type MainStackParamList = {
  BottomTabs: undefined;
  Home: undefined;
  Farmacias: undefined;
  Emergencias: undefined;
  Detail: { farmacia: Farmacia };
  DetailE: { emergencia: Emergencia };
  Local: undefined;
  LocalDetail: { local: Local };
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Help: undefined;
  ReportProblem: {
    entityType?: 'farmacia' | 'emergencia' | 'local';
    entityId?: string;
    entityName?: string;
  } | undefined;
  Suggestions: undefined;
  Favorites: undefined;
  WebView: { url: string; title?: string };
  PrimeroAuxilios: undefined;
  AdminPushBroadcast: undefined;
};

/**
 * The Root Stack that coordinates Auth, Main and Admin flows.
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<MainStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
  AccountDisabled: undefined;
  AdminPushBroadcast: undefined;
  AdminHomeConfig: undefined;
  AdminSuggestions: undefined;
  AdminEmergencias: undefined;
  AdminFarmacias: undefined;
  AdminEmergenciasCrud: undefined;
  AdminLocales: undefined;
  AdminPrimerosAuxilios: undefined;
  AdminAnalytics: undefined;
  AdminAccountRequests: undefined;
  AdminDataReports: undefined;
  ActualizarHorarios: undefined;
  ActualizarTurnos: undefined;
  BottomTabs: undefined;
  Home: undefined;
  Farmacias: undefined;
  Emergencias: undefined;
  Detail: { farmacia: Farmacia };
  DetailE: { emergencia: Emergencia };
  Permission: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Turno: undefined;
  Settings: undefined;
  Welcome: undefined;
  Onboarding: undefined;
  Drawer: undefined;
  PrimeroAuxilios: undefined;
  Local: undefined;
  LocalDetail: { local: Local };
  Help: undefined;
  ReportProblem:
    | {
        entityType?: 'farmacia' | 'emergencia' | 'local';
        entityId?: string;
        entityName?: string;
      }
    | undefined;
  Suggestions: undefined;
  Favorites: undefined;
  EditProfile: undefined;
  WebView: { url: string; title?: string };
};
