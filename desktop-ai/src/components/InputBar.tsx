import { useEffect, useRef, useState } from 'react';
import { extractFileText } from '../ai/files';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
  }, [text]);

  function send() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await extractFileText(file);
      setText((t) => `${t}\n\n--- ${file.name} ---\n${content}\n--- end ---\n`);
    } catch (err: any) {
      setText((t) => `${t}\n[Failed to read ${file.name}: ${err?.message}]`);
    } finally {
      e.target.value = '';
    }
  }

  function toggleVoice() {
    const w: any = window;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not available in this environment.');
      return;
    }
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'ta-IN';
    rec.onresult = (ev: any) => {
      let transcript = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript;
      }
      setText((t) => (t ? t + ' ' : '') + transcript);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }

  return (
    <div className="input-bar">
      <label className="icon-btn" title="Attach file">
        +
        <input type="file" hidden accept=".pdf,.txt,.md,.markdown,image/*" onChange={onAttach} />
      </label>
      <textarea
        ref={taRef}
        className="input-textarea"
        placeholder="Ask Tamizhi AI... (Cmd+Enter to send)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
      />
      <button
        className={`icon-btn ${recording ? 'recording' : ''}`}
        onClick={toggleVoice}
        title="Voice input"
      >
        {recording ? '...' : 'mic'}
      </button>
      <button className="send-btn" onClick={send} disabled={disabled || !text.trim()}>
        Send
      </button>
    </div>
  );
}
