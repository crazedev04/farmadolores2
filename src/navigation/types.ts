import { NavigatorScreenParams } from '@react-navigation/native';
import { Farmacia, Emergencia, Local } from '../types/navigationTypes';

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
};
