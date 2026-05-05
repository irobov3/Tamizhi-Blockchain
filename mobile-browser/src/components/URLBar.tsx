import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';
import { normalizeURL, getScheme, isSecure, type SearchEngine } from '../utils/url';

const T = CONFIG.THEME;

interface URLBarProps {
  url: string;
  loading: boolean;
  searchEngine?: SearchEngine;
  onSubmit: (normalized: string) => void;
  onReload: () => void;
  onStop: () => void;
}

function SecurityIndicator({ url }: { url: string }) {
  const scheme = getScheme(url);
  let icon: keyof typeof Ionicons.glyphMap = 'globe-outline';
  let color = T.subtext;
  let label: string | null = null;
  if (scheme === 'https') {
    icon = 'lock-closed';
    color = T.success;
  } else if (scheme === 'http') {
    icon = 'warning-outline';
    color = '#ffaa00';
  } else if (scheme === 'tamizhi') {
    label = 'T';
    color = T.primary;
  } else if (scheme === 'ipfs' || scheme === 'ipns') {
    icon = 'cube-outline';
    color = T.accent;
  }
  if (label) {
    return (
      <View style={[styles.indicator, { borderColor: color }]}>
        <Text style={[styles.indicatorLabel, { color }]}>{label}</Text>
      </View>
    );
  }
  return <Ionicons name={icon} size={14} color={color} />;
}

export const URLBar: React.FC<URLBarProps> = ({
  url,
  loading,
  searchEngine = 'google',
  onSubmit,
  onReload,
  onStop,
}) => {
  const [text, setText] = useState(url);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(url);
  }, [url, editing]);

  const submit = () => {
    const normalized = normalizeURL(text, searchEngine);
    if (normalized) onSubmit(normalized);
    setEditing(false);
  };

  return (
    <View style={styles.row}>
      <View style={styles.iconLeft}>
        <SecurityIndicator url={url} />
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onSubmitEditing={submit}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="Search or enter URL"
        placeholderTextColor={T.subtext}
        selectTextOnFocus
        returnKeyType="go"
      />
      <TouchableOpacity
        style={styles.iconRight}
        onPress={loading ? onStop : onReload}
      >
        <Ionicons
          name={loading ? 'close' : 'refresh'}
          size={18}
          color={T.text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBackground,
    borderRadius: 22,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: T.border,
  },
  iconLeft: { paddingHorizontal: 6 },
  iconRight: { paddingHorizontal: 6 },
  input: {
    flex: 1,
    color: T.text,
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorLabel: { fontSize: 11, fontWeight: '900' },
});
