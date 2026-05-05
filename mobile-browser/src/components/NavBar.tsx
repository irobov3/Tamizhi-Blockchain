import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

interface NavBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMenu: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onHome,
  onTabs,
  onMenu,
}) => {
  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onBack}
        disabled={!canGoBack}
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={canGoBack ? T.text : T.subtext}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={onForward}
        disabled={!canGoForward}
      >
        <Ionicons
          name="chevron-forward"
          size={22}
          color={canGoForward ? T.text : T.subtext}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onHome}>
        <Ionicons name="home-outline" size={22} color={T.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onTabs}>
        <Ionicons name="copy-outline" size={22} color={T.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onMenu}>
        <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});
