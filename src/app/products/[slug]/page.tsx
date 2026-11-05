import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { ProductDetail } from "@/components/ProductDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getProductBySlug,
  getRelatedProducts,
  getSimilarProducts,
} from "@/lib/products";
import { MIN_SIMILAR_PRODUCTS } from "@/lib/discovery";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  return {
    title: product.name,
    description: product.shortDescription || product.description,
    openGraph: {
      title: `${product.name} | HSP Mart`,
      description: product.shortDescription || product.description,
      url: `/products/${product.slug}`,
      siteName: "HSP Mart",
      type: "website",
      images: product.images[0]
        ? [{ url: product.images[0], alt: product.name }]
        : [{ url: "/images/hsp-mart-logo.png", alt: "HSP Mart" }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product);
  const similarCandidates = getSimilarProducts(
    product,
    undefined,
    4,
    related.map((item) => item.id),
  );
  const similar =
    similarCandidates.length >= MIN_SIMILAR_PRODUCTS ? similarCandidates : [];

  const breadcrumbTrail = [
    { name: "Home", url: "https://hspmart.com/" },
    { name: "Products", url: "https://hspmart.com/products" },
    {
      name: product.category,
      url: `https://hspmart.com/products?category=${product.categorySlug}`,
    },
    ...(product.subcategory
      ? [
          {
            name: product.subcategory,
            url: `https://hspmart.com/products?category=${product.categorySlug}&subcategory=${encodeURIComponent(product.subcategory)}`,
          },
        ]
      : []),
    { name: product.name },
  ];

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbTrail)} />
      <ProductDetail product={product} related={related} similar={similar} />
    </>
  );
}
