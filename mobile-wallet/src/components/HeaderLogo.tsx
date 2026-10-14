import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CONFIG } from '../config';

interface Props {
  title?: string;
  subtitle?: string;
}

export const HeaderLogo: React.FC<Props> = ({
  title = 'Tamizhi',
  subtitle,
}) => (
  <View style={styles.container}>
    <View style={styles.logoMark}>
      <Text style={styles.logoChar}>த</Text>
    </View>
    <View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const T = CONFIG.THEME;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChar: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: T.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: T.subtext,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
