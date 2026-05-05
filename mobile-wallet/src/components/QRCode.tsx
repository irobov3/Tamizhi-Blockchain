import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { CONFIG } from '../config';

interface Props {
  value: string;
  label?: string;
  size?: number;
  showShare?: boolean;
  onShare?: () => void;
}

export const QRCode: React.FC<Props> = ({
  value,
  label,
  size = 200,
  showShare = true,
  onShare,
}) => {
  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    await Share.share({
      message: value,
      title: label ?? 'Tamizhi ID',
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.qrWrapper}>
        <QRCodeSVG
          value={value}
          size={size}
          color={CONFIG.THEME.text}
          backgroundColor={CONFIG.THEME.card}
          logo={undefined}
          ecl="M"
        />
      </View>

      <Text style={styles.value} numberOfLines={2} selectable>
        {value}
      </Text>

      {showShare && (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Tamizhi ID</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const T = CONFIG.THEME;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  label: {
    color: T.subtext,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  value: {
    color: T.subtext,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 16,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  shareButton: {
    marginTop: 16,
    backgroundColor: T.primary + '20',
    borderWidth: 1,
    borderColor: T.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  shareButtonText: {
    color: T.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
