"use client";

import Link from "next/link";
import { useAccountAddresses } from "@/context/AccountAddressContext";
import type { DeliveryAddress } from "@/lib/checkout";
import type { SavedAddress } from "@/types/customer";
import styles from "./checkout-forms.module.css";

type Props = {
  selectedId: string | null;
  currentAddress: DeliveryAddress;
  onSelect: (address: DeliveryAddress, savedId: string) => void;
  onUseManual: () => void;
};

export function savedToDelivery(address: SavedAddress): DeliveryAddress {
  return {
    line1: address.addressLine1,
    line2: address.addressLine2,
    city: address.city,
    state: address.state,
    pincode: address.postalCode,
    country: address.country,
  };
}

function addressesMatch(a: DeliveryAddress, b: DeliveryAddress): boolean {
  return (
    a.line1.trim() === b.line1.trim() &&
    a.line2.trim() === b.line2.trim() &&
    a.city.trim() === b.city.trim() &&
    a.state.trim() === b.state.trim() &&
    a.pincode.trim() === b.pincode.trim() &&
    a.country.trim() === b.country.trim()
  );
}

export function SavedAddressPicker({
  selectedId,
  currentAddress,
  onSelect,
  onUseManual,
}: Props) {
  const { addresses, hydrated } = useAccountAddresses();

  if (!hydrated) {
    return (
      <div className={styles.savedBlock}>
        <p className={styles.savedNote}>Loading saved addresses…</p>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className={styles.savedBlock}>
        <p className={styles.savedNote}>
          No addresses saved on this device. Enter an address below, or{" "}
          <Link href="/account/addresses" className={styles.savedLink}>
            manage addresses in your account
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={styles.savedBlock}>
      <p className={styles.savedHeading} id="saved-address-heading">
        Use a saved address
      </p>
      <p className={styles.savedNote}>
        Choosing one fills the delivery fields below. Editing those fields
        switches to a one-time address for this checkout and does not change
        your saved address book.
      </p>
      <ul
        className={styles.savedList}
        role="listbox"
        aria-labelledby="saved-address-heading"
      >
        {addresses.map((address) => {
          const delivery = savedToDelivery(address);
          const isSelected =
            selectedId === address.id ||
            (!selectedId && addressesMatch(currentAddress, delivery));

          return (
            <li key={address.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.savedOption} ${
                  isSelected ? styles.savedOptionSelected : ""
                }`}
                onClick={() => onSelect(delivery, address.id)}
              >
                <span className={styles.savedOptionLabel}>
                  {address.label}
                  {address.isDefault ? (
                    <span className={styles.savedDefault}>Default</span>
                  ) : null}
                </span>
                <span className={styles.savedOptionName}>{address.fullName}</span>
                <span className={styles.savedOptionMeta}>
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                </span>
                <span className={styles.savedOptionMeta}>
                  {address.city}, {address.state} {address.postalCode}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.savedActions}>
        <button type="button" className={styles.savedManual} onClick={onUseManual}>
          Enter a different address
        </button>
        <Link href="/account/addresses" className={styles.savedLink}>
          Edit saved addresses
        </Link>
      </div>
    </div>
  );
}
