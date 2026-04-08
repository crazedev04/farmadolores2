import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated, TextInput, Alert, ToastAndroid, ActivityIndicator, Platform } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { AdminStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import { useFeatureFlags } from '../services/featureFlags';
import { GlassCard } from '../components/common/GlassCard';
import { getFirestore, onSnapshot, collection, query, where, doc, setDoc } from '@react-native-firebase/firestore';

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

const DashboardButton = ({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  badgeCount = 0 
}: { 
  title: string, 
  subtitle: string, 
  icon: string, 
  onPress: () => void,
  badgeCount?: number
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.gridCardWrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      <GlassCard style={styles.gridCardOuter} contentStyle={styles.gridCardInner} blurAmount={theme.dark ? 20 : 10}>
        <View style={styles.gridHeader}>
          <Icon name={icon} size={28} color={colors.primary} />
          {badgeCount > 0 && (
            <View style={styles.badgeAlert}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.gridTexts}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.gridSubtitle, { color: colors.mutedText }]} numberOfLines={2}>{subtitle}</Text>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<AdminStackParamList>>();
  const { theme } = useTheme();
  const colors = theme.colors;
  const flags = useFeatureFlags();

  // Metrics State
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadSuggestions, setUnreadSuggestions] = useState(0);
  const [activeReports, setActiveReports] = useState(0);

  const [minVersion, setMinVersion] = useState('');
  const [loadingVersion, setLoadingVersion] = useState(false);

  useEffect(() => {
    const db = getFirestore();
    
    // Listen to pending account requests
    const qRequests = query(collection(db, 'account_requests'), where('status', '==', 'pending'));
    const unsubReq = onSnapshot(qRequests, snap => setPendingRequests(snap?.size || 0), () => {});

    // Listen to suggestions
    const qSuggestions = query(collection(db, 'suggestions'), where('status', 'in', ['new', 'pending']));
    const unsubSug = onSnapshot(qSuggestions, snap => setUnreadSuggestions(snap?.size || 0), () => {});

    // Listen to reports
    const qReports = query(collection(db, 'data_reports'), where('resolved', '==', false));
    const unsubRep = onSnapshot(qReports, snap => setActiveReports(snap?.size || 0), () => {});

    // Listen to Min App Version
    const unsubVer = onSnapshot(doc(db, 'config', 'app'), snap => {
      const data = snap.data();
      if (data?.minAppVersion) setMinVersion(data.minAppVersion);
    });

    return () => {
      unsubReq();
      unsubSug();
      unsubRep();
      unsubVer();
    };
  }, []);

  const handleUpdateMinVersion = async () => {
    if (!minVersion.match(/^\d+\.\d+\.\d+$/)) {
      Alert.alert('Error', 'Formato de versión inválido. Usá el formato X.Y.Z (ej: 2.0.0)');
      return;
    }

    setLoadingVersion(true);
    try {
      const db = getFirestore();
      // Usamos setDoc con merge:true para que cree el documento si no existe
      await setDoc(doc(db, 'config', 'app'), { minAppVersion: minVersion }, { merge: true });
      if (Platform.OS === 'android') {
        ToastAndroid.show('Versión mínima actualizada', ToastAndroid.SHORT);
      } else {
        Alert.alert('Éxito', 'Versión mínima actualizada correctamente.');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Error', 'No se pudo actualizar la versión: ' + errorMessage);
    } finally {
      setLoadingVersion(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Command Center</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Operaciones en tiempo real.</Text>
        </View>
        <GlassCard style={styles.headerBadgeOuter} contentStyle={styles.headerBadgeInner} blurAmount={15}>
          <Icon name="shield-check" size={18} color={colors.success} />
          <Text style={[styles.headerBadgeText, { color: colors.text }]}>SUDO</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Métricas Activas</Text>
      
      <View style={styles.metricsRow}>
        <GlassCard style={[styles.metricCardOuter, { borderColor: pendingRequests > 0 ? colors.warning : colors.border }]} contentStyle={styles.metricCardInner}>
          <Text style={[styles.metricCount, { color: pendingRequests > 0 ? colors.warning : colors.text }]}>{pendingRequests}</Text>
          <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Cuentas</Text>
        </GlassCard>
        <GlassCard style={[styles.metricCardOuter, { borderColor: unreadSuggestions > 0 ? colors.primary : colors.border }]} contentStyle={styles.metricCardInner}>
          <Text style={[styles.metricCount, { color: unreadSuggestions > 0 ? colors.primary : colors.text }]}>{unreadSuggestions}</Text>
          <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Sugerencias</Text>
        </GlassCard>
        {flags.dataReports && (
          <GlassCard style={[styles.metricCardOuter, { borderColor: activeReports > 0 ? colors.notification : colors.border }]} contentStyle={styles.metricCardInner}>
            <Text style={[styles.metricCount, { color: activeReports > 0 ? colors.notification : colors.text }]}>{activeReports}</Text>
            <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Reportes</Text>
          </GlassCard>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Acciones Principales</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
          onPress={() => navigation.navigate('AdminPushBroadcast')}
        >
          <View style={[styles.quickIconWrap, { backgroundColor: colors.primary }]}>
            <Icon name="broadcast" size={26} color="#fff" />
          </View>
          <View style={styles.quickInfo}>
            <Text style={[styles.quickTitle, { color: colors.text }]}>Broadcast Masivo</Text>
            <Text style={[styles.quickSubtitle, { color: colors.mutedText }]}>Enviar notificación PUSH a todos.</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Operaciones de Datos</Text>
      
      <View style={styles.grid}>
        <DashboardButton 
          title="Horarios" subtitle="Actualizar atención masivamente." icon="calendar-month-outline"
          onPress={() => navigation.navigate('ActualizarHorarios')} 
        />
        <DashboardButton 
          title="Turnos" subtitle="Asignar cronograma mensual." icon="calendar-clock"
          onPress={() => navigation.navigate('ActualizarTurnos')} 
        />
        <DashboardButton 
          title="Farmacias" subtitle="Agregar o modificar datos." icon="hospital-box-outline"
          onPress={() => navigation.navigate('AdminFarmacias')} 
        />
        <DashboardButton 
          title="Emergencias" subtitle="Guardias y teléfonos." icon="car-emergency"
          onPress={() => navigation.navigate('AdminEmergenciasCrud')} 
        />
        <DashboardButton 
          title="Negocios" subtitle="Directorio comercial." icon="storefront-outline"
          onPress={() => navigation.navigate('AdminLocales')} 
        />
        <DashboardButton 
          title="Top Badges" subtitle="Destacar alertas globales." icon="alert-decagram-outline"
          onPress={() => navigation.navigate('AdminEmergencias')} 
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Monitoreo y Reportes</Text>

      <View style={styles.grid}>
        <DashboardButton 
          title="Sugerencias" subtitle="Feedback de los usuarios." icon="message-alert-outline"
          onPress={() => navigation.navigate('AdminSuggestions')} 
          badgeCount={unreadSuggestions}
        />
        <DashboardButton 
          title="Cuentas" subtitle="Reactivaciones y eliminaciones." icon="account-cog-outline"
          onPress={() => navigation.navigate('AdminAccountRequests')} 
          badgeCount={pendingRequests}
        />
        {flags.dataReports && (
          <DashboardButton 
            title="Reportes Errores" subtitle="Data flaggeada." icon="clipboard-alert-outline"
            onPress={() => navigation.navigate('AdminDataReports')} 
            badgeCount={activeReports}
          />
        )}
        <DashboardButton 
          title="Estadísticas" subtitle="Tráfico y demografía." icon="chart-line"
          onPress={() => navigation.navigate('AdminAnalytics')} 
        />
        <DashboardButton 
          title="Guías" subtitle="Primeros auxilios." icon="medical-bag"
          onPress={() => navigation.navigate('AdminPrimerosAuxilios')} 
        />
        <DashboardButton 
          title="Banners" subtitle="Configurar Home." icon="home-variant-outline"
          onPress={() => navigation.navigate('AdminHomeConfig')} 
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Configuración de Versión</Text>
      <GlassCard style={styles.versionCard} contentStyle={styles.versionContent} blurAmount={20}>
        <View style={styles.versionInfo}>
          <Icon name="cellphone-arrow-down" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.versionLabel, { color: colors.text }]}>Versión Mínima Requerida</Text>
            <Text style={[styles.versionSub, { color: colors.mutedText }]}>Bloquea el acceso a versiones inferiores.</Text>
          </View>
        </View>
        
        <View style={styles.versionInputContainer}>
          <TextInput
            style={[styles.versionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background + '80' }]}
            value={minVersion}
            onChangeText={setMinVersion}
            placeholder="Ej: 2.0.0"
            placeholderTextColor={colors.mutedText}
            keyboardType="default"
          />
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { backgroundColor: minVersion ? '#4a90e2' : '#BDBDBD' }
            ]} 
            onPress={handleUpdateMinVersion}
            disabled={loadingVersion || !minVersion}
            activeOpacity={0.7}
          >
            {loadingVersion ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: '#fff', opacity: minVersion ? 1 : 0.7 }]}>GUARDAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassCard>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  headerBadgeOuter: {
    borderRadius: 20,
  },
  headerBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCardOuter: {
    flex: 1,
    borderWidth: 1,
  },
  metricCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  metricCount: {
    fontSize: 32,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  gridCardOuter: {
    height: 140,
  },
  gridCardInner: {
    flex: 1,
    padding: 14,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeAlert: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridTexts: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  versionCard: {
    marginBottom: 40,
  },
  versionContent: {
    padding: 20,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  versionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  versionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  versionInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  versionInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  // Quick Actions
  quickActions: {
    marginTop: 12,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  quickIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInfo: {
    flex: 1,
    marginLeft: 16,
  },
  quickTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickSubtitle: {
    fontSize: 13,
  },
});

