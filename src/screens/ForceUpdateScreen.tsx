import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Icon from '@react-native-vector-icons/material-design-icons';

const ForceUpdateScreen = () => {
  const handleUpdate = () => {
    // Abrir la Play Store directamente
    const url = 'market://details?id=com.overcode.farmadolores';
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback al navegador
        Linking.openURL('https://play.google.com/store/apps/details?id=com.overcode.farmadolores');
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Fondo con gradiente o imagen abstracta (puedes usar el logo desenfocado) */}
      <View style={styles.background}>
        <View style={[styles.circle, { top: -50, left: -50, backgroundColor: '#4a90e2' }]} />
        <View style={[styles.circle, { bottom: -100, right: -50, backgroundColor: '#9013fe' }]} />
      </View>

      <BlurView
        style={styles.blurContainer}
        blurType="dark"
        blurAmount={20}
        reducedTransparencyFallbackColor="black"
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="update" size={80} color="#fff" />
            <View style={styles.badge}>
              <Icon name="alert-circle" size={24} color="#ff4757" />
            </View>
          </View>

          <Text style={styles.title}>Actualización Obligatoria</Text>
          <Text style={styles.description}>
            Lanzamos una nueva versión de Farmadolores con mejoras críticas de seguridad y nuevas funciones del Panel Administrativo.
          </Text>

          <Text style={styles.infoText}>
            Para seguir cuidando de tu salud con la mejor experiencia, necesitás actualizar a la última versión.
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleUpdate} activeOpacity={0.8}>
            <Text style={styles.buttonText}>ACTUALIZAR AHORA</Text>
            <Icon name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text style={styles.footer}>v2.0.0 - Farmadolores Team</Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4a90e2',
    height: 60,
    borderRadius: 18,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

export default ForceUpdateScreen;
