import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import OtaHotUpdate from 'react-native-ota-hot-update';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class OTAErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Asynchronously clear the OTA update so the next boot is safe
    this.revertUpdate();
  }

  private revertUpdate = async () => {
    try {
      console.log('[OTAErrorBoundary] Reverting OTA update due to fatal crash...');
      OtaHotUpdate.removeUpdate(false);
    } catch (e) {
      console.error('[OTAErrorBoundary] Failed to clear OTA update', e);
    }
  };

  private restartApp = () => {
    OtaHotUpdate.resetApp();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Error Inesperado</Text>
            <Text style={styles.subtitle}>
              La aplicación encontró un error crítico. Hemos revertido a una versión segura.
            </Text>
            {__DEV__ && <Text style={styles.devError}>{this.state.errorMsg}</Text>}
            <TouchableOpacity style={styles.button} onPress={this.restartApp}>
              <Text style={styles.buttonText}>Reiniciar App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  devError: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#F8FAFC',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  button: {
    backgroundColor: '#00B8D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
