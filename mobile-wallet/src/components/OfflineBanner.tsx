import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../hooks/useConnectivity';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

/**
 * Slim banner that slides in when connectivity is degraded.
 * Mounted near the top of the layout tree so it overlays every screen.
 */
export function OfflineBanner() {
  const status = useConnectivity();
  const translateY = useRef(new Animated.Value(-40)).current;

  const visible = status !== 'online';

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -40,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { backgroundColor: isOffline ? T.danger : T.surface, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.row}>
        <Ionicons
          name={isOffline ? 'cloud-offline' : 'cloud-upload-outline'}
          size={14}
          color="#fff"
        />
        <Text style={styles.text}>
          {isOffline ? 'You are offline — messages will retry when reconnected' : 'Reconnecting…'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 28,
    paddingBottom: 6,
    zIndex: 1000,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
