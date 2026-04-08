import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AdminListProps = {
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
};

const AdminList: React.FC<AdminListProps> = ({ loading, empty, emptyText, children }) => {
  const { theme } = useTheme();
  const { colors } = theme;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.buttonBackground} />
      </View>
    );
  }

  if (empty) {
    return <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>{emptyText}</Text>;
  }

  return <>{children}</>;
};

export default AdminList;

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
});
