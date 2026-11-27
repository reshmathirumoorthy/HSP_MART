import type { Metadata } from "next";
import { HamperBuilder, type BuilderBox, type BuilderItem } from "@/components/hamper/HamperBuilder";
import type { Model3d } from "@/lib/product3d";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Build your own hamper",
  description: "Choose a hamper box, fill it with products that fit, and see it packed to scale in 2D and 3D.",
};

const frontPhoto = (m?: Model3d) => (m?.kind === "photos" ? m.faces.front : undefined);

export default async function BuildHamperPage() {
  const { products } = await loadSiteData();
  // Only products and boxes with a complete 3D model (and size) are offered, so the preview is what we deliver.
  const live = products.filter((p) => p.active && p.stockStatus !== "out_of_stock" && p.hamperReady && p.model3d);
  const boxes: BuilderBox[] = live
    .filter((p) => p.packingKind === "hamper_box" && p.dimensions && p.maxLoadG)
    .map((p) => ({
      id: p.id, name: p.name, price: p.price, image: p.images[0] ?? null, ...p.dimensions!, maxLoadG: p.maxLoadG!,
      tareG: p.weightG ?? 0, paddingMm: p.hamperBox?.paddingMm, maxFillPercent: p.hamperBox?.maxFillPercent,
      wallThicknessMm: p.hamperBox?.wallThicknessMm ?? 6, boxStyle: p.hamperBox?.boxStyle ?? "kraft",
      filler: p.hamperBox?.filler ?? "shred", model3d: p.model3d!,
    }));
  const items: BuilderItem[] = live
    .filter((p) => p.packingKind !== "hamper_box" && p.dimensions && p.weightG && p.price > 0)
    .map((p) => ({
      // The preview uses the product's clean hamper photo when the admin has added one, else its main photo.
      productId: p.id, name: p.name, price: p.price, image: p.hamperImage ?? frontPhoto(p.model3d) ?? p.images[0] ?? null, category: p.category,
      ...p.dimensions!, weightG: p.weightG!, orientation: p.orientation ?? "any", fragile: !!p.fragile,
      model3d: p.model3d!, dims: p.dimensions!,
    }));
  return <HamperBuilder boxes={boxes} items={items} />;
}
