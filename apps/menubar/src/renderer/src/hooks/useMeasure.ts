import { useLayoutEffect, useRef, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

// Observes an element's content box and reports its size. Shared by the area
// chart (needs width) and the popover shrink-wrap (needs height).
export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ width: cr.width, height: cr.height });
    });
    ro.observe(node);
    const rect = node.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
