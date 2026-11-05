"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CompareProvider } from "@/context/CompareContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AccountProfileProvider } from "@/context/AccountProfileContext";
import { AccountAddressProvider } from "@/context/AccountAddressContext";
import { RfpProvider } from "@/context/RfpContext";
import { CompareBar } from "@/components/discovery/CompareBar";

const CartDrawer = dynamic(
  () =>
    import("@/components/cart/CartDrawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

const AIShoppingAssistant = dynamic(
  () =>
    import("@/components/ai-shopping/AIShoppingAssistant").then(
      (mod) => mod.AIShoppingAssistant,
    ),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <CompareProvider>
          <RecentlyViewedProvider>
            <NotificationProvider>
              <AccountProfileProvider>
                <AccountAddressProvider>
                  <RfpProvider>
                    {children}
                    <CartDrawer />
                    <CompareBar />
                    <AIShoppingAssistant />
                  </RfpProvider>
                </AccountAddressProvider>
              </AccountProfileProvider>
            </NotificationProvider>
          </RecentlyViewedProvider>
        </CompareProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
