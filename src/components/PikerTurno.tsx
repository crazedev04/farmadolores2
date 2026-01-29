import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useTheme } from '../context/ThemeContext';

export default function PickerTurno({
  value,
  onChange,
  label = 'Seleccionar turno'
}: {
  value?: Date | null,
  onChange: (date: Date) => void,
  label?: string
}) {
  const [show, setShow] = useState(false);
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShow(true)}>
        <Text style={{ color: value ? colors.text : colors.placeholderText }}>
          {value
            ? value.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
            : label}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={show}
        mode="datetime"
        date={value || new Date()}
        onConfirm={date => {
          setShow(false);
          onChange(date);
        }}
        onCancel={() => setShow(false)}
        is24Hour={true}
        locale="es-AR"
        minimumDate={new Date(2020, 0, 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
  },
});
