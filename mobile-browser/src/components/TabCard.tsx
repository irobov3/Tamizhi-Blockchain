import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';
import type { BrowserTab } from '../store/tabs';

const T = CONFIG.THEME;

interface TabCardProps {
  tab: BrowserTab;
  active?: boolean;
  onPress: () => void;
  onClose: () => void;
}

export const TabCard: React.FC<TabCardProps> = ({
  tab,
  active,
  onPress,
  onClose,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.thumbWrap}>
        {tab.thumbnail ? (
          <Image source={{ uri: tab.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="globe-outline" size={36} color={T.subtext} />
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color={T.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.meta}>
        {tab.favicon ? (
          <Image source={{ uri: tab.favicon }} style={styles.favicon} />
        ) : (
          <Ionicons name="globe-outline" size={12} color={T.subtext} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {tab.title || 'New Tab'}
        </Text>
      </View>
      <Text style={styles.url} numberOfLines={1}>
        {tab.url}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: T.border,
    width: '48%',
    marginBottom: 12,
  },
  cardActive: { borderColor: T.primary },
  thumbWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: T.card,
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  favicon: { width: 12, height: 12, borderRadius: 2 },
  title: { color: T.text, fontSize: 12, fontWeight: '600', flex: 1 },
  url: { color: T.subtext, fontSize: 10, marginTop: 2 },
});
