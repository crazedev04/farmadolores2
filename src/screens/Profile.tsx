import React, { useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, DrawerLayoutAndroid, StatusBar, Linking, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigationTypes';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import SettingsScreen from './SettingsScreen';

const Profile: React.FC = () => {
  const { user, isGuest, isAdmin, roleLoading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { colors } = theme;
  const drawerRef = useRef<DrawerLayoutAndroid>(null);
  const cafecitoLink = 'https://cafecito.app/crazedev';

  const handleCafecitoPress = () => {
    Linking.openURL(cafecitoLink);
  };

  const content = (
    <>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
        {Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => drawerRef.current?.openDrawer()}>
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
          <TouchableOpacity style={[styles.cafecitoButton, { backgroundColor: colors.buttonBackground }]} onPress={handleCafecitoPress}>
            <Icon name="coffee" size={22} color={colors.buttonText} />
            <Text style={[styles.cafecitoButtonText, { color: colors.buttonText }]}>Donar en Cafecito</Text>
          </TouchableOpacity>
        </View>


        {isAdmin && !roleLoading && (
          <TouchableOpacity
            style={[styles.adminEditButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Admin')}
          >
            <Icon name="tag-edit" size={20} color="#fff" />
            <Text style={styles.adminEditButtonText}>Editar horarios de farmacias</Text>
          </TouchableOpacity>
        )}

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
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition={'right'}
      renderNavigationView={() => (
        <View style={[styles.drawerContent, { backgroundColor: colors.background }]}>
          <SettingsScreen />
        </View>
      )}
    >
      {content}
    </DrawerLayoutAndroid>
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
  adminEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 14,
    width: '92%',
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
