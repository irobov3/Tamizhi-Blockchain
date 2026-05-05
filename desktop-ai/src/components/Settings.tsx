import { useState } from 'react';
import { useSettings, type Provider, type Theme } from '../store/settings';

interface Props {
  onClose: () => void;
}

const MODELS: Record<Provider, string[]> = {
  anthropic: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  ollama: ['llama3.2', 'mistral', 'qwen2.5'],
};

export default function Settings({ onClose }: Props) {
  const s = useSettings();
  const [apiKey, setApiKey] = useState(s.apiKey);
  const [provider, setProvider] = useState<Provider>(s.provider);
  const [model, setModel] = useState(s.model);
  const [tamilMode, setTamilMode] = useState(s.tamilMode);
  const [theme, setTheme] = useState<Theme>(s.theme);

  function save() {
    s.update({ apiKey, provider, model, tamilMode, theme });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label className="field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as Provider;
              setProvider(p);
              setModel(MODELS[p][0]);
            }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (local)</option>
          </select>
        </label>

        <label className="field">
          <span>API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </label>

        <label className="field">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS[provider].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="field checkbox">
          <input
            type="checkbox"
            checked={tamilMode}
            onChange={(e) => setTamilMode(e.target.checked)}
          />
          <span>Prefer Tamil responses</span>
        </label>

        <label className="field">
          <span>Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="dark">Dark (Tamizhi)</option>
            <option value="light">Light</option>
          </select>
        </label>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
