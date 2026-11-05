import Link from "next/link";
import { formatPrice } from "@/data/products";
import { clearDemoCheckoutSnapshot, type DemoOrderSnapshot } from "@/lib/checkout";
import {
  customizationDetails,
  formatCustomizationSummary,
} from "@/components/customization/customization.utils";
import styles from "./OrderSuccess.module.css";

type Props = {
  order: DemoOrderSnapshot;
};

export function OrderSuccess({ order }: Props) {
  return (
    <div className={styles.success} data-nav-surface="light">
      <div>
        <p className={styles.label}>Order demo complete</p>
        <h1 className={styles.title}>Order received</h1>
      </div>

      <p className={styles.copy}>
        Thank you for shopping with HSP Mart. Your order has been recorded for
        this frontend demonstration only.
      </p>

      <div className={styles.panel}>
        <p className={styles.refLabel}>Order reference</p>
        <p className={styles.ref}>{order.reference}</p>
        <p className={styles.disclaimer}>
          No payment was processed and no order was created in ERPNext or any
          backend system.
        </p>

        <div className={styles.summary}>
          {order.items.map((item, index) => {
            const customLabel = formatCustomizationSummary(item.customization);
            const details = customizationDetails(item.customization);
            return (
              <div key={`${item.productId}-${index}`} className={styles.item}>
                <span>
                  {item.name} × {item.quantity}
                  {details.length > 0 ? (
                    <>
                      <br />
                      <small>{details.join(" · ")}</small>
                    </>
                  ) : customLabel ? (
                    <>
                      <br />
                      <small>Customization: {customLabel}</small>
                    </>
                  ) : null}
                </span>
                <span>{formatPrice(item.lineTotal)}</span>
              </div>
            );
          })}
          <div className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link
          href="/products"
          className="btn btn--dark"
          onClick={() => clearDemoCheckoutSnapshot()}
        >
          Continue shopping
        </Link>
        <Link href="/" className={styles.ghost}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
