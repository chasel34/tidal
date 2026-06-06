"use client";

import { useState } from "react";
import {
  aiResolve,
  OCR_PROVIDER_MAP,
  OCR_PROVIDERS,
  type OcrProviderId,
} from "@tidal/core";
import type { Palette } from "@/lib/theme";
import { ocrTestConnection } from "@/lib/ocr-client";
import { useAiByok } from "@/store/useAiByok";
import { Modal } from "@/components/shared/ui/Modal";
import { tidalBtn, tidalInput } from "@/components/shared/ui/styles";

function Field({
  label,
  hint,
  children,
  P,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  P: Palette;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: P.muted, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: P.subtle, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export function AiSettingsModal({ P, onClose }: { P: Palette; onClose: () => void }) {
  const state = useAiByok();
  const setActiveProvider = useAiByok((s) => s.setActiveProvider);
  const setField = useAiByok((s) => s.setField);
  const pid = state.activeProvider;
  const provider = OCR_PROVIDER_MAP[pid];
  const cfg = state.providers[pid];

  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  return (
    <Modal P={P} title="智能识别 · AI 设置" onClose={onClose} width={480}>
      <div style={{ fontSize: 13, color: P.muted, marginBottom: 18, lineHeight: 1.6 }}>
        截图导入由你自己的多模态模型驱动（BYOK）。API Key 只保存在本机，绝不经过任何中转服务器。
      </div>

      {OCR_PROVIDERS.length > 1 && (
        <Field label="服务商" P={P}>
          <div style={{ display: "flex", gap: 8 }}>
            {OCR_PROVIDERS.map((p) => {
              const active = p.id === pid;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProvider(p.id as OcrProviderId)}
                  style={{
                    ...tidalBtn(P, active ? "primary" : undefined),
                    flex: 1,
                    padding: "9px 12px",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="API Key" hint={provider.docHint} P={P}>
        <div style={{ position: "relative" }}>
          <input
            type={showKey ? "text" : "password"}
            value={cfg.apiKey}
            onChange={(e) => setField(pid, "apiKey", e.target.value)}
            placeholder={provider.keyPlaceholder}
            style={{ ...tidalInput(P), paddingRight: 56 }}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: P.subtle,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showKey ? "隐藏" : "显示"}
          </button>
        </div>
      </Field>

      <Field label="识别模型" hint={provider.modelHint} P={P}>
        <input
          value={cfg.model}
          onChange={(e) => setField(pid, "model", e.target.value)}
          placeholder={provider.defaultModel}
          style={tidalInput(P)}
        />
      </Field>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: P.muted,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: showAdvanced ? 12 : 0,
        }}
      >
        {showAdvanced ? "▾ 高级" : "▸ 高级（API 域名）"}
      </button>
      {showAdvanced && (
        <Field label="API 域名（Base URL）" P={P}>
          <input
            value={cfg.baseURL}
            onChange={(e) => setField(pid, "baseURL", e.target.value)}
            placeholder={provider.defaultBaseURL}
            style={tidalInput(P)}
          />
        </Field>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <button onClick={runTest} disabled={test.loading} style={tidalBtn(P)}>
          {test.loading ? "测试中…" : "测试连接"}
        </button>
        {test.msg && (
          <span
            style={{
              fontSize: 12.5,
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
          fontSize: 11.5,
          color: P.subtle,
          lineHeight: 1.6,
          padding: "10px 12px",
          borderRadius: 9,
          background: P.isDark ? "#16161a" : "#faf9f5",
          border: `1px solid ${P.line}`,
        }}
      >
        ⚠ 隐私提示：使用 AI 识别时，你上传的持仓截图会发送至所选服务商（{provider.name}）进行识别。请确认你信任该服务商再使用。
      </div>
    </Modal>
  );
}
