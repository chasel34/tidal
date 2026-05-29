import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Tidal · 移动版",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ minHeight: "100dvh" }}>
      <style>{`@keyframes msheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      {children}
    </div>
  );
}
