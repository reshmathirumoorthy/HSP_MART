"use client";

import Image, { type ImageProps } from "next/image";

/** next/image wrapper for catalogue photos (self-hosted in /images/catalog). */
export function CatalogImage(props: ImageProps) {
  return <Image {...props} />;
}
