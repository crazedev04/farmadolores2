import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import Icon from '@react-native-vector-icons/material-design-icons';
import { GlassCard } from '../components/common/GlassCard';
import { adminSendBroadcast } from '../services/adminService';

const AdminPushBroadcastScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Título y mensaje son obligatorios', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'Título y mensaje son obligatorios');
      }
      return;
    }

    Alert.alert(
      'Confirmar Envío',
      '¿Estás seguro que querés enviar esta notificación a todos los usuarios que tengan alertas activadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar Broadcast',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminSendBroadcast(title.trim(), body.trim());
              if (Platform.OS === 'android') {
                ToastAndroid.show(`¡Notificación enviada a ${res?.sent || 0} dispositivos!`, ToastAndroid.LONG);
              } else {
                Alert.alert('¡Éxito!', `¡Notificación enviada a ${res?.sent || 0} dispositivos!`);
              }
              setTitle('');
              setBody('');
              navigation.goBack();
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
              Alert.alert('Error al enviar', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <GlassCard
        blurAmount={theme.dark ? 40 : 80}
        style={[styles.formCard, { borderColor: colors.border }]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.buttonBackground }]}>
            <Icon name="broadcast" size={24} color={colors.buttonText || '#fff'} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Broadcast de Alerta</Text>
        </View>

        <Text style={[styles.description, { color: colors.mutedText || colors.placeholderText }]}>
          Enviá una notificación push instantánea a todos los usuarios de la app. Ideal para urgencias, nuevas versiones o recordatorios generales.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Título de la Notificación</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej. ¡Nueva promoción!"
            placeholderTextColor={colors.placeholderText}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Mensaje principal (Cuerpo)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Escribí el texto que verá el usuario al deslizar la notificación de su celular..."
            placeholderTextColor={colors.placeholderText}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />
        </View>

        <Text style={[styles.previewLabel, { color: colors.mutedText }]}>Vista Previa Aproximada:</Text>
        <View style={[styles.previewCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <View style={styles.previewHeader}>
            <Icon name="bell-ring-outline" size={14} color={colors.text} />
            <Text style={[styles.previewAppName, { color: colors.text }]}>Farmadolores 2 • Ahora</Text>
          </View>
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            {title || 'Título de la notificación'}
          </Text>
          <Text style={[styles.previewBody, { color: colors.mutedText || colors.placeholderText }]} numberOfLines={2}>
            {body || 'El cuerpo completo de la notificación aparecerá aquí.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: '#4a90e2' },
            (!title.trim() || !body.trim() || loading) && { backgroundColor: '#BDBDBD', opacity: 0.5 }
          ]}
          onPress={handleSend}
          disabled={!title.trim() || !body.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText || '#ffffff'} />
          ) : (
            <>
              <Icon name="send-outline" size={18} color={colors.buttonText || '#fff'} />
              <Text style={[styles.submitButtonText, { color: colors.buttonText || '#fff' }]}>
                Disparar a todos
              </Text>
            </>
          )}
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
};

export default AdminPushBroadcastScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 32,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  previewAppName: {
    fontSize: 12,
    opacity: 0.7,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
