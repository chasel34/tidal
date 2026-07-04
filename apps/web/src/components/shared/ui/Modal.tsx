"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import type { Palette } from "@/lib/theme";

interface ModalProps {
  P: Palette;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ P, title, onClose, children, width = 460 }: ModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          style={{
            position: "fixed",
            inset: 0,
            background: P.overlay,
            backdropFilter: "blur(2px)",
            zIndex: 100,
          }}
        />
        <Dialog.Popup
          style={{
            position: "fixed",
            top: "9vh",
            left: "50%",
            transform: "translateX(-50%)",
            width,
            maxWidth: "90%",
            background: P.panel,
            border: `1px solid ${P.line}`,
            borderRadius: 16,
            boxShadow: P.isDark
              ? "0 24px 70px rgba(0,0,0,0.6)"
              : "0 24px 70px rgba(40,30,20,0.18)",
            overflow: "hidden",
            zIndex: 101,
            outline: "none",
            fontFamily:
              "'PingFang SC', 'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: `1px solid ${P.line}`,
            }}
          >
            <Dialog.Title
              style={{ fontSize: 15, color: P.text, fontWeight: 500, margin: 0 }}
            >
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="关闭"
              style={{
                background: "transparent",
                border: "none",
                color: P.muted,
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </Dialog.Close>
          </div>
          <div style={{ padding: 20 }}>{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
