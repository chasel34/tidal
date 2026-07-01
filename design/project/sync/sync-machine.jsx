// Google Drive 同步 — state machine. useSyncFlow(surface, scenarioId) → { state, ...actions }.
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM } = React;

const SYNC_BASE = { screen: "connected", status: "synced", failKind: null, fsCase: "A",
  dialog: null, oauth: false, lastSync: "14:32", source: "网页端" };

function syncPreset(id) {
  const B = SYNC_BASE;
  switch (id) {
    case "disconnected": return { ...B, screen: "disconnected" };
    case "content":      return { ...B, screen: "disconnected", dialog: { type: "content" } };
    case "oauth":        return { ...B, screen: "disconnected", oauth: true };
    case "fsA":          return { ...B, screen: "firstSync", fsCase: "A" };
    case "fsB":          return { ...B, screen: "firstSync", fsCase: "B" };
    case "fsC":          return { ...B, screen: "firstSync", fsCase: "C" };
    case "fsD":          return { ...B, screen: "firstSync", fsCase: "D" };
    case "synced":       return { ...B, status: "synced" };
    case "pending":      return { ...B, status: "pending" };
    case "syncing":      return { ...B, status: "syncing" };
    case "conflict":     return { ...B, status: "conflict" };
    case "failTemp":     return { ...B, status: "failed", failKind: "temp" };
    case "reauth":       return { ...B, status: "reauth" };
    case "badCloud":     return { ...B, status: "failed", failKind: "badCloud" };
    case "localWrite":   return { ...B, status: "failed", failKind: "localWrite" };
    case "disconnect":   return { ...B, dialog: { type: "disconnect" } };
    case "deleteCloud":  return { ...B, dialog: { type: "confirm", kind: "deleteCloud" } };
    case "confirmUp":    return { ...B, dialog: { type: "confirm", kind: "uploadOverwrite" } };
    default:             return { ...B, screen: "disconnected" };
  }
}

function useSyncFlow(surface, scenarioId, nonce) {
  const label = window.SYNC_SURFACE_LABEL[surface];
  const [state, setState] = useStateM(() => syncPreset(scenarioId));
  const timer = useRefM(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  // re-seed whenever the chosen scenario, surface, or reset nonce changes
  useEffectM(() => { clear(); setState(syncPreset(scenarioId)); }, [scenarioId, surface, nonce]);
  useEffectM(() => clear, []);

  const after = (ms, fn) => { clear(); timer.current = setTimeout(fn, ms); };
  const settleSynced = () => setState(s => ({ ...s, status: "synced", failKind: null, lastSync: "刚刚", source: label }));
  const runSync = () => { setState(s => ({ ...s, screen: "connected", status: "syncing", dialog: null, oauth: false })); after(1150, settleSynced); };

  const m = {
    state,
    // connect / oauth
    connect:    () => { setState(s => ({ ...s, oauth: true })); after(1300, () => setState(s => ({ ...s, oauth: false, screen: "firstSync", fsCase: "A" }))); },
    cancelOauth:() => { clear(); setState(s => ({ ...s, oauth: false })); },
    reauthLogin:() => { setState(s => ({ ...s, oauth: true })); after(1300, () => { setState(s => ({ ...s, oauth: false, status: "syncing" })); after(1150, settleSynced); }); },
    // first sync (III)
    firstSync: (action) => {
      if (action === "later")  return setState(s => ({ ...s, screen: "connected", status: "pending", dialog: null }));
      if (action === "finish") return setState(s => ({ ...s, screen: "connected", status: "synced", lastSync: "刚刚", source: label, dialog: null }));
      return runSync(); // upload / restore / syncEmpty
    },
    // dialogs
    openContent:   () => setState(s => ({ ...s, dialog: { type: "content" } })),
    openConflict:  () => setState(s => ({ ...s, dialog: { type: "conflict" } })),
    openDisconnect:() => setState(s => ({ ...s, dialog: { type: "disconnect" } })),
    openConfirm:   (kind) => setState(s => ({ ...s, dialog: { type: "confirm", kind } })),
    closeDialog:   () => setState(s => ({ ...s, dialog: null })),
    // connected ops (IV / VI / VII)
    syncNow:   runSync,
    retry:     runSync,
    markEdited:() => setState(s => ({ ...s, status: "pending" })),
    confirm: (kind) => {
      if (kind === "deleteCloud") { clear(); return setState({ ...SYNC_BASE, screen: "disconnected" }); }
      runSync();
    },
    doDisconnect: () => { clear(); setState({ ...SYNC_BASE, screen: "disconnected" }); },
  };
  return m;
}

window.useSyncFlow = useSyncFlow;
window.syncPreset = syncPreset;
