import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFirestore, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logEvent } from '../services/analytics';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { createDataReport } from '../services/dataReportsService';
import { dataReportSchema } from '../admin/validators';
const db = getFirestore();

const ReportProblemScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ReportProblem'>>();
  const { theme } = useTheme();
  const { colors } = theme;
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const entityType = route.params?.entityType;
  const entityId = route.params?.entityId;
  const entityName = route.params?.entityName;
  const isDataReport = Boolean(entityType && entityId);

  const handleReport = async () => {
    const parsed = dataReportSchema.safeParse({ reason: problem });
    if (!parsed.success) {
      Alert.alert('Error', parsed.error.issues[0]?.message || 'Por favor describe el problema.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado.');
      return;
    }

    setLoading(true);

    try {
      const timestamp = serverTimestamp();
      if (isDataReport && entityType && entityId) {
        await createDataReport({
          reporterUid: user.uid,
          reporterEmail: user.email,
          entityType,
          entityId,
          entityName,
          reason: parsed.data.reason,
        });
        logEvent('data_report_submit', { entityType, entityId });
      } else {
        await addDoc(collection(db, 'reportes'), {
          problem: parsed.data.reason,
          timestamp,
          userId: user.uid,
          userName: user.displayName,
          userEmail: user.email,
        });
        logEvent('report_submit');
      }
      setProblem('');
      Alert.alert('Reporte enviado', 'Tu reporte se ha enviado correctamente.');
    } catch (error) {
      console.error('Error reporting problem: ', error);
      Alert.alert('Error', 'Hubo un problema al enviar tu reporte. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {isDataReport ? 'Reportar datos incorrectos' : 'Reportar problema'}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isDataReport && (
          <Text style={[styles.label, { color: colors.mutedText || colors.placeholderText }]}>
            {entityType}: {entityName || entityId}
          </Text>
        )}
        <Text style={[styles.label, { color: colors.text }]}>Descripcion</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder={isDataReport ? 'Describe el dato incorrecto (telefono, direccion, horario, etc.)' : 'Describe el problema'}
          placeholderTextColor={colors.placeholderText}
          value={problem}
          onChangeText={setProblem}
          multiline
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Enviar reporte</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReportProblemScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
    textAlignVertical: 'top',
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
