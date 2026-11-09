"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { validateCustomer } from "@/lib/checkout";
import { company } from "@/data/company";
import styles from "./contact.module.css";

type FieldErrors = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "enquiryType"
    | "subject"
    | "message",
    string
  >
>;

type Status =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "error"; text: string };

const FIELD_ORDER = [
  "name",
  "email",
  "phone",
  "enquiryType",
  "subject",
  "message",
] as const;

const ENQUIRY_TYPES = [
  "General Enquiry",
  "Product Enquiry",
  "Bulk Order",
  "Custom Branding",
] as const;

export function ContactEnquiryForm() {
  const formId = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const submitTimerRef = useRef<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [enquiryType, setEnquiryType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const ids = {
    name: `${formId}-name`,
    email: `${formId}-email`,
    phone: `${formId}-phone`,
    enquiryType: `${formId}-enquiry-type`,
    subject: `${formId}-subject`,
    message: `${formId}-message`,
  };

  // Clear the simulated-submit timer on unmount (avoids setState after unmount).
  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  // The form is replaced by the success panel on submit — move focus there so
  // keyboard/screen-reader users are not dropped back onto <body>.
  useEffect(() => {
    if (submitted) statusRef.current?.focus();
  }, [submitted]);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const customer = validateCustomer({
      fullName: name,
      email,
      phone,
    });
    if (customer.fullName) next.name = customer.fullName;
    if (customer.email) next.email = customer.email;
    if (customer.phone) next.phone = customer.phone;

    if (!enquiryType) {
      next.enquiryType = "Please choose an enquiry type.";
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      next.subject = "Please enter a subject.";
    } else if (trimmedSubject.length < 3) {
      next.subject = "Please enter a slightly longer subject.";
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      next.message = "Please enter your message.";
    } else if (trimmedMessage.length < 10) {
      next.message =
        "Please enter at least a few words so we know how to help.";
    }
    return next;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.type === "submitting") return;

    const nextErrors = validate();
    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstInvalid) {
      setStatus({
        type: "error",
        text: "Please correct the highlighted fields before sending.",
      });
      window.setTimeout(() => {
        document.getElementById(ids[firstInvalid])?.focus();
      }, 0);
      return;
    }

    // No contact API exists — simulate processing, then give honest feedback.
    setSubmittedName(name.trim().split(/\s+/)[0] || name.trim());
    setStatus({ type: "submitting" });
    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current);
    }
    submitTimerRef.current = window.setTimeout(() => {
      setSubmitted(true);
      setStatus({ type: "idle" });
    }, 900);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setEnquiryType("");
    setSubject("");
    setMessage("");
    setErrors({});
    setStatus({ type: "idle" });
    setSubmitted(false);
    setSubmittedName("");
    window.setTimeout(() => document.getElementById(ids.name)?.focus(), 0);
  };

  const phoneHref = `tel:${company.contact.phone?.replace(/\s/g, "") ?? ""}`;

  if (submitted) {
    return (
      <div className={styles.successPanel} role="status" tabIndex={-1} ref={statusRef}>
        <span className={styles.successIcon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8.7 12.4 2.3 2.3 4.3-4.5" />
          </svg>
        </span>
        <h3 className={styles.successTitle}>
          Thank you{submittedName ? `, ${submittedName}` : ""}.
        </h3>
        <p className={styles.successCopy}>
          Your enquiry passed validation in this browser, but this is a demo
          form — nothing was actually delivered to HSP Mart. For a guaranteed
          response, call{" "}
          <a className={styles.infoLink} href={phoneHref}>
            {company.contact.phone}
          </a>{" "}
          or email{" "}
          <a className={styles.infoLink} href={`mailto:${company.contact.email}`}>
            {company.contact.email}
          </a>
          .
        </p>
        <div className={styles.successActions}>
          <button type="button" className="btn btn--dark" onClick={resetForm}>
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {status.type === "error" ? (
        <div className={styles.statusError} role="alert">
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16.5h.01" />
          </svg>
          <span>{status.text}</span>
        </div>
      ) : null}

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={ids.name}>
            Full name<span className={styles.requiredMark} aria-hidden="true">*</span>
          </label>
          <input
            id={ids.name}
            name="name"
            type="text"
            autoComplete="name"
            className={styles.input}
            placeholder="Your full name"
            value={name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${ids.name}-error` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              clearError("name");
            }}
          />
          {errors.name ? (
            <p id={`${ids.name}-error`} className={styles.fieldError} role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={ids.email}>
            Email address<span className={styles.requiredMark} aria-hidden="true">*</span>
          </label>
          <input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            placeholder="you@company.com"
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${ids.email}-error` : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
          />
          {errors.email ? (
            <p id={`${ids.email}-error`} className={styles.fieldError} role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={ids.phone}>
            Phone number<span className={styles.requiredMark} aria-hidden="true">*</span>
          </label>
          <input
            id={ids.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={styles.input}
            placeholder="eg. +91 98765 43210"
            value={phone}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${ids.phone}-error` : undefined}
            onChange={(event) => {
              setPhone(event.target.value);
              clearError("phone");
            }}
          />
          {errors.phone ? (
            <p id={`${ids.phone}-error`} className={styles.fieldError} role="alert">
              {errors.phone}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={ids.enquiryType}>
            Enquiry type<span className={styles.requiredMark} aria-hidden="true">*</span>
          </label>
          <select
            id={ids.enquiryType}
            name="enquiryType"
            className={styles.select}
            value={enquiryType}
            aria-invalid={Boolean(errors.enquiryType)}
            aria-describedby={
              errors.enquiryType ? `${ids.enquiryType}-error` : undefined
            }
            onChange={(event) => {
              setEnquiryType(event.target.value);
              clearError("enquiryType");
            }}
          >
            <option value="">Select enquiry type…</option>
            {ENQUIRY_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.enquiryType ? (
            <p
              id={`${ids.enquiryType}-error`}
              className={styles.fieldError}
              role="alert"
            >
              {errors.enquiryType}
            </p>
          ) : null}
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.fieldLabel} htmlFor={ids.subject}>
            Subject<span className={styles.requiredMark} aria-hidden="true">*</span>
          </label>
          <input
            id={ids.subject}
            name="subject"
            type="text"
            className={styles.input}
            placeholder="eg. Quote for 500 custom notebooks"
            value={subject}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? `${ids.subject}-error` : undefined}
            onChange={(event) => {
              setSubject(event.target.value);
              clearError("subject");
            }}
          />
          {errors.subject ? (
            <p id={`${ids.subject}-error`} className={styles.fieldError} role="alert">
              {errors.subject}
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={ids.message}>
          Message<span className={styles.requiredMark} aria-hidden="true">*</span>
        </label>
        <textarea
          id={ids.message}
          name="message"
          rows={4}
          className={styles.textarea}
          placeholder="Tell us what you need — products, quantities, delivery timelines, branding…"
          value={message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${ids.message}-error` : undefined}
          onChange={(event) => {
            setMessage(event.target.value);
            clearError("message");
          }}
        />
        {errors.message ? (
          <p id={`${ids.message}-error`} className={styles.fieldError} role="alert">
            {errors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="btn btn--dark"
        disabled={status.type === "submitting"}
        style={{ width: "100%", minHeight: "3.1rem" }}
      >
        {status.type === "submitting" ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            Send Enquiry
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </>
        )}
      </button>

      <p className={styles.honestNote}>
        Demonstration form — your message is validated in this browser and is
        not delivered to HSP Mart. For a guaranteed reply, call{" "}
        {company.contact.phone} or email {company.contact.email}.
      </p>
    </form>
  );
}
