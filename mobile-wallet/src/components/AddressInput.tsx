import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bech32 } from 'bech32';
import { CONFIG } from '../config';

const T = CONFIG.THEME;
const PREFIX = CONFIG.BECH32_PREFIX;

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  enableScanner?: boolean;
}

export function validateBech32Address(addr: string): boolean {
  if (!addr || !addr.startsWith(PREFIX + '1')) return false;
  try {
    const decoded = bech32.decode(addr);
    return decoded.prefix === PREFIX;
  } catch {
    return false;
  }
}

export function AddressInput({
  value,
  onChange,
  placeholder = 'tamizhi1...',
  enableScanner = true,
}: Props) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const valid = useMemo(() => (value ? validateBech32Address(value) : null), [value]);

  return (
    <View>
      <View
        style={[
          styles.row,
          valid === true && styles.rowValid,
          valid === false && styles.rowInvalid,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.subtext}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={styles.input}
        />
        {valid === true && (
          <Ionicons name="checkmark-circle" size={22} color={T.success} />
        )}
        {valid === false && (
          <Ionicons name="close-circle" size={22} color={T.danger} />
        )}
        {enableScanner && (
          <TouchableOpacity
            onPress={() => setScannerOpen(true)}
            style={styles.scanBtn}
            accessibilityLabel="Scan QR code"
          >
            <Ionicons name="qr-code-outline" size={22} color={T.gold} />
          </TouchableOpacity>
        )}
      </View>
      {valid === false && (
        <Text style={styles.err}>
          Invalid address — must start with "{PREFIX}1"
        </Text>
      )}

      <QrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(v) => {
          setScannerOpen(false);
          // Strip "tamizhi:" prefix or other URI scheme if present
          const cleaned = v.includes(':') ? v.split(':').pop() ?? v : v;
          onChange(cleaned.trim());
        }}
      />
    </View>
  );
}

// ─── QR scanner (lazy-loads expo-camera) ─────────────────────────────────

function QrScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (v: string) => void;
}) {
  // Lazy require so the camera permission/native module isn't loaded unless needed
  const [Camera, setCamera] = useState<any>(null);
  const [permission, setPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (!visible || Camera) return;
    (async () => {
      try {
        const mod: any = await import('expo-camera');
        setCamera(() => mod.CameraView ?? mod.Camera);
        const result = await (mod.requestCameraPermissionsAsync
          ? mod.requestCameraPermissionsAsync()
          : mod.Camera?.requestCameraPermissionsAsync?.());
        setPermission(result?.granted ?? false);
      } catch (e) {
        console.warn('expo-camera load failed:', e);
        setPermission(false);
      }
    })();
  }, [visible]);

  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scanner}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan address QR</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={T.cream} />
          </TouchableOpacity>
        </View>
        {permission === false && (
          <View style={styles.scannerBody}>
            <Text style={styles.scannerMsg}>
              Camera permission denied. Enable it in system settings.
            </Text>
          </View>
        )}
        {Camera && permission && (
          <Camera
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(e: any) => onScan(e?.data ?? '')}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
  },
  rowValid: { borderColor: T.success },
  rowInvalid: { borderColor: T.danger },
  input: {
    flex: 1,
    color: T.text,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scanBtn: { marginLeft: 8, padding: 4 },
  err: { color: T.danger, fontSize: 12, marginTop: 6 },
  scanner: { flex: 1, backgroundColor: T.background },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: T.indigo,
  },
  scannerTitle: { color: T.cream, fontSize: 16, fontWeight: '700' },
  scannerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scannerMsg: { color: T.text, textAlign: 'center' },
});

export default AddressInput;
