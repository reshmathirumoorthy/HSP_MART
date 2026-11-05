import Link from "next/link";
import { formatPrice } from "@/data/products";
import { ProductVisual } from "@/components/ProductVisual";
import { getProductById } from "@/lib/cart";
import { paymentMethodLabel } from "@/lib/checkout";
import {
  formatAccountDate,
  orderStatusLabel,
  type Order,
} from "@/data/account";
import { StatusBadge } from "@/components/account/StatusBadge";
import { BuyAgainButton } from "@/components/account/BuyAgainButton";
import styles from "./account.module.css";

type Props = {
  order: Order;
};

export function OrderDetailView({ order }: Props) {
  const trackingEvents = order.trackingEvents ?? [];

  return (
    <div className={styles.content}>
      <p className={styles.note}>
        Demo order record for storefront preview. Not a live ERPNext Sales
        Order.
      </p>

      <div className={styles.cardTop}>
        <div>
          <p className={styles.label}>Order</p>
          <h2 className={styles.cardRef}>{order.reference}</h2>
          <p className={styles.meta}>
            Placed {formatAccountDate(order.placedAt)}
          </p>
        </div>
        <StatusBadge label={orderStatusLabel(order.status)} />
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="order-items-heading">
          <h3 id="order-items-heading" className={styles.panelTitle}>
            Products
          </h3>
          <div>
            {order.items.map((item, itemIndex) => {
              const product = getProductById(item.productId);
              return (
                <div
                  key={`${item.productId}-${item.quantity}-${itemIndex}`}
                  className={styles.itemRow}
                >
                  <div className={styles.visual}>
                    {product ? (
                      <ProductVisual
                        product={product}
                        variant="compact"
                        sizes="72px"
                      />
                    ) : null}
                  </div>
                  <div className={styles.itemMeta}>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className={styles.itemName}
                    >
                      {item.productName}
                    </Link>
                    <p className={styles.itemSub}>
                      Qty {item.quantity} · {formatPrice(item.unitPrice)} each
                    </p>
                    {item.variantLabel ? (
                      <p className={styles.itemSub}>
                        Colour: {item.variantLabel}
                      </p>
                    ) : null}
                    {item.customizationSummary?.length ? (
                      <ul className={styles.itemDetailList}>
                        {item.customizationSummary.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.hamperContents?.length ? (
                      <div className={styles.itemSub}>
                        <p>Contents</p>
                        <ul className={styles.itemDetailList}>
                          {item.hamperContents.map((name) => (
                            <li key={name}>✓ {name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <strong>{formatPrice(item.lineTotal)}</strong>
                </div>
              );
            })}
          </div>
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Merchandise subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span>
                {order.shipping === 0
                  ? "Included (demo)"
                  : formatPrice(order.shipping)}
              </span>
            </div>
            <div className={styles.totalRow}>
              <span>Tax</span>
              <span>Not calculated (demo)</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalStrong}`}>
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <section
            className={styles.panel}
            aria-labelledby="order-tracking-heading"
          >
            <h3 id="order-tracking-heading" className={styles.panelTitle}>
              Tracking
            </h3>
            <p className={styles.meta}>
              Current status: {orderStatusLabel(order.status)}
            </p>
            {trackingEvents.length > 0 ? (
              <ol className={styles.trackingList}>
                {trackingEvents.map((event) => (
                  <li key={`${event.status}-${event.timestamp}`}>
                    <strong>{event.label}</strong>
                    <span>{formatAccountDate(event.timestamp.slice(0, 10))}</span>
                    {event.description ? <p>{event.description}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.note}>
                Tracking information will appear here once your order is
                processed.
              </p>
            )}
          </section>

          <section
            className={styles.panel}
            aria-labelledby="order-delivery-heading"
          >
            <h3 id="order-delivery-heading" className={styles.panelTitle}>
              Delivered to
            </h3>
            <div className={styles.cardMeta}>
              <strong>{order.deliveryName}</strong>
              <span>{order.deliveryAddress.line1}</span>
              {order.deliveryAddress.line2 ? (
                <span>{order.deliveryAddress.line2}</span>
              ) : null}
              <span>
                {order.deliveryAddress.city}, {order.deliveryAddress.state}
              </span>
              <span>
                {order.deliveryAddress.pincode},{" "}
                {order.deliveryAddress.country}
              </span>
            </div>
          </section>

          <section
            className={styles.panel}
            aria-labelledby="order-payment-heading"
          >
            <h3 id="order-payment-heading" className={styles.panelTitle}>
              Payment method
            </h3>
            <p>{paymentMethodLabel(order.paymentMethod)}</p>
            <p className={styles.note}>Demo payment method label only.</p>
          </section>
        </div>
      </div>

      <div className={styles.actions}>
        {order.status === "delivered" ? (
          <BuyAgainButton items={order.items} />
        ) : null}
        <Link href="/products" className={styles.ghost}>
          Continue shopping
        </Link>
        <Link href="/account/orders" className={styles.ghost}>
          Back to orders
        </Link>
      </div>
    </div>
  );
}
