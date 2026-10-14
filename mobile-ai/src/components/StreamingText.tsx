// Lightweight typewriter wrapper. The streaming source updates `text` as
// deltas arrive; we just render with a blinking caret while `streaming` is
// true. (We don't artificially delay characters — the network already
// paces them.)

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

export default function StreamingText({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const [caretVisible, setCaretVisible] = useState(true);
  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => setCaretVisible((v) => !v), 500);
    return () => clearInterval(t);
  }, [streaming]);
  return (
    <Text style={styles.text}>
      {text}
      {streaming && (
        <Text style={[styles.caret, { opacity: caretVisible ? 1 : 0 }]}>▋</Text>
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: T.text, fontSize: 15, lineHeight: 22 },
  caret: { color: T.accent },
});
