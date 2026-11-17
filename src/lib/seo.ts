import { company } from "@/data/company";
import { isInStock } from "@/lib/productAvailability";
import type { Product } from "@/types/product";

export function organizationJsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.companyName,
    legalName: company.legalName,
    url: company.contact.website,
    description: company.description,
    logo: `${company.contact.website}/images/hsp-mart-logo.png`,
  };

  if (company.contact.email || company.contact.phone) {
    data.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
      ...(company.contact.email ? { email: company.contact.email } : {}),
      ...(company.contact.phone ? { telephone: company.contact.phone } : {}),
    };
  }

  return data;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function productJsonLd(product: Product) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: company.companyName,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.price,
      url: `${company.contact.website}/products/${product.slug}`,
      availability: isInStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  if (product.images.length > 0) {
    data.image = product.images;
  }

  return data;
}
