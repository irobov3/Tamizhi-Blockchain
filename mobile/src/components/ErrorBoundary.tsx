import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CONFIG } from '../config';
import { reportError } from '../utils/telemetry';

const T = CONFIG.THEME;

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (err: Error, reset: () => void) => React.ReactNode;
}

interface State {
  err: Error | null;
}

/**
 * Top-level error boundary. Catches render errors anywhere in the
 * subtree, reports them via the telemetry shim, and shows a friendly
 * recovery screen with a "Try again" button rather than crashing
 * to a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo): void {
    reportError(err, { componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ err: null });
  };

  render(): React.ReactNode {
    const { err } = this.state;
    if (!err) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(err, this.reset);
    }

    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>!</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The app hit an unexpected error. Your data is safe and stored locally.
        </Text>
        <ScrollView style={styles.errBox} contentContainerStyle={styles.errBoxContent}>
          <Text style={styles.errText} selectable>
            {err.message}
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  emoji: {
    color: T.danger,
    fontSize: 56,
    fontWeight: '900',
    marginBottom: 12,
  },
  title: {
    color: T.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: T.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errBox: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    marginBottom: 24,
  },
  errBoxContent: { padding: 14 },
  errText: {
    color: T.danger,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  btn: {
    backgroundColor: T.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
