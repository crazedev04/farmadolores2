import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AdminFormProps = {
  title: string;
  editing: boolean;
  saving?: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabelCreate?: string;
  submitLabelUpdate?: string;
  children: React.ReactNode;
};

const AdminForm: React.FC<AdminFormProps> = ({
  title,
  editing,
  saving = false,
  onCancel,
  onSubmit,
  submitLabelCreate = 'Agregar',
  submitLabelUpdate = 'Guardar cambios',
  children,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {editing && onCancel ? (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {children}

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.buttonBackground }]}
        onPress={onSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.buttonText || '#fff'} />
        ) : (
          <Text style={[styles.submitText, { color: colors.buttonText || '#fff' }]}>
            {editing ? submitLabelUpdate : submitLabelCreate}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default AdminForm;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 4,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
