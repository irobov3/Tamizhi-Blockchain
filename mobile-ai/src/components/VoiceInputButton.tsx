// Hold-to-talk mic. Records via expo-av and yields a uri for the caller
// to transcribe (transcription is currently stubbed in src/ai/voice.ts).

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startRecording, stopRecording, transcribe } from '../ai/voice';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInputButton({ onTranscript, disabled }: Props) {
  const [recording, setRecording] = useState(false);

  const onPressIn = async () => {
    if (disabled) return;
    try {
      await startRecording();
      setRecording(true);
    } catch (err) {
      console.warn('mic error', err);
    }
  };

  const onPressOut = async () => {
    if (!recording) return;
    setRecording(false);
    const uri = await stopRecording();
    if (!uri) return;
    const text = await transcribe(uri);
    if (text) onTranscript(text);
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.btn, recording && styles.btnActive, disabled && { opacity: 0.4 }]}
      hitSlop={8}
    >
      <View>
        <Ionicons
          name={recording ? 'mic' : 'mic-outline'}
          size={22}
          color={recording ? '#fff' : T.text}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.inputBackground,
  },
  btnActive: { backgroundColor: T.danger },
});
