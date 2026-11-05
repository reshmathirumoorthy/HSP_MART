/**
 * Development-time catalogue validation (no external deps).
 * Distinguishes ERROR (required storefront data) vs WARNING (optional gaps).
 *
 * Image *file* existence is checked by scripts/validate-catalogue.mjs (Node only)
 * so this module stays safe for shared imports.
 */

import { productCategories } from "@/data/categories";
import { products } from "@/data/products";
import { validateProductCustomizationConfig } from "@/lib/customization/validateConfig";
import { hasVerifiedProductImage } from "@/lib/productModel";
import type { Product } from "@/types/product";

export type CatalogueIssue = {
  level: "error" | "warning";
  code:
    | "missing-name"
    | "missing-sku"
    | "missing-slug"
    | "missing-category"
    | "invalid-price"
    | "invalid-stock"
    | "missing-image"
    | "invalid-image-path"
    | "invalid-slug"
    | "duplicate-sku"
    | "duplicate-slug"
    | "duplicate-id"
    | "invalid-customization"
    | "duplicate-surface-id"
    | "duplicate-view-id"
    | "duplicate-frame-order"
    | "invalid-orbit-sequence"
    | "invalid-surface-ref"
    | "invalid-view-ref"
    | "invalid-element-type"
    | "invalid-coordinates"
    | "invalid-variant-ref"
    | "malformed-customization-config"
    | "optional-missing";
  message: string;
  productId?: string;
};

export type CatalogueAuditReport = {
  productCount: number;
  errors: CatalogueIssue[];
  warnings: CatalogueIssue[];
  duplicateSkus: string[];
  duplicateSlugs: string[];
  productsMissingImages: string[];
  productsWithBrokenImagePaths: string[];
};

