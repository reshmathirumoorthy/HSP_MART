"use client";

import { useRef, useState } from "react";
import {
  INDIAN_STATES,
  validateAddress,
  validateCustomer,
} from "@/lib/checkout";
import { useAccountAddresses } from "@/context/AccountAddressContext";
import type { SavedAddress } from "@/types/customer";
import styles from "./account.module.css";

type Draft = {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type FieldErrors = Partial<
  Record<
    | "fullName"
    | "phone"
    | "addressLine1"
    | "city"
    | "state"
    | "postalCode"
    | "country",
    string
  >
>;

const EMPTY_DRAFT: Draft = {
  label: "Home",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

const FIELD_ORDER = [
  "fullName",
  "phone",
  "addressLine1",
  "city",
  "state",
  "postalCode",
  "country",
] as const;

const FIELD_IDS: Record<(typeof FIELD_ORDER)[number], string> = {
  fullName: "addr-name",
  phone: "addr-phone",
  addressLine1: "addr-line1",
  city: "addr-city",
  state: "addr-state",
  postalCode: "addr-postal",
  country: "addr-country",
};

function toDraft(address: SavedAddress): Draft {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  };
}

function validateDraft(draft: Draft): FieldErrors {
  const customerErrors = validateCustomer({
    fullName: draft.fullName,
    email: "address-book@local.invalid",
    phone: draft.phone,
  });
  const addressErrors = validateAddress({
    line1: draft.addressLine1,
    line2: draft.addressLine2,
    city: draft.city,
    state: draft.state,
    pincode: draft.postalCode,
    country: draft.country,
  });

  const errors: FieldErrors = {};
  if (customerErrors.fullName) errors.fullName = customerErrors.fullName;
  if (customerErrors.phone) errors.phone = customerErrors.phone;
  if (addressErrors.line1) errors.addressLine1 = addressErrors.line1;
  if (addressErrors.city) errors.city = addressErrors.city;
  if (addressErrors.state) errors.state = addressErrors.state;
  if (addressErrors.pincode) errors.postalCode = addressErrors.pincode;
  if (addressErrors.country) errors.country = addressErrors.country;
  return errors;
}

export function AddressBookClient() {
  const {
    addresses,
    hydrated,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  } = useAccountAddresses();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLElement>(null);

  if (!hydrated) {
    return <p className={styles.note}>Loading addresses…</p>;
  }

  const clearFieldError = (field: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, isDefault: addresses.length === 0 });
    setEditingId(null);
    setErrors({});
    setStatus("");
    setMode("create");
  };

  const openEdit = (address: SavedAddress) => {
    setDraft(toDraft(address));
    setEditingId(address.id);
    setErrors({});
    setStatus("");
    setMode("edit");
  };

  const cancelForm = () => {
    setMode("list");
    setEditingId(null);
    setErrors({});
  };

  const submitForm = () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstInvalid) {
      window.setTimeout(() => {
        document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      }, 0);
      return;
    }

    if (mode === "edit" && editingId) {
      updateAddress(editingId, draft);
      setStatus("Address updated on this device.");
    } else {
      addAddress(draft);
      setStatus("Address saved on this device.");
    }
    setMode("list");
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className={styles.content}>
      <p className={styles.note}>
        Addresses are stored only in this browser. They are not sent to a server
        and are not used for live delivery quoting.
      </p>

      {status ? (
        <p className={styles.note} role="status">
          {status}
        </p>
      ) : null}

      {mode === "list" ? (
        <>
          <div className={styles.actions}>
            <button type="button" className="btn btn--dark" onClick={openCreate}>
              Add address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>No saved addresses</h2>
              <p className={styles.emptyCopy}>
                Addresses you add stay on this device and can be reused at
                checkout. None are saved yet.
              </p>
              <button type="button" className="btn btn--dark" onClick={openCreate}>
                Add address
              </button>
            </div>
          ) : (
            <ul className={styles.addressList}>
              {addresses.map((address) => (
                <li key={address.id} className={styles.addressCard}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.addressLabel}>
                        {address.label}
                        {address.isDefault ? (
                          <span className={styles.defaultPill}>Default</span>
                        ) : null}
                      </p>
                      <p className={styles.itemName}>{address.fullName}</p>
                    </div>
                  </div>
                  <div className={styles.cardMeta}>
                    {address.phone ? <span>{address.phone}</span> : null}
                    <span>{address.addressLine1}</span>
                    {address.addressLine2 ? (
                      <span>{address.addressLine2}</span>
                    ) : null}
                    <span>
                      {address.city}, {address.state}
                    </span>
                    <span>
                      {address.postalCode}, {address.country}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {!address.isDefault ? (
                      <button
                        type="button"
                        className={styles.ghost}
                        onClick={() => {
                          setDefaultAddress(address.id);
                          setStatus("Default address updated.");
                        }}
                      >
                        Make default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => openEdit(address)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => {
                        removeAddress(address.id);
                        setStatus("Address removed.");
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <section
          ref={formRef}
          className={styles.panel}
          aria-labelledby="address-form-heading"
        >
          <h2 id="address-form-heading" className={styles.panelTitle}>
            {mode === "edit" ? "Edit address" : "Add address"}
          </h2>
          <div className={styles.formGrid}>
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-label">
                  Label
                </label>
                <input
                  id="addr-label"
                  className={styles.input}
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-name">
                  Full name
                </label>
                <input
                  id="addr-name"
                  className={styles.input}
                  value={draft.fullName}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={
                    errors.fullName ? "addr-name-error" : undefined
                  }
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      fullName: event.target.value,
                    }));
                    clearFieldError("fullName");
                  }}
                />
                {errors.fullName ? (
                  <p id="addr-name-error" className={styles.fieldError} role="alert">
                    {errors.fullName}
                  </p>
                ) : null}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="addr-phone">
                Phone
              </label>
              <input
                id="addr-phone"
                className={styles.input}
                type="tel"
                value={draft.phone}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "addr-phone-error" : undefined}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, phone: event.target.value }));
                  clearFieldError("phone");
                }}
              />
              {errors.phone ? (
                <p id="addr-phone-error" className={styles.fieldError} role="alert">
                  {errors.phone}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="addr-line1">
                Address line 1
              </label>
              <input
                id="addr-line1"
                className={styles.input}
                value={draft.addressLine1}
                aria-invalid={Boolean(errors.addressLine1)}
                aria-describedby={
                  errors.addressLine1 ? "addr-line1-error" : undefined
                }
                onChange={(event) => {
                  setDraft((prev) => ({
                    ...prev,
                    addressLine1: event.target.value,
                  }));
                  clearFieldError("addressLine1");
                }}
              />
              {errors.addressLine1 ? (
                <p id="addr-line1-error" className={styles.fieldError} role="alert">
                  {errors.addressLine1}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="addr-line2">
                Address line 2
              </label>
              <input
                id="addr-line2"
                className={styles.input}
                value={draft.addressLine2}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    addressLine2: event.target.value,
                  }))
                }
              />
            </div>
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-city">
                  City
                </label>
                <input
                  id="addr-city"
                  className={styles.input}
                  value={draft.city}
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby={errors.city ? "addr-city-error" : undefined}
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, city: event.target.value }));
                    clearFieldError("city");
                  }}
                />
                {errors.city ? (
                  <p id="addr-city-error" className={styles.fieldError} role="alert">
                    {errors.city}
                  </p>
                ) : null}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-state">
                  State
                </label>
                <select
                  id="addr-state"
                  className={styles.select}
                  value={draft.state}
                  aria-invalid={Boolean(errors.state)}
                  aria-describedby={
                    errors.state ? "addr-state-error" : undefined
                  }
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, state: event.target.value }));
                    clearFieldError("state");
                  }}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state ? (
                  <p id="addr-state-error" className={styles.fieldError} role="alert">
                    {errors.state}
                  </p>
                ) : null}
              </div>
            </div>
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-postal">
                  Pincode
                </label>
                <input
                  id="addr-postal"
                  className={styles.input}
                  inputMode="numeric"
                  value={draft.postalCode}
                  aria-invalid={Boolean(errors.postalCode)}
                  aria-describedby={
                    errors.postalCode ? "addr-postal-error" : undefined
                  }
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      postalCode: event.target.value,
                    }));
                    clearFieldError("postalCode");
                  }}
                />
                {errors.postalCode ? (
                  <p
                    id="addr-postal-error"
                    className={styles.fieldError}
                    role="alert"
                  >
                    {errors.postalCode}
                  </p>
                ) : null}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="addr-country">
                  Country
                </label>
                <input
                  id="addr-country"
                  className={styles.input}
                  value={draft.country}
                  aria-invalid={Boolean(errors.country)}
                  aria-describedby={
                    errors.country ? "addr-country-error" : undefined
                  }
                  onChange={(event) => {
                    setDraft((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }));
                    clearFieldError("country");
                  }}
                />
                {errors.country ? (
                  <p
                    id="addr-country-error"
                    className={styles.fieldError}
                    role="alert"
                  >
                    {errors.country}
                  </p>
                ) : null}
              </div>
            </div>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    isDefault: event.target.checked,
                  }))
                }
              />
              <span>Set as default address</span>
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn--dark" onClick={submitForm}>
              Save address
            </button>
            <button type="button" className={styles.ghost} onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
