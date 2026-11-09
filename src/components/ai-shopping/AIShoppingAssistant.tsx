"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getProductBySlug } from "@/lib/products";
import { trapTabKey } from "@/lib/focusTrap";
import {
  ASSISTANT_QUICK_ACTIONS,
  ASSISTANT_WELCOME,
  createEmptyConversationContext,
  runAssistantEngine,
  type ChatMessage,
  type ChatMessageAction,
  type ConversationContext,
  type PendingCommerceAction,
} from "@/lib/ai-shopping";
import { AIChatMessage } from "./AIChatMessage";
import { AIInput } from "./AIInput";
import { AIQuickActions } from "./AIQuickActions";
import { RobotMascot } from "./RobotMascot";
import styles from "./AIShoppingAssistant.module.css";

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/products\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function confirmActionCopy(
  pending: PendingCommerceAction[],
  baseText: string,
): string {
  const first = pending[0];
  if (!first) return baseText;
  switch (first.type) {
    case "add_to_cart":
      return baseText.replace(/^Adding\b/, "Added").replace(/…$/, ".");
    case "add_to_wishlist":
      return baseText.replace(/^Saving\b/, "Saved").replace(/…$/, ".");
    case "remove_from_cart":
    case "remove_from_wishlist":
      return baseText.replace(/^Removing\b/, "Removed").replace(/…$/, ".");
    case "update_cart_quantity":
      return baseText.replace(/^Updating\b/, "Updated").replace(/…$/, ".");
    default:
      return baseText;
  }
}

function thinkingLabelFor(text: string): string {
  const t = text.toLowerCase();
  if (/(add|cart|checkout|buy|order)/.test(t)) return "Updating your cart…";
  if (/(deliver|delivery|shipping|dispatch)/.test(t)) return "Checking delivery info…";
  return "Finding the best match…";
}

