"use client";

import Image, { type ImageProps } from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";

/**
 * next/image for server components: applies the Shopify CDN loader on the
 * client side (functions cannot cross the server → client boundary).
 */
export function CatalogImage(props: ImageProps) {
  return <Image {...props} loader={props.loader ?? shopifyImageLoader(props.src)} />;
}
