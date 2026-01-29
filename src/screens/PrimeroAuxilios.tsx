import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, FlatList } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';

type GuideItem = {
  id: string;
  title: string;
  description: string;
  url: string; // URL del video o guía
};

const guides: GuideItem[] = [
    {
      id: '1',
      title: 'RCP Básico',
      description: 'Aprende cómo realizar maniobras de RCP en caso de emergencia.',
      url: 'https://www.youtube.com/watch?v=dFSiqFTuQxU' // Fuente: YouTube
    },
    {
      id: '2',
      title: 'Manejo de Heridas',
      description: 'Guía paso a paso sobre cómo tratar heridas y cortes.',
      url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wounds-and-bleeding.html' // Cruz Roja
    },
    {
      id: '3',
      title: 'Cómo Tratar Quemaduras',
      description: 'Instrucciones para tratar quemaduras de diferentes grados.',
      url: 'https://www.mayoclinic.org/first-aid/first-aid-burns/basics/art-20056649' // Mayo Clinic
    },
    {
      id: '4',
      title: 'Primeros Auxilios en Caso de Fracturas',
      description: 'Pasos para estabilizar fracturas y heridas óseas.',
      url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/fractures.html' // Cruz Roja
    },
    {
      id: '5',
      title: 'Manejo de Shock',
      description: 'Cómo reconocer y tratar el shock en una emergencia.',
      url: 'https://www.mayoclinic.org/first-aid/first-aid-shock/basics/art-20056620' // Mayo Clinic
    },
    {
      id: '6',
      title: 'Tratamiento de Mordeduras y Picaduras',
      description: 'Cómo tratar mordeduras y picaduras de insectos o animales.',
      url: 'https://www.cdc.gov/disasters/snakebite.html' // CDC
    },
    {
      id: '7',
      title: 'Cómo Actuar en Caso de Asfixia',
      description: 'Pasos a seguir para ayudar a una persona que se está asfixiando.',
      url: 'https://www.nhs.uk/conditions/choking/' // NHS
    },
    {
      id: '8',
      title: 'Primeros Auxilios para Desmayos',
      description: 'Qué hacer cuando alguien se desmaya.',
      url: 'https://www.healthline.com/health/first-aid/fainting' // Healthline
    },
    {
      id: '9',
      title: 'Tratamiento de Hemorragias',
      description: 'Cómo detener y tratar hemorragias.',
      url: 'https://www.mayoclinic.org/first-aid/first-aid-bleeding/basics/art-20056661' // Mayo Clinic
    },
    {
      id: '10',
      title: 'Primeros Auxilios para Intoxicaciones',
      description: 'Acciones a seguir en caso de intoxicación por sustancias tóxicas.',
      url: 'https://www.webmd.com/first-aid/poisoning-treatment' // WebMD
    },
    {
      id: '11',
      title: 'Tratamiento de Golpes y Contusiones',
      description: 'Cómo tratar golpes y contusiones para reducir el dolor y la inflamación.',
      url: 'https://www.webmd.com/first-aid/bruises-treatment' // WebMD
    },
    {
      id: '12',
      title: 'Cómo Reconocer y Tratar Convulsiones',
      description: 'Qué hacer si alguien está teniendo una convulsión.',
      url: 'https://www.epilepsy.com/learn/seizure-first-aid-and-safety' // Epilepsy Foundation
    },
    {
      id: '13',
      title: 'Primeros Auxilios para Quemaduras Químicas',
      description: 'Instrucciones para tratar quemaduras causadas por productos químicos.',
      url: 'https://www.healthline.com/health/chemical-burn' // Healthline
    },
    {
      id: '14',
      title: 'Tratamiento de Lesiones Oculares',
      description: 'Cómo tratar lesiones en los ojos.',
      url: 'https://www.aao.org/eye-health/tips-prevention/injuries' // American Academy of Ophthalmology
    },
    {
      id: '15',
      title: 'Cómo Tratar Cortes y Raspones',
      description: 'Guía para el tratamiento de cortes y raspones superficiales.',
      url: 'https://www.healthline.com/health/first-aid/cuts-or-lacerations' // Healthline
    },
    {
      id: '16',
      title: 'Manejo de Problemas Respiratorios',
      description: 'Qué hacer en caso de dificultades respiratorias o ataques de asma.',
      url: 'https://www.webmd.com/asthma/guide/asthma-first-aid' // WebMD
    },
    {
      id: '17',
      title: 'Primeros Auxilios en Caso de Alergias Severas',
      description: 'Cómo reconocer y tratar reacciones alérgicas graves.',
      url: 'https://www.healthline.com/health/allergies/anaphylaxis' // Healthline
    },
    {
      id: '18',
      title: 'Tratamiento de Lesiones por Caídas',
      description: 'Qué hacer si alguien se lesiona tras una caída.',
      url: 'https://www.nsc.org/community-safety/safety-topics/elderly-falls' // National Safety Council
    },
    {
      id: '19',
      title: 'Primeros Auxilios en Caso de Ingestión de Cuerpos Extraños',
      description: 'Cómo actuar si alguien ingiere objetos no comestibles.',
      url: 'https://www.mayoclinic.org/first-aid/first-aid-foreign-object/basics/art-20056656' // Mayo Clinic
    },
    {
      id: '20',
      title: 'Cómo Actuar en Caso de Emergencias con Niños',
      description: 'Guía específica para manejar emergencias con niños.',
      url: 'https://www.healthychildren.org/English/safety-prevention/at-home/Pages/Emergency-Situations.aspx' // HealthyChildren.org
    },
  ];
  

const PrimerosAuxilios = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  const handlePress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Error al abrir la URL:', err));
  };

  const RenderItem = ({ item }: { item: GuideItem }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => handlePress(item.url)}>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.text }]}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Guías de Primeros Auxilios</Text>
      <FlatList
        data={guides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RenderItem item={item} />}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        />
    </View>
    <AdBanner size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
   
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
  },
});

export default PrimerosAuxilios;
