"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";

type Props = {
  productId: string;
};

export function TrackRecentlyViewed({ productId }: Props) {
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    trackView(productId);
  }, [productId, trackView]);

  return null;
}
