"use client";

import { useState } from "react";
import { aiResolve, OCR_PROVIDER_MAP } from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { ocrTestConnection } from "@/lib/ocr-client";
import { useAiByok } from "@/store/useAiByok";

function inputStyle(P: Palette): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: P.isDark ? "#16161a" : "#faf9f5",
    border: `1px solid ${P.line}`,
    borderRadius: 12,
    padding: "13px 14px",
    fontSize: 16,
    color: P.text,
    outline: "none",
  };
}

/** Inner form for 智能识别 — rendered as a sub-page of the merged 设置 sheet. */
export function MAiSettingsBody({ P }: { P: Palette }) {
  const state = useAiByok();
  const setField = useAiByok((s) => s.setField);
  const pid = state.activeProvider;
  const provider = OCR_PROVIDER_MAP[pid];
  const cfg = state.providers[pid];
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<{ loading: boolean; ok?: boolean; msg?: string }>({
    loading: false,
  });

  async function runTest() {
    setTest({ loading: true });
    try {
      await ocrTestConnection(aiResolve(state));
      setTest({ loading: false, ok: true, msg: "连接成功，识别模型可用" });
    } catch (e) {
      setTest({ loading: false, ok: false, msg: e instanceof Error ? e.message : "连接失败" });
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: P.muted,
    display: "block",
    marginBottom: 7,
  };

  return (
    <>
      <div style={{ fontSize: 13.5, color: P.muted, marginBottom: 18, lineHeight: 1.6 }}>
        截图导入由你自己的多模态模型驱动。API Key 只保存在本机。
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>API Key</label>
        <div style={{ position: "relative" }}>
          <input
            type={showKey ? "text" : "password"}
            value={cfg.apiKey}
            onChange={(e) => setField(pid, "apiKey", e.target.value)}
            placeholder={provider.keyPlaceholder}
            style={{ ...inputStyle(P), paddingRight: 60 }}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: P.subtle,
              fontSize: 13,
            }}
          >
            {showKey ? "隐藏" : "显示"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: P.subtle, marginTop: 6 }}>{provider.docHint}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>识别模型</label>
        <input
          value={cfg.model}
          onChange={(e) => setField(pid, "model", e.target.value)}
          placeholder={provider.defaultModel}
          style={inputStyle(P)}
        />
        <div style={{ fontSize: 12, color: P.subtle, marginTop: 6 }}>{provider.modelHint}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>API 域名（可选）</label>
        <input
          value={cfg.baseURL}
          onChange={(e) => setField(pid, "baseURL", e.target.value)}
          placeholder={provider.defaultBaseURL}
          style={inputStyle(P)}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button
          onClick={runTest}
          disabled={test.loading}
          style={{
            background: "transparent",
            border: `1px solid ${P.line}`,
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 14,
            color: P.text,
          }}
        >
          {test.loading ? "测试中…" : "测试连接"}
        </button>
        {test.msg && (
          <span
            style={{
              fontSize: 13,
              color: test.ok
                ? P.isDark
                  ? "#6ecf6e"
                  : "#2a7a2a"
                : P.isDark
                  ? "#cf6e6e"
                  : "#9a2a2a",
            }}
          >
            {test.ok ? "✓ " : "⚠ "}
            {test.msg}
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: P.subtle,
          lineHeight: 1.6,
          padding: "12px 14px",
          borderRadius: 12,
          background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`,
          marginBottom: 12,
        }}
      >
        ⚠ 隐私提示：使用 AI 识别时，你上传的持仓截图会发送至所选服务商（{provider.name}）进行识别。
      </div>
    </>
  );
}
