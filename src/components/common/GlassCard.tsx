import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../context/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  blurType?: 'light' | 'dark' | 'xlight' | 'prominent' | 'regular';
  blurAmount?: number;
}

/**
 * Premium Glassmorphism Card Component.
 * Supports iOS/Android blur natively with fallback styled view.
 */
export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  contentStyle,
  blurType, 
  blurAmount = 15 
}) => {
  const { theme } = useTheme();
  const { colors, shadows, dark } = theme as any;

  const defaultBlurType = dark ? 'dark' : 'light';

  return (
    <View style={[styles.container, shadows.md, style]}>
      {Platform.OS === 'ios' && (
        <BlurView
          style={styles.absolute}
          blurType={blurType || defaultBlurType}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={colors.background}
        />
      )}
      <View style={[
        styles.content, 
        { 
          backgroundColor: Platform.OS === 'ios' ? colors.glassBackground : (theme.dark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)'), 
          borderColor: colors.glassBorder 
        },
        contentStyle
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  absolute: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
});
