import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, StatusBar, Platform, ScrollView, Modal, Pressable } from 'react-native';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigationTypes';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import SettingsScreen from './SettingsScreen';
import { openWebLink } from '../utils/openWebLink';
const db = getFirestore();

const DEFAULT_CAFECITO_URL = 'https://cafecito.app/crazedev';

const Profile: React.FC = () => {
  const { user, isGuest, isAdmin, roleLoading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { colors } = theme;
  const [menuOpen, setMenuOpen] = useState(false);
  const [cafecitoUrl, setCafecitoUrl] = useState(DEFAULT_CAFECITO_URL);
  const hasCafecito = Boolean(cafecitoUrl && cafecitoUrl.trim().length > 0);

  const handleCafecitoPress = () => {
    if (!hasCafecito) return;
    openWebLink(navigation, cafecitoUrl.trim(), 'Cafecito');
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'app'),
        (snapshot) => {
          const data = snapshot.data();
          if (data && typeof data.cafecitoUrl === 'string') {
            setCafecitoUrl(data.cafecitoUrl);
          } else {
            setCafecitoUrl(DEFAULT_CAFECITO_URL);
          }
        },
        () => {
          setCafecitoUrl(DEFAULT_CAFECITO_URL);
        }
      );

    return () => unsubscribe();
  }, []);

  const content = (
    <>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
        {Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setMenuOpen(true)}>
            <Icon name="menu" size={30} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            style={[styles.profileImage, { borderColor: colors.primary, backgroundColor: colors.card }]}
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
          />
          <Text style={[styles.name, { color: colors.text }]}>{user?.displayName || 'User Name'}</Text>
          <Text style={[styles.email, { color: colors.text }]}>{user?.email || 'user@example.com'}</Text>
          <Text style={[styles.bio, { color: colors.text }]}>
            Gracias por usar nuestra aplicacion. Tu confianza nos ayuda a mejorar cada dia.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Apoyanos</Text>
          {hasCafecito ? (
            <TouchableOpacity style={[styles.cafecitoButton, { backgroundColor: colors.buttonBackground }]} onPress={handleCafecitoPress}>
              <Icon name="coffee" size={22} color={colors.buttonText} />
              <Text style={[styles.cafecitoButtonText, { color: colors.buttonText }]}>Donar en Cafecito</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
              Configura la URL de Cafecito en el panel de admin.
            </Text>
          )}
        {isAdmin && !roleLoading && (
          <TouchableOpacity
            style={[styles.adminEditButton, { backgroundColor: colors.buttonBackground }]}
            onPress={() => navigation.navigate('Admin')}
          >
            <Icon name="shield-account" size={20} color={colors.buttonText} />
            <Text style={[styles.adminEditButtonText, { color: colors.buttonText }]}>Panel Admin</Text>
          </TouchableOpacity>
        )}
        </View>



        {isGuest && (
          <View style={[styles.section, styles.authActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.authButtonText}>Iniciar sesion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={[styles.authButtonText, { color: colors.text }]}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        )}

        

        {Platform.OS !== 'android' && (
          <View style={styles.drawerContent}>
            <SettingsScreen />
          </View>
        )}

        <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
      </ScrollView>
    </>
  );

  if (Platform.OS !== 'android') {
    return <View style={{ flex: 1 }}>{content}</View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Icon name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <SettingsScreen />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileCard: {
    width: '92%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    borderWidth: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    width: '92%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  cafecitoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  cafecitoButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
  },
  adminEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  adminEditButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  drawerContent: {
    flex: 1,
    width: '100%',
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuPanel: {
    width: 320,
    maxWidth: '85%',
    height: '100%',
    flexShrink: 0,
    borderLeftWidth: 1,
    paddingBottom: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  authActions: {
    gap: 10,
  },
  authButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
