"use client";

import Link from "next/link";
import type { ChatMessage, ChatMessageAction } from "@/lib/ai-shopping";
import { AIProductResult } from "./AIProductResult";
import { RobotMascot } from "./RobotMascot";
import styles from "./AIShoppingAssistant.module.css";

type Props = {
  message: ChatMessage;
  wishlistedIds: Set<string>;
  onAction: (action: ChatMessageAction) => void;
};

export function AIChatMessage({ message, wishlistedIds, onAction }: Props) {
  const isUser = message.role === "user";
  const hasProducts = message.products && message.products.length > 0;

  return (
    <article
      className={`${styles.message} ${isUser ? styles.messageUser : styles.messageAssistant}`}
    >
      {!isUser ? (
        <span className={styles.avatarBot} aria-hidden="true">
          <RobotMascot size={30} title="" />
        </span>
      ) : null}

      <div
        className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}
      >
        <p className={styles.messageText}>{message.text}</p>

        {hasProducts ? (
          <div
            className={styles.productScroller}
            role="list"
            aria-label="Matching products"
          >
            {message.products!.map((product) => (
              <AIProductResult
                key={product.id}
                product={product}
                wishlisted={wishlistedIds.has(product.id)}
                onAction={onAction}
              />
            ))}
          </div>
        ) : null}

        {hasProducts && message.products!.length > 3 ? (
          <Link href="/products" className={styles.viewAll}>
            View all matching products
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}

        {message.actions && message.actions.length > 0 ? (
          <div
            className={styles.messageActions}
            role="group"
            aria-label="Suggested actions"
          >
            {message.actions.map((action) => {
              const isLink =
                Boolean(action.href) &&
                (action.kind === "view_product" ||
                  action.kind === "customize" ||
                  action.kind === "bulk_quote" ||
                  action.kind === "view_wishlist" ||
                  action.kind === "checkout" ||
                  action.kind === "navigate");

              if (isLink && action.href) {
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    className={styles.chipAction}
                    onClick={(event) => {
                      event.preventDefault();
                      onAction(action);
                    }}
                  >
                    {action.label}
                  </a>
                );
              }

              return (
                <button
                  key={action.id}
                  type="button"
                  className={styles.chipAction}
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
