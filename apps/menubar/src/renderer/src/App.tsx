import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PopoverApp } from "@/components/PopoverApp";
import { SettingsApp } from "@/components/SettingsApp";
import { useMenubarStore } from "@/store/useMenubarStore";
import { usePalette } from "@/hooks/usePalette";

export function App() {
  const hydrated = useMenubarStore((state) => state.hydrated);
  const view = useMenubarStore((state) => state.view);
  const load = useMenubarStore((state) => state.load);
  const queryClient = useQueryClient();
  const P = usePalette();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return window.tidal.onConfigChanged((config) => {
      useMenubarStore.getState().setConfig(config);
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      }
      if (event.metaKey && event.key === ",") {
        event.preventDefault();
        void window.tidal.openSettings();
      }
      if (event.key === "Escape" && view === "popover") {
        void window.tidal.closePopover();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queryClient, view]);

  if (!hydrated) {
    return <div style={{ width: "100%", height: "100%", background: P.panel }} />;
  }

  return view === "settings" ? <SettingsApp /> : <PopoverApp />;
}
