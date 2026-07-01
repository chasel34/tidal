// Google Drive 同步 — mock data + status/scenario metadata (no JSX).

window.SYNC = {
  account: { email: "lin.chen@gmail.com", name: "Lin Chen", initial: "L" },

  // summaries used by the first-sync cases, conflict, and connected screens
  local:      { holdings: 8, watch: 12, cash: 48230, at: "今天 14:28" },
  localEmpty: { holdings: 0, watch: 0, cash: 0,     at: "—" },
  cloud:      { holdings: 7, watch: 12, cash: 50000, at: "昨天 21:05", source: "网页端" },

  // what does / doesn't sync (section: 查看同步内容)
  synced: [
    { k: "持仓", d: "标的、数量、成本" },
    { k: "自选", d: "关注列表与分组" },
    { k: "现金", d: "现金余额" },
    { k: "主题", d: "明暗与强调色" },
    { k: "周期", d: "走势默认区间" },
    { k: "排序偏好", d: "列表排序方式" },
    { k: "菜单栏偏好", d: "弹窗显示项" },
    { k: "提醒规则", d: "价格提醒设置" },
    { k: "其他用户配置", d: "各项偏好开关" },
  ],
  notSynced: [
    { k: "AI API Key", d: "仅保存在本设备" },
    { k: "行情缓存", d: "随时可重新拉取" },
    { k: "派生收益数据", d: "由配置实时计算" },
    { k: "截图", d: "导入用的临时图片" },
    { k: "其他临时数据", d: "会话级临时状态" },
  ],
};

// surface label shown as "最近同步来源"
window.SYNC_SURFACE_LABEL = { web: "网页端", menubar: "菜单栏客户端", mobile: "移动网页" };

// scenario rail — grouped presets. Each id maps to a machine setup in sync-machine.
window.SYNC_SCENARIOS = [
  { group: "入口 · 未连接", items: [
    { id: "disconnected", label: "未连接" },
    { id: "content",      label: "查看同步内容" },
  ]},
  { group: "连接 · 首次同步", items: [
    { id: "oauth", label: "正在授权" },
    { id: "fsA",   label: "A · 本机有 / 云端空" },
    { id: "fsB",   label: "B · 两边都空" },
    { id: "fsC",   label: "C · 云端有 / 本机空" },
    { id: "fsD",   label: "D · 两边都有" },
  ]},
  { group: "已连接 · 日常", items: [
    { id: "synced",  label: "已同步" },
    { id: "pending", label: "有本机更改，等待同步" },
    { id: "syncing", label: "正在同步" },
  ]},
  { group: "冲突", items: [
    { id: "conflict", label: "发现同步冲突" },
  ]},
  { group: "同步失败", items: [
    { id: "failTemp",   label: "网络 / API 临时失败" },
    { id: "reauth",     label: "需要重新登录" },
    { id: "badCloud",   label: "云端数据无法识别" },
    { id: "localWrite", label: "无法保存到本机" },
  ]},
  { group: "断开 · 危险操作", items: [
    { id: "disconnect",  label: "断开连接确认" },
    { id: "deleteCloud", label: "删除云端数据（二次确认）" },
    { id: "confirmUp",   label: "覆盖确认（通用）" },
  ]},
];

// status indicator metadata — the 8 entry states. tone → color/icon resolved in bits.
window.syncStatusMeta = function (screen, status) {
  if (screen === "disconnected") return { label: "未连接", tone: "muted", icon: "CloudOff" };
  if (screen === "firstSync")    return { label: "待首次同步", tone: "info", icon: "Cloud" };
  switch (status) {
    case "synced":   return { label: "已同步",            tone: "ok",    icon: "CloudCheck" };
    case "pending":  return { label: "等待同步",          tone: "warn",  icon: "CloudCog" };
    case "syncing":  return { label: "正在同步…",         tone: "info",  icon: "RefreshCw" };
    case "failed":   return { label: "同步失败",          tone: "error", icon: "CloudAlert" };
    case "reauth":   return { label: "需要重新登录",      tone: "error", icon: "KeyRound" };
    case "conflict": return { label: "发现冲突",          tone: "error", icon: "GitMerge" };
    default:         return { label: "已连接",            tone: "ok",    icon: "Cloud" };
  }
};

// ¥ formatting (mirrors calm util, kept local so this file is standalone-safe)
window.syncMoney = function (n) {
  return "¥" + Math.round(n).toLocaleString("en-US");
};