const STOCK_STATUSES = new Set(["in_stock", "low_stock", "out_of_stock"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidImagePath(imagePath: string): boolean {
  if (typeof imagePath !== "string" || !imagePath.trim()) return false;
  if (!imagePath.startsWith("/images/")) return false;
  if (imagePath.includes("..")) return false;
  return true;
}

export function validateCatalogue(source: Product[] = products): CatalogueIssue[] {
  const issues: CatalogueIssue[] = [];
  const ids = new Set<string>();
  const skus = new Set<string>();
  const slugs = new Set<string>();
  const categorySlugs = new Set(
    productCategories
      .filter((category) => category.slug !== "all")
      .map((category) => category.slug),
  );

  for (const product of source) {
    const id = product.id || "(unknown)";

    if (!product.id) {
      issues.push({
        level: "error",
        code: "missing-name",
        message: "Product missing id",
      });
    }
    if (!product.name?.trim()) {
      issues.push({
        level: "error",
        code: "missing-name",
        message: `${id}: missing name`,
        productId: product.id,
      });
    }
    if (!product.sku?.trim()) {
      issues.push({
        level: "error",
        code: "missing-sku",
        message: `${id}: missing sku`,
        productId: product.id,
      });
    }
    if (!product.slug?.trim()) {
      issues.push({
        level: "error",
        code: "missing-slug",
        message: `${id}: missing slug`,
        productId: product.id,
      });
    } else if (!SLUG_PATTERN.test(product.slug)) {
      issues.push({
        level: "error",
        code: "invalid-slug",
        message: `${id}: invalid slug "${product.slug}"`,
        productId: product.id,
      });
    }

    if (!product.category?.trim() || !product.categorySlug) {
      issues.push({
        level: "error",
        code: "missing-category",
        message: `${id}: missing category`,
        productId: product.id,
      });
    } else if (!categorySlugs.has(product.categorySlug)) {
      issues.push({
        level: "error",
        code: "missing-category",
        message: `${id}: unknown categorySlug ${product.categorySlug}`,
        productId: product.id,
      });
    }

    if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0) {
      issues.push({
        level: "error",
        code: "invalid-price",
        message: `${id}: invalid price`,
        productId: product.id,
      });
    }

    if (!STOCK_STATUSES.has(product.stockStatus)) {
      issues.push({
        level: "error",
        code: "invalid-stock",
        message: `${id}: invalid stockStatus`,
        productId: product.id,
      });
    }

    if (!Array.isArray(product.images) || !hasVerifiedProductImage(product)) {
      issues.push({
        level: "error",
        code: "missing-image",
        message: `${id}: missing primary image (geometric fallback would show)`,
        productId: product.id,
      });
    } else {
      product.images.forEach((imagePath, index) => {
        if (!isValidImagePath(imagePath)) {
          issues.push({
            level: "error",
            code: "invalid-image-path",
            message: `${id}: invalid image path at index ${index}`,
            productId: product.id,
          });
        }
      });
    }

    if (product.customizable) {
      // Authored config is preferred; synthesized studio config covers the rest.
      // Only warn when an authored block exists but is disabled.
      if (product.customization && !product.customization.enabled) {
        issues.push({
          level: "warning",
          code: "invalid-customization",
          message: `${id}: customization config present but enabled=false`,
          productId: product.id,
        });
      }
    }

    if (product.customization) {
      for (const configIssue of validateProductCustomizationConfig(product)) {
        issues.push({
          level: configIssue.level,
          code: configIssue.code,
          message: configIssue.message,
          productId: configIssue.productId,
        });
      }
    }

    if (!product.shortDescription?.trim()) {
      issues.push({
        level: "warning",
        code: "optional-missing",
        message: `${id}: missing shortDescription`,
        productId: product.id,
      });
    }
    if (!product.subcategory?.trim()) {
      issues.push({
        level: "warning",
        code: "optional-missing",
        message: `${id}: missing subcategory`,
        productId: product.id,
      });
    }
    if (!product.currency) {
      issues.push({
        level: "error",
        code: "optional-missing",
        message: `${id}: missing currency`,
        productId: product.id,
      });
    }

    if (product.id) {
      if (ids.has(product.id)) {
        issues.push({
          level: "error",
          code: "duplicate-id",
          message: `Duplicate id: ${product.id}`,
          productId: product.id,
        });
      }
      ids.add(product.id);
    }
    if (product.sku) {
      if (skus.has(product.sku)) {
        issues.push({
          level: "error",
          code: "duplicate-sku",
          message: `Duplicate sku: ${product.sku}`,
          productId: product.id,
        });
      }
      skus.add(product.sku);
    }
    if (product.slug) {
      if (slugs.has(product.slug)) {
        issues.push({
          level: "error",
          code: "duplicate-slug",
          message: `Duplicate slug: ${product.slug}`,
          productId: product.id,
        });
      }
      slugs.add(product.slug);
    }
  }

  return issues;
}

export function auditCatalogue(source: Product[] = products): CatalogueAuditReport {
  const issues = validateCatalogue(source);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return {
    productCount: source.length,
    errors,
    warnings,
    duplicateSkus: errors
      .filter((issue) => issue.code === "duplicate-sku")
      .map((issue) => issue.message.replace("Duplicate sku: ", "")),
    duplicateSlugs: errors
      .filter((issue) => issue.code === "duplicate-slug")
      .map((issue) => issue.message.replace("Duplicate slug: ", "")),
    productsMissingImages: errors
      .filter((issue) => issue.code === "missing-image" && issue.productId)
      .map((issue) => issue.productId as string),
    productsWithBrokenImagePaths: errors
      .filter((issue) => issue.code === "invalid-image-path" && issue.productId)
      .map((issue) => issue.productId as string),
  };
}

export function assertCatalogueValid(source: Product[] = products): void {
  const errors = validateCatalogue(source).filter((issue) => issue.level === "error");
  if (errors.length > 0) {
    throw new Error(
      `Catalogue validation failed:\n${errors.map((issue) => `- ${issue.message}`).join("\n")}`,
    );
  }
}
