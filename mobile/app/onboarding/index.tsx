import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;
const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'lock-closed' as const, label: 'End-to-End Encrypted' },
  { icon: 'server' as const, label: 'Blockchain-Backed' },
  { icon: 'eye-off' as const, label: 'No Data Collection' },
  { icon: 'person' as const, label: 'No Phone Number Required' },
] as const;

export default function OnboardingIndexScreen() {
  const router = useRouter();

  // Animation refs
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslate = useRef(new Animated.Value(40)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const actionsTranslate = useRef(new Animated.Value(60)).current;
  const actionsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 14,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Rings expand
      Animated.parallel([
        Animated.spring(ringScale1, {
          toValue: 1,
          damping: 16,
          stiffness: 120,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale2, {
          toValue: 1,
          damping: 14,
          stiffness: 100,
          delay: 60,
          useNativeDriver: true,
        }),
      ]),
      // Title slides in
      Animated.parallel([
        Animated.spring(titleTranslate, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Feature pills
      Animated.parallel([
        Animated.spring(featuresTranslate, {
          toValue: 0,
          damping: 18,
          stiffness: 160,
          useNativeDriver: true,
        }),
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Action buttons
      Animated.parallel([
        Animated.spring(actionsTranslate, {
          toValue: 0,
          damping: 18,
          stiffness: 160,
          useNativeDriver: true,
        }),
        Animated.timing(actionsOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          {/* Outer ring */}
          <Animated.View
            style={[styles.logoOuterRing, { transform: [{ scale: ringScale2 }] }]}
          />
          {/* Inner ring */}
          <Animated.View
            style={[styles.logoRing, { transform: [{ scale: ringScale1 }] }]}
          />
          {/* Core — real logo PNG */}
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoBg}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Title + tagline */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslate }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.appName}>Tamizhi Messenger</Text>
          <Text style={styles.tagline}>Private Decentralized Messaging</Text>
          <Text style={styles.tamilQuote}>யாதும் ஊரே யாவரும் கேளிர்</Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View
          style={[
            styles.features,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslate }],
            },
          ]}
        >
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featurePill}>
              <Ionicons name={f.icon} size={14} color={T.primary} />
              <Text style={styles.featurePillText}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Actions */}
      <Animated.View
        style={[
          styles.actions,
          {
            opacity: actionsOpacity,
            transform: [{ translateY: actionsTranslate }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/onboarding/create-wallet')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#fff" style={styles.btnIcon} />
          <View>
            <Text style={styles.primaryBtnText}>Create New Identity</Text>
            <Text style={styles.primaryBtnSub}>Generate a new wallet & Tamizhi ID</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/onboarding/import-wallet')}
          activeOpacity={0.85}
        >
          <Ionicons name="download" size={22} color={T.primary} style={styles.btnIcon} />
          <View>
            <Text style={styles.secondaryBtnText}>Import Identity</Text>
            <Text style={styles.secondaryBtnSub}>Restore from 12 or 24-word phrase</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          All keys are stored locally on your device.{'\n'}
          Your conversations are inaccessible to anyone but you.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.background,
    justifyContent: 'space-between',
  },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 28,
  },

  logoContainer: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 14,
    zIndex: 3,
  },
  logoRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: T.primary + '55',
    zIndex: 2,
  },
  logoOuterRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: T.primary + '22',
    zIndex: 1,
  },

  appName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  tagline: {
    color: T.subtext,
    fontSize: 15,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tamilQuote: {
    color: '#FFB800',
    fontSize: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.85,
  },

  features: {
    width: '100%',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    gap: 10,
  },
  featurePillText: { color: T.text, fontSize: 14, fontWeight: '500' },

  actions: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    borderRadius: 18,
    padding: 18,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  primaryBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: T.primary,
  },
  secondaryBtnText: { color: T.primary, fontSize: 16, fontWeight: '700' },
  secondaryBtnSub: { color: T.subtext, fontSize: 12, marginTop: 2 },

  btnIcon: { marginRight: 14 },

  disclaimer: {
    color: T.subtext,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
});
