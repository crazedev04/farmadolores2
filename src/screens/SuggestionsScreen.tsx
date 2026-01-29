import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const TYPE_OPTIONS = [
  { key: 'sugerencia', label: 'Sugerencia' },
  { key: 'mejora', label: 'Mejora' },
  { key: 'otro', label: 'Otro' },
] as const;

type SuggestionType = typeof TYPE_OPTIONS[number]['key'];

const SuggestionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SuggestionType>('sugerencia');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Escribe tu sugerencia.');
      return;
    }
    if (!user) {
      Alert.alert('Inicia sesion', 'Necesitas iniciar sesion para enviar sugerencias.');
      return;
    }

    setLoading(true);
    try {
      await firestore().collection('sugerencias').add({
        title: title.trim(),
        message: message.trim(),
        type,
        resolved: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
      });

      setTitle('');
      setMessage('');
      setType('sugerencia');
      Alert.alert('Gracias', 'Tu sugerencia fue enviada.');
    } catch (error) {
      console.error('Error sending suggestion:', error);
      Alert.alert('Error', 'No se pudo enviar la sugerencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Sugerencias</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Titulo (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: Mejorar mapa"
          placeholderTextColor={colors.placeholderText}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map(option => {
            const active = type === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setType(option.key)}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Sugerencia</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Contanos tu idea o mejora"
          placeholderTextColor={colors.placeholderText}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.buttonText || '#fff' }]}>Enviar sugerencia</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SuggestionsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.9,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});
