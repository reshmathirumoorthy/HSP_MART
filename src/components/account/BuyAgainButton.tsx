"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { OrderItem } from "@/data/account";
import styles from "./account.module.css";

type Props = {
  items: OrderItem[];
};

export function BuyAgainButton({ items }: Props) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleClick = () => {
    let added = 0;
    for (const item of items) {
      const ok = addToCart(item.productId, item.quantity);
      if (ok) added += 1;
    }
    if (added > 0) {
      router.push("/cart");
    }
  };

  return (
    <button type="button" className={styles.ghost} onClick={handleClick}>
      Buy again
    </button>
  );
}
