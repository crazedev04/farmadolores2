import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';

const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Panel admin</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText || colors.placeholderText }]}>Gestion rapida de contenido y datos.</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Icon name="shield-check-outline" size={18} color={colors.text} />
          <Text style={[styles.headerBadgeText, { color: colors.text }]}>Admin</Text>
        </View>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.buttonBackground }]}
          onPress={() => navigation.navigate('AdminFarmacias')}
        >
          <Icon name="plus-circle-outline" size={22} color={colors.buttonText || '#fff'} />
          <Text style={[styles.quickText, { color: colors.buttonText || '#fff' }]}>Agregar farmacia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.buttonBackground }]}
          onPress={() => navigation.navigate('AdminEmergenciasCrud')}
        >
          <Icon name="plus-circle-outline" size={22} color={colors.buttonText || '#fff'} />
          <Text style={[styles.quickText, { color: colors.buttonText || '#fff' }]}>Agregar emergencia</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.buttonBackground }]}
          onPress={() => navigation.navigate('AdminLocales')}
        >
          <Icon name="plus-circle-outline" size={22} color={colors.buttonText || '#fff'} />
          <Text style={[styles.quickText, { color: colors.buttonText || '#fff' }]}>Agregar negocio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: colors.buttonBackground }]}
          onPress={() => navigation.navigate('AdminPrimerosAuxilios')}
        >
          <Icon name="plus-circle-outline" size={22} color={colors.buttonText || '#fff'} />
          <Text style={[styles.quickText, { color: colors.buttonText || '#fff' }]}>Agregar guia</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestion</Text>
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('ActualizarHorarios')}
        >
          <Icon name="calendar-month-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Horarios</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Actualizar horarios de farmacias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('ActualizarTurnos')}
        >
          <Icon name="calendar-clock" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Turnos</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Editar turnos de farmacias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminFarmacias')}
        >
          <Icon name="hospital-box-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Farmacias</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Agregar o eliminar farmacias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminEmergenciasCrud')}
        >
          <Icon name="car-emergency" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Emergencias</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Agregar o eliminar emergencias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminLocales')}
        >
          <Icon name="storefront-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Negocios</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Agregar o eliminar locales.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminPrimerosAuxilios')}
        >
          <Icon name="medical-bag" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Primeros auxilios</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Cargar y editar guias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminEmergencias')}
        >
          <Icon name="alert-decagram-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Badges</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Configurar badges de emergencias.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminHomeConfig')}
        >
          <Icon name="home-variant-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Config Home</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Banners, promos y links.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminSuggestions')}
        >
          <Icon name="message-alert-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Sugerencias</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Ver mensajes de usuarios.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminAnalytics')}
        >
          <Icon name="chart-line" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Analytics</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Ver metricas clave.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminAccountRequests')}
        >
          <Icon name="account-cog-outline" size={26} color={colors.text} />
          <Text style={[styles.gridTitle, { color: colors.text }]}>Cuentas</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText || colors.placeholderText }]}>Solicitudes y reactivacion.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminPanelScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
