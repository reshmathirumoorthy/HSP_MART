"use client";

import {
  useCallback,
  useId,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import styles from "./AIShoppingAssistant.module.css";

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function AIInput({ value, disabled, onChange, onSubmit }: Props) {
  const inputId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (disabled) return;
      if (!value.trim()) return;
      onSubmit();
    },
    [disabled, onSubmit, value],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className={styles.srOnly}>
        Ask HSP AI about products
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className={styles.input}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder="Ask me anything..."
        aria-label="Ask me anything"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint="send"
      />
      <button
        type="submit"
        className={styles.sendBtn}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 11.6 19.8 4.9c.9-.4 1.7.7 1.1 1.5l-6.7 15.3c-.4.9-1.7.8-2.1-.2l-1.6-5.3a1.6 1.6 0 0 0-1-.9l-5-1.7c-1-.3-1.1-1.7-.1-2Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill="rgba(255,255,255,0.14)"
          />
          <path
            d="M20.4 5.4 11.5 14"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}
