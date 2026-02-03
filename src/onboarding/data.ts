import { AnimationObject } from 'lottie-react-native';

export interface OnboardingData {
  id: number;
  animation: AnimationObject;
  title: string;
  subtitle: string;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  lottieScale?: number;
}

const data: OnboardingData[] = [
  {
    id: 1,
    animation: require('../assets/animations/1.json'),
    title: 'Farmacia de turno al instante',
    subtitle: 'Encuentra la mas cercana con un solo toque y datos siempre actualizados.',
    textColor: '#0F172A',
    accentColor: '#1E9E8B',
    backgroundColor: '#E6F7F4',
    lottieScale: 1.5,
  },
  {
    id: 2,
    animation: require('../assets/animations/2.json'),
    title: 'Alertas utiles',
    subtitle: 'Recibi avisos de turnos, emergencias y novedades de la ciudad.',
    textColor: '#0F172A',
    accentColor: '#2B6EE8',
    backgroundColor: '#E9F2FF',
    lottieScale: 1.5,
  },
  {
    id: 3,
    animation: require('../assets/animations/3.json'),
    title: 'Permisos necesarios',
    subtitle: 'Ubicacion y notificaciones para mostrarte la info correcta.',
    textColor: '#0F172A',
    accentColor: '#F43F5E',
    backgroundColor: '#FFECEF',
    lottieScale: 0.85,
  },
];

export default data;
