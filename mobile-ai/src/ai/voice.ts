// Voice utilities: TTS via expo-speech, STT recording via expo-av.
// On-device STT is platform-specific and not yet wired — recordings are
// stored locally and the path returned for the caller to upload to a
// transcription endpoint of their choice (stub for now).

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export function speak(text: string, locale: string = 'ta-IN') {
  Speech.stop();
  Speech.speak(text, { language: locale, pitch: 1.0, rate: 0.95 });
}

export function stopSpeaking() {
  Speech.stop();
}

let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Microphone permission denied');
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  recording = rec;
}

export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    return uri ?? null;
  } catch {
    recording = null;
    return null;
  }
}

// STUB: speech-to-text transcription. Wire to your provider of choice.
// Currently returns null — caller falls back to text input.
export async function transcribe(_audioUri: string): Promise<string | null> {
  // TODO: integrate STT. Options:
  //  - Anthropic doesn't yet expose audio input on /v1/messages from RN.
  //  - Use platform STT (RN Voice / @react-native-voice/voice) — requires native.
  //  - Or POST to a backend transcription endpoint.
  console.warn('[voice] transcribe() is a stub. Implement STT integration.');
  return null;
}
