// Calm — shared BYOK AI-recognition settings.
// One external store (localStorage) shared by web / mobile / menubar so the
// settings UI and the screenshot-import flow stay in sync within a page, and
// config carries across the three pages (same origin). Pure data + a tiny mock
// "test connection"; no per-end styling lives here.
//
// Screenshot import is powered entirely by the user's own multimodal model API.
// Import is blocked until the active provider has an API Key. The model is a
// free-text id the user types (provider default shown as placeholder).

const AI_BYOK_KEY = "calm-ai-byok-v1";

// ---- provider catalog -------------------------------------------------------
const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    short: "OpenAI",
    blurb: "GPT-4o 等多模态模型",
    defaultBaseURL: "https://api.openai.com/v1",
    keyPlaceholder: "sk-································",
    keyPrefix: "sk-",
    docHint: "platform.openai.com → API keys",
    defaultModel: "gpt-4o",
    modelHint: "需支持视觉，如 gpt-4o、gpt-4.1",
  },
  {
    id: "volcengine",
    name: "火山引擎 · 豆包",
    short: "火山引擎",
    blurb: "豆包视觉大模型 · 方舟 Ark",
    defaultBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
    keyPlaceholder: "输入火山方舟 API Key",
    keyPrefix: "",
    docHint: "火山方舟控制台 → API Key 管理",
    defaultModel: "doubao-1.5-vision-pro",
    modelHint: "填写模型名或接入点 ID（ep-…）",
  },
];
const AI_PROVIDER_MAP = Object.fromEntries(AI_PROVIDERS.map(p => [p.id, p]));

// model shown for a provider config (typed value, else provider default)
function aiModelOf(state, providerId) {
  const pid = providerId || state.activeProvider;
  const cfg = state.providers[pid] || {};
  const m = (cfg.model || "").trim();
  return m || AI_PROVIDER_MAP[pid].defaultModel;
}

// ---- default + persistence --------------------------------------------------
function aiDefaultState() {
  return {
    activeProvider: "openai",
    providers: {
      openai:     { apiKey: "", baseURL: "", model: "" },
      volcengine: { apiKey: "", baseURL: "", model: "" },
    },
  };
}

function aiLoad() {
  try {
    const raw = localStorage.getItem(AI_BYOK_KEY);
    if (!raw) return aiDefaultState();
    const saved = JSON.parse(raw);
    const base = aiDefaultState();
    return {
      activeProvider: AI_PROVIDER_MAP[saved.activeProvider] ? saved.activeProvider : "openai",
      providers: {
        openai:     { ...base.providers.openai,     ...(saved.providers && saved.providers.openai) },
        volcengine: { ...base.providers.volcengine, ...(saved.providers && saved.providers.volcengine) },
      },
    };
  } catch (e) { return aiDefaultState(); }
}

// ---- external store ---------------------------------------------------------
let _aiState = aiLoad();
const _aiSubs = new Set();
function _aiPersist() {
  try { localStorage.setItem(AI_BYOK_KEY, JSON.stringify(_aiState)); } catch (e) {}
}
function _aiEmit() { _aiSubs.forEach(fn => fn()); }
function aiSubscribe(fn) { _aiSubs.add(fn); return () => _aiSubs.delete(fn); }
function aiSnapshot() { return _aiState; }

function aiSet(patch) { _aiState = { ..._aiState, ...patch }; _aiPersist(); _aiEmit(); }
function aiSetActiveProvider(id) { if (AI_PROVIDER_MAP[id]) aiSet({ activeProvider: id }); }
function aiSetField(providerId, field, value) {
  const prev = _aiState.providers[providerId] || {};
  aiSet({ providers: { ..._aiState.providers, [providerId]: { ...prev, [field]: value } } });
}

// ---- derived ----------------------------------------------------------------
function aiIsConfigured(state, id) {
  const pid = id || state.activeProvider;
  const cfg = state.providers[pid];
  return !!(cfg && cfg.apiKey && cfg.apiKey.trim().length > 0);
}
function aiScanLabel(state) {
  return `正在用 ${aiModelOf(state)} 识别截图…`;
}

// mock "test connection" — believable timing + heuristics, no network.
function aiTestConnection(providerId) {
  const cfg = _aiState.providers[providerId] || {};
  const key = (cfg.apiKey || "").trim();
  const p = AI_PROVIDER_MAP[providerId];
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!key) { resolve({ ok: false, msg: "请先填写 API Key" }); return; }
      if (p.keyPrefix && !key.startsWith(p.keyPrefix)) {
        resolve({ ok: false, msg: `Key 格式不符（应以 ${p.keyPrefix} 开头）` }); return; }
      if (key.length < 12) { resolve({ ok: false, msg: "API Key 无效或过短" }); return; }
      resolve({ ok: true, msg: `连接成功 · ${aiModelOf(_aiState, providerId)} 可用` });
    }, 1100);
  });
}

// ---- React hook -------------------------------------------------------------
function useAiSettings() {
  const state = React.useSyncExternalStore(aiSubscribe, aiSnapshot, aiSnapshot);
  return {
    state,
    providers: AI_PROVIDERS,
    activeProvider: AI_PROVIDER_MAP[state.activeProvider],
    activeConfig: state.providers[state.activeProvider],
    activeModel: aiModelOf(state),
    setActiveProvider: aiSetActiveProvider,
    setField: aiSetField,
    isConfigured: (id) => aiIsConfigured(state, id),
    scanLabel: aiScanLabel(state),
    testConnection: aiTestConnection,
  };
}

Object.assign(window, {
  AI_PROVIDERS, AI_PROVIDER_MAP, aiModelOf,
  useAiSettings, aiScanLabel, aiIsConfigured, aiTestConnection,
});
