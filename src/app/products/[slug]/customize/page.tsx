import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { ProductCustomizationStudioPage } from "@/components/customization/ProductCustomizationStudioPage";
import { getProductById, getProductBySlug } from "@/lib/products";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Customization not found" };
  }

  return {
    title: `Customize ${product.name} | HSP Mart`,
    description:
      product.shortDescription || product.description,
  };
}

export default async function ProductCustomizePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const productId = resolvedSearchParams?.product;
  const resolvedProductId = Array.isArray(productId)
    ? productId[0]
    : productId;
  const product = resolvedProductId
    ? getProductById(resolvedProductId)
    : getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const rawQuantity = resolvedSearchParams?.quantity;
  const resolvedQuantity = Array.isArray(rawQuantity) ? rawQuantity[0] : rawQuantity;
  const parsedQuantity = resolvedQuantity ? Number(resolvedQuantity) : 1;
  const initialQuantity = Number.isFinite(parsedQuantity)
    ? Math.min(Math.max(1, Math.floor(parsedQuantity)), 999)
    : 1;

  return (
    <ProductCustomizationStudioPage
      product={product}
      initialQuantity={initialQuantity}
    />
  );
}
