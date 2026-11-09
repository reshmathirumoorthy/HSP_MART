import type { Product } from "@/data/products";
import { isProductCustomizable } from "@/lib/productModel";
import { parseDescription } from "@/lib/productDescription";
import styles from "./ProductInformation.module.css";

type Props = {
  product: Product;
};

function customizationLabel(product: Product): string | null {
  if (!isProductCustomizable(product)) return null;
  if (product.customizationTypes?.length) {
    return product.customizationTypes
      .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
      .join(", ");
  }
  return "Text, logo, image";
}

export function ProductInformation({ product }: Props) {
  const details: { label: string; value: string }[] = [
    { label: "SKU", value: product.sku },
    { label: "Category", value: product.category },
  ];

  if (product.subcategory) {
    details.push({ label: "Subcategory", value: product.subcategory });
  }

  details.push({ label: "Unit", value: product.unit });

  const customization = customizationLabel(product);
  if (customization) {
    details.push({ label: "Customization", value: customization });
  }

  if (product.bulkAvailable) {
    details.push({
      label: "Bulk supply",
      value: product.minOrderQuantity
        ? `Available · min. ${product.minOrderQuantity} units`
        : "Available",
    });
  }

  if (product.packagingOptions?.length) {
    details.push({
      label: "Packaging",
      value: product.packagingOptions
        .map((option) => option.charAt(0).toUpperCase() + option.slice(1))
        .join(", "),
    });
  }

  if (product.brand) {
    details.push({ label: "Brand", value: product.brand });
  }

  if (product.manufacturer) {
    details.push({ label: "Manufacturer", value: product.manufacturer });
  }

  if (product.origin) {
    details.push({ label: "Origin", value: product.origin });
  }

  const specificationEntries = product.specifications
    ? Object.entries(product.specifications).filter(([, value]) => Boolean(value))
    : [];

  return (
    <section
      className={styles.section}
      id="product-details"
      aria-labelledby="about-heading"
    >
      <div className={styles.block}>
        <h2 id="about-heading" className={styles.heading}>
          About the product
        </h2>
        <div className={styles.copy}>
          {parseDescription(product.description).map((block, index) =>
            block.type === "p" ? (
              <p key={index}>{block.text}</p>
            ) : (
              <div key={index} className={styles.listBlock}>
                {block.title ? <p className={styles.listTitle}>{block.title}</p> : null}
                <ul className={styles.list}>
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      </div>

      <div className={`${styles.block} ${styles.aside}`}>
        <h2 className={styles.heading}>Details</h2>
        <dl className={styles.specs}>
          {details.map((item) => (
            <div key={item.label} className={styles.specRow}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {specificationEntries.length > 0 ? (
        <div className={styles.block}>
          <h2 className={styles.heading}>Specifications</h2>
          <dl className={styles.specs}>
            {specificationEntries.map(([label, value]) => (
              <div key={label} className={styles.specRow}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
