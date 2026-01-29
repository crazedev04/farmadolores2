import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

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
};

export type Emergencia = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  image: string;
  detail: string;
  gps?: FirebaseFirestoreTypes.GeoPoint;
};

export type RootStackParamList = {
  Home: undefined;
  Farmacias: undefined;
  Emergencias: undefined;
  Admin: undefined;
  ActualizarHorarios: undefined;
  ActualizarTurnos: undefined;
  BottomTabs: undefined;
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
  App: undefined;
  Auth: undefined;
  Drawer: undefined;
  PrimeroAuxilios: undefined;
  Local: undefined;
  LocalDetail: { local: Local };
  Help: undefined;
  ReportProblem: undefined;
  EditProfile: undefined;
};