export function AIShoppingAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const busyTimer = useRef<number | null>(null);

  const {
    resolvedItems,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    openCart,
    hydrated: cartHydrated,
  } = useCart();
  const {
    products: wishlistProducts,
    ids: wishlistIds,
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    hydrated: wishlistHydrated,
  } = useWishlist();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("Thinking…");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ConversationContext>(() =>
    createEmptyConversationContext(null),
  );

  const currentPageProductId = useMemo(() => {
    const slug = slugFromPathname(pathname);
    if (!slug) return null;
    return getProductBySlug(slug)?.id ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      "textarea, button, a[href]",
    );
    focusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (panel) trapTabKey(event, panel);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, busy]);

  useEffect(
    () => () => {
      if (busyTimer.current !== null) {
        window.clearTimeout(busyTimer.current);
      }
    },
    [],
  );

  const wishlistedIds = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const runtime = useMemo(
    () => ({
      cartLines: resolvedItems.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        lineKey: item.lineKey,
      })),
      cartSubtotal,
      wishlistNames: wishlistProducts.map((p) => p.name),
      wishlistIds,
    }),
    [resolvedItems, cartSubtotal, wishlistProducts, wishlistIds],
  );

  const appendAssistant = useCallback(
    (partial: Omit<ChatMessage, "id" | "createdAt">) => {
      setMessages((prev) => [
        ...prev,
        {
          ...partial,
          id: createId("a"),
          createdAt: Date.now(),
        },
      ]);
    },
    [],
  );

  const executePending = useCallback(
    (actions: PendingCommerceAction[]): string | null => {
      for (const action of actions) {
        switch (action.type) {
          case "add_to_cart": {
            const ok = addToCart(action.productId, action.quantity);
            if (!ok) {
              return "I couldn't add that item to the cart. It may be out of stock — please try again from the product page.";
            }
            openCart();
            break;
          }
          case "remove_from_cart": {
            const line = resolvedItems.find(
              (item) => item.productId === action.productId,
            );
            if (!line) {
              return "That product isn't in your cart right now.";
            }
            removeFromCart(line.lineKey);
            break;
          }
          case "update_cart_quantity": {
            const line = resolvedItems.find(
              (item) => item.productId === action.productId,
            );
            if (!line) {
              return "That product isn't in your cart right now.";
            }
            updateQuantity(line.lineKey, action.quantity);
            break;
          }
          case "add_to_wishlist": {
            if (!isWishlisted(action.productId)) {
              const ok = addToWishlist(action.productId);
              if (!ok) {
                return "I couldn't save that item to your wishlist. Please try again.";
              }
            }
            break;
          }
          case "remove_from_wishlist": {
            removeFromWishlist(action.productId);
            break;
          }
          case "buy_now": {
            const ok = addToCart(action.productId, action.quantity);
            if (!ok) {
              return "I couldn't start checkout for that product. It may be unavailable.";
            }
            router.push("/checkout");
            setOpen(false);
            break;
          }
          case "navigate": {
            router.push(action.href);
            break;
          }
          default:
            break;
        }
      }
      return null;
    },
    [
      addToCart,
      addToWishlist,
      isWishlisted,
      openCart,
      removeFromCart,
      removeFromWishlist,
      resolvedItems,
      router,
      updateQuantity,
    ],
  );

  const handleUserPrompt = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setBusy(true);
      setThinkingLabel(thinkingLabelFor(text));
      setDraft("");

      setMessages((prev) => [
        ...prev,
        {
          id: createId("u"),
          role: "user",
          text,
          createdAt: Date.now(),
        },
      ]);

      const liveContext: ConversationContext = {
        ...context,
        currentPageProductId,
      };
      const runtimeSnapshot = runtime;

      // Short, deliberate pause so the thinking state reads as intentional.
      if (busyTimer.current !== null) {
        window.clearTimeout(busyTimer.current);
      }
      busyTimer.current = window.setTimeout(() => {
        const result = runAssistantEngine(text, liveContext, runtimeSnapshot);
        setContext(result.nextContext);

        const failure = executePending(result.pendingActions);
        if (failure) {
          appendAssistant({ role: "assistant", text: failure });
        } else {
          appendAssistant({
            ...result.message,
            text: confirmActionCopy(result.pendingActions, result.message.text),
          });
        }

        setBusy(false);
        busyTimer.current = null;
      }, 550);
    },
    [
      appendAssistant,
      busy,
      context,
      currentPageProductId,
      executePending,
      runtime,
    ],
  );

  const handleMessageAction = useCallback(
    (action: ChatMessageAction) => {
      switch (action.kind) {
        case "prompt":
          if (action.prompt) handleUserPrompt(action.prompt);
          break;
        case "view_cart":
          openCart();
          break;
        case "navigate":
          if (action.href) {
            router.push(action.href);
            setOpen(false);
          }
          break;
        case "view_wishlist":
          router.push(action.href ?? "/wishlist");
          setOpen(false);
          break;
        case "checkout":
          router.push(action.href ?? "/checkout");
          setOpen(false);
          break;
        case "view_product":
        case "customize":
        case "bulk_quote":
          if (action.href) {
            router.push(action.href);
            setOpen(false);
          }
          break;
        case "add_to_cart":
          if (action.productId) {
            const ok = addToCart(action.productId, action.quantity ?? 1);
            appendAssistant({
              role: "assistant",
              text: ok
                ? "Added to your cart."
                : "I couldn't add that item to the cart. Please try again.",
            });
            if (ok) openCart();
          }
          break;
        case "wishlist":
          if (action.productId) {
            if (isWishlisted(action.productId)) {
              removeFromWishlist(action.productId);
              appendAssistant({
                role: "assistant",
                text: "Removed from your wishlist.",
              });
            } else {
              const ok = addToWishlist(action.productId);
              appendAssistant({
                role: "assistant",
                text: ok
                  ? "Saved to your wishlist."
                  : "I couldn't save that item. Please try again.",
              });
            }
          }
          break;
        case "buy_now":
          if (action.productId) {
            const ok = addToCart(action.productId, action.quantity ?? 1);
            if (ok) {
              router.push("/checkout");
              setOpen(false);
            } else {
              appendAssistant({
                role: "assistant",
                text: "I couldn't start checkout for that product.",
              });
            }
          }
          break;
        default:
          break;
      }
    },
    [
      addToCart,
      addToWishlist,
      appendAssistant,
      handleUserPrompt,
      isWishlisted,
      openCart,
      removeFromWishlist,
      router,
    ],
  );

  const hydrated = cartHydrated && wishlistHydrated;

  return (
    <div className={styles.root} data-open={open ? "true" : "false"}>
      <button
        type="button"
        className={
          pathname === "/cart" || pathname.startsWith("/checkout")
            ? `${styles.launcher} ${styles.launcherAboveBar}`
            : styles.launcher
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "hsp-ai-shopping-dialog" : undefined}
        aria-label={open ? "Close HSP AI shopping assistant" : "Open HSP AI shopping assistant"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.launcherMascot} aria-hidden="true">
          <RobotMascot size={40} title="" />
        </span>
        <span className={styles.launcherText}>
          <span className={styles.launcherTitle}>Ask HSP AI</span>
          <span className={styles.launcherHint}>Find products</span>
        </span>
      </button>

      {open ? (
        <div className={styles.layer}>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close HSP AI"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            className={styles.panel}
            id="hsp-ai-shopping-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className={styles.header}>
              <span className={styles.headerMascot} aria-hidden="true">
                <RobotMascot size={86} state={busy ? "thinking" : "idle"} title="" />
              </span>
              <div className={styles.headerCopy}>
                <div className={styles.brandRow}>
                  <p className={styles.brandName}>HSP AI</p>
                  <span className={styles.betaBadge}>Beta</span>
                </div>
                <h2 id={titleId} className={styles.title}>
                  Shopping assistant
                </h2>
                <p className={styles.subtitle}>{ASSISTANT_WELCOME}</p>
              </div>
              <div className={styles.headerButtons}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Minimize assistant"
                  onClick={() => setOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Close assistant"
                  onClick={() => setOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </header>

            <div
              ref={listRef}
              className={styles.transcript}
              tabIndex={0}
              aria-live="polite"
            >
              {messages.length === 0 && !busy ? (
                <div className={styles.empty}>
                  <RobotMascot size={92} title="HSP AI robot, ready to help" />
                  <p className={styles.emptyTitle}>Hi, I&rsquo;m HSP AI</p>
                  <p className={styles.emptyCopy}>
                    Search the live catalogue, compare options, manage your
                    cart and wishlist, or get help with bulk orders and
                    customization.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <AIChatMessage
                      key={message.id}
                      message={message}
                      wishlistedIds={wishlistedIds}
                      onAction={handleMessageAction}
                    />
                  ))}
                  {busy ? (
                    <div className={`${styles.message} ${styles.messageAssistant}`}>
                      <span className={styles.avatarBot} aria-hidden="true">
                        <RobotMascot size={30} state="thinking" title="" />
                      </span>
                      <div className={styles.thinkingBubble} role="status">
                        <span className={styles.thinkingDots} aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className={styles.thinkingText}>{thinkingLabel}</span>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className={styles.quickBar}>
              <AIQuickActions
                actions={ASSISTANT_QUICK_ACTIONS}
                onSelect={handleUserPrompt}
              />
            </div>

            <AIInput
              value={draft}
              disabled={!hydrated || busy}
              onChange={setDraft}
              onSubmit={() => handleUserPrompt(draft)}
            />

            <p className={styles.poweredBy}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3 5 6v6c0 4.4 2.8 7.6 7 9 4.2-1.4 7-4.6 7-9V6l-7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m9.5 12 2 2 3.5-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Powered by HSP Mart
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
