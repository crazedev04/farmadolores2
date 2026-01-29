import React from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TouchableHighlight } from 'react-native';

const HelpScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const email = 'crazedev761@gmail.com';

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ayuda</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.text }]}>
          Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
        </Text>
        <TouchableHighlight onPress={handleEmailPress} underlayColor={colors.border}>
          <Text style={[styles.link, { color: colors.text }]}>{email}</Text>
        </TouchableHighlight>
      </View>
    </View>
  );
};

export default HelpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  link: {
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
