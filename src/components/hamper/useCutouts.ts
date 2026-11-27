"use client";

import { useEffect, useState } from "react";
import { loadCutout, type Cutout } from "./cutout";

/** Loads cut-outs for the given image URLs; the map fills in as each one is ready. */
export function useCutouts(srcs: (string | null | undefined)[]): Map<string, Cutout> {
  const key = [...new Set(srcs.filter(Boolean) as string[])].sort().join("|");
  const [map, setMap] = useState<Map<string, Cutout>>(() => new Map());
  useEffect(() => {
    let live = true;
    const list = key ? key.split("|") : [];
    Promise.all(list.map(async (s) => [s, await loadCutout(s)] as const)).then((pairs) => {
      if (!live) return;
      setMap(new Map(pairs.filter((p): p is readonly [string, Cutout] => !!p[1])));
    });
    return () => {
      live = false;
    };
  }, [key]);
  return map;
}
