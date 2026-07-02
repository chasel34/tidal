import { Switch } from "@base-ui/react/switch";
import type { CSSProperties, ReactNode } from "react";
import type { Palette } from "@shared/theme";

export function IconButton({
  label,
  onClick,
  children,
  P,
  style,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  P: Palette;
  style?: CSSProperties;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        border: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: P.muted,
        background: "transparent",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function CalmSwitch({
  checked,
  onChange,
  P,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  P: Palette;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      style={{
        width: 38,
        height: 23,
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        background: checked ? P.accent : P.isDark ? "#3a3a44" : "#dcd8cf",
        transition: "background .18s ease",
      }}
    >
      <Switch.Thumb
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 17 : 2,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
          transition: "left .18s ease",
        }}
      />
    </Switch.Root>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  P,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  P: Palette;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        borderRadius: 9,
        background: P.isDark ? "#19191d" : "#ece9e1",
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              whiteSpace: "nowrap",
              color: active ? P.text : P.muted,
              background: active ? P.panel : "transparent",
              boxShadow: active
                ? P.isDark
                  ? "0 1px 2px rgba(0,0,0,0.4)"
                  : "0 1px 2px rgba(40,30,20,0.12)"
                : "none",
              fontWeight: active ? 500 : 400,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectBox<T extends string | number>({
  value,
  options,
  onChange,
  P,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  P: Palette;
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        const sample = options[0]?.value;
        onChange((typeof sample === "number" ? Number(raw) : raw) as T);
      }}
      style={{
        appearance: "none",
        background: P.isDark ? "#19191d" : "#f4f1ea",
        color: P.text,
        border: `1px solid ${P.line}`,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Card({
  children,
  P,
  style,
}: {
  children: ReactNode;
  P: Palette;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: P.panel,
        border: `1px solid ${P.line}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: P.isDark ? "none" : "0 1px 2px rgba(40,30,20,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Row({
  label,
  sub,
  children,
  P,
  last,
}: {
  label: string;
  sub?: string;
  children: ReactNode;
  P: Palette;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        borderBottom: last ? "none" : `1px solid ${P.lineSoft}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: P.text }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11.5, color: P.subtle, marginTop: 2, lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

export function GroupLabel({ children, P }: { children: ReactNode; P: Palette }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        color: P.subtle,
        letterSpacing: "0.04em",
        margin: "0 0 8px 4px",
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  P,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  P: Palette;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: P.accent,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontSize: 12.5,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  P,
  danger,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  P: Palette;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 12px",
        borderRadius: 8,
        border: `1px solid ${P.line}`,
        background: "transparent",
        color: danger ? (P.isDark ? "#ff5d5d" : "#d6342f") : P.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontSize: 12.5,
      }}
    >
      {children}
    </button>
  );
}
