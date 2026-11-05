"use client";

import { useRef, useState } from "react";
import {
  INITIAL_BULK_QUOTE,
  buildQuoteSnapshot,
  createQuoteLine,
  firstInvalidQuoteStep,
  hasBulkQuoteErrors,
  resolveProductId,
  validateCustomerStep,
  validateProductsStep,
  validateRequirementsStep,
  type BulkQuoteData,
  type BulkQuoteFieldErrors,
  type BulkQuoteLine,
  type DemoQuoteSnapshot,
  type QuoteStep,
} from "@/lib/bulkQuote";
import { getProductById } from "@/lib/cart";
import { QuoteProgress } from "@/components/bulk-quote/QuoteProgress";
import { QuoteProductList } from "@/components/bulk-quote/QuoteProductList";
import { ProductPicker } from "@/components/bulk-quote/ProductPicker";
import { QuoteRequirements } from "@/components/bulk-quote/QuoteRequirements";
import { QuoteCustomerForm } from "@/components/bulk-quote/QuoteCustomerForm";
import { QuoteReview } from "@/components/bulk-quote/QuoteReview";
import { QuoteSummary } from "@/components/bulk-quote/QuoteSummary";
import { QuoteSuccess } from "@/components/bulk-quote/QuoteSuccess";
import styles from "./bulk-quote.module.css";

type Props = {
  initialProducts?: string[];
};

const STEP_ORDER: QuoteStep[] = [
  "products",
  "requirements",
  "customer",
  "review",
];

function buildInitialQuote(initialProducts: string[]): BulkQuoteData {
  let base: BulkQuoteData = INITIAL_BULK_QUOTE;

  if (initialProducts.length) {
    const lines: BulkQuoteLine[] = [];
    const seen = new Set<string>();

    for (const entry of initialProducts) {
      const productId = resolveProductId(entry);
      if (!productId || seen.has(productId)) continue;
      const line = createQuoteLine(productId);
      if (!line) continue;
      seen.add(productId);
      lines.push(line);
    }

    if (lines.length) {
      base = { ...INITIAL_BULK_QUOTE, lines };
    }
  }

  if (typeof window === "undefined") return base;

  try {
    const draft = sessionStorage.getItem("hsp-mart-rfp-draft");
    if (!draft?.trim() || base.requirements.additionalNotes.trim()) {
      return base;
    }
    sessionStorage.removeItem("hsp-mart-rfp-draft");
    return {
      ...base,
      requirements: {
        ...base.requirements,
        additionalNotes: `RFP estimate notes:\n${draft}`,
      },
    };
  } catch {
    return base;
  }
}

export function BulkQuoteClient({ initialProducts = [] }: Props) {
  const [data, setData] = useState<BulkQuoteData>(() =>
    buildInitialQuote(initialProducts),
  );
  const [step, setStep] = useState<QuoteStep>("products");
  const [errors, setErrors] = useState<BulkQuoteFieldErrors>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState<DemoQuoteSnapshot | null>(null);
  const submittingRef = useRef(false);

  const selectedIds = data.lines.map((line) => line.productId);

  const goTo = (next: QuoteStep) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateCurrentStep = (): boolean => {
    if (step === "products") {
      const next = validateProductsStep(data.lines);
      setErrors(next);
      return !hasBulkQuoteErrors(next);
    }
    if (step === "requirements") {
      const next = validateRequirementsStep(data.requirements);
      const merged = { ...next, designFile: errors.designFile };
      setErrors((prev) => ({ ...prev, ...merged }));
      return !hasBulkQuoteErrors(merged);
    }
    if (step === "customer") {
      const next = validateCustomerStep(data.customer, data.address);
      setErrors(next);
      return !hasBulkQuoteErrors(next);
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateCurrentStep()) return;
    const index = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[index + 1];
    if (next) goTo(next);
  };

  const handleSubmit = () => {
    if (submittingRef.current || processing) return;
    const allErrors = {
      ...validateProductsStep(data.lines),
      ...validateRequirementsStep(data.requirements),
      ...validateCustomerStep(data.customer, data.address),
      designFile: errors.designFile,
    };
    setErrors(allErrors);

    if (hasBulkQuoteErrors(allErrors)) {
      goTo(firstInvalidQuoteStep(allErrors));
      return;
    }

    const snapshot = buildQuoteSnapshot(data);
    if (!snapshot) return;

    submittingRef.current = true;
    setProcessing(true);
    window.setTimeout(() => {
      setCompleted(snapshot);
      setProcessing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 800);
  };

  if (completed) {
    return (
      <div className={styles.page} data-nav-surface="light">
        <div className={`shell ${styles.inner}`}>
          <QuoteSuccess quote={completed} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <header className={styles.banner}>
          <div className={styles.header}>
            <p className={styles.label}>Business &amp; bulk purchasing</p>
            <h1 className={styles.title}>Request a bulk quote</h1>
            <p className={styles.copy}>
              For teams, offices, and corporate gifting. Share products,
              quantities, and any customization needs — this is a frontend
              demonstration and does not generate live pricing.
            </p>
          </div>
        </header>
        <QuoteProgress current={step} />

        <div className={styles.layout}>
          <div className={styles.main}>
            {step === "products" ? (
              <QuoteProductList
                lines={data.lines}
                quantityErrors={errors.quantities}
                productsError={errors.products}
                onChangeQuantity={(productId, quantity) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) =>
                      line.productId === productId
                        ? { ...line, quantity }
                        : line,
                    ),
                  }));
                  setErrors((prev) => {
                    if (!prev.quantities) return prev;
                    const nextQty = { ...prev.quantities };
                    delete nextQty[productId];
                    return {
                      ...prev,
                      products: undefined,
                      quantities:
                        Object.keys(nextQty).length > 0 ? nextQty : undefined,
                    };
                  });
                }}
                onChangeNotes={(productId, notes) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) =>
                      line.productId === productId ? { ...line, notes } : line,
                    ),
                  }));
                }}
                onChangeCustomizationText={(productId, customizationText) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) =>
                      line.productId === productId
                        ? { ...line, customizationText }
                        : line,
                    ),
                  }));
                }}
                onChangeVariant={(productId, variantId) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) => {
                      if (line.productId !== productId) return line;
                      const product = getProductById(productId);
                      const variant = product?.customization?.variants?.find(
                        (item) => item.id === variantId,
                      );
                      return {
                        ...line,
                        variantId,
                        variantLabel: variant?.label,
                      };
                    }),
                  }));
                }}
                onChangeCustomizationType={(productId, customizationType) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) =>
                      line.productId === productId
                        ? {
                            ...line,
                            customizationType,
                            customizationText:
                              customizationType === "text"
                                ? line.customizationText
                                : undefined,
                            textOrientation:
                              customizationType === "text"
                                ? line.textOrientation ?? "horizontal"
                                : undefined,
                          }
                        : line,
                    ),
                  }));
                }}
                onChangeTextOrientation={(productId, textOrientation) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) =>
                      line.productId === productId
                        ? { ...line, textOrientation }
                        : line,
                    ),
                  }));
                }}
                onToggleHamperContent={(productId, childProductId) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.map((line) => {
                      if (line.productId !== productId) return line;
                      const product = getProductById(productId);
                      const slots = product?.hamperConfig?.slots ?? 5;
                      const current = line.hamperContents ?? [];
                      const exists = current.includes(childProductId);
                      const next = exists
                        ? current.filter((id) => id !== childProductId)
                        : current.length >= slots
                          ? current
                          : [...current, childProductId];
                      return { ...line, hamperContents: next };
                    }),
                  }));
                }}
                onRemove={(productId) => {
                  setData((prev) => ({
                    ...prev,
                    lines: prev.lines.filter(
                      (line) => line.productId !== productId,
                    ),
                  }));
                }}
                onAddProduct={() => setPickerOpen(true)}
              />
            ) : null}

            {step === "requirements" ? (
              <QuoteRequirements
                value={data.requirements}
                errors={errors}
                onChange={(requirements) => {
                  setData((prev) => ({ ...prev, requirements }));
                  setErrors((prev) => ({
                    ...prev,
                    orderType: undefined,
                    customizationNotes: undefined,
                    brandName: undefined,
                  }));
                }}
                onFileError={(message) => {
                  setErrors((prev) => ({
                    ...prev,
                    designFile: message ?? undefined,
                  }));
                }}
              />
            ) : null}

            {step === "customer" ? (
              <QuoteCustomerForm
                customer={data.customer}
                address={data.address}
                errors={errors}
                onCustomerChange={(customer) => {
                  setData((prev) => ({ ...prev, customer }));
                  setErrors((prev) => ({
                    ...prev,
                    customerType: undefined,
                    organizationName: undefined,
                    fullName: undefined,
                    email: undefined,
                    phone: undefined,
                  }));
                }}
                onAddressChange={(address) => {
                  setData((prev) => ({ ...prev, address }));
                  setErrors((prev) => ({
                    ...prev,
                    line1: undefined,
                    city: undefined,
                    state: undefined,
                    pincode: undefined,
                    country: undefined,
                  }));
                }}
              />
            ) : null}

            {step === "review" ? (
              <QuoteReview data={data} onEdit={goTo} />
            ) : null}

            <div className={styles.actions}>
              {step !== "products" ? (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => {
                    const index = STEP_ORDER.indexOf(step);
                    const prev = STEP_ORDER[index - 1];
                    if (prev) goTo(prev);
                  }}
                >
                  Back
                </button>
              ) : null}
              {step !== "review" ? (
                <button
                  type="button"
                  className="btn btn--dark"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--dark"
                  onClick={handleSubmit}
                  disabled={processing}
                >
                  {processing ? "Submitting request..." : "Submit quote request"}
                </button>
              )}
            </div>
          </div>

          <div className={styles.side}>
            <QuoteSummary
              data={data}
              step={step}
              processing={processing}
              onContinue={handleContinue}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>

      <ProductPicker
        open={pickerOpen}
        selectedIds={selectedIds}
        onClose={() => setPickerOpen(false)}
        onAdd={(productId) => {
          const line = createQuoteLine(productId);
          if (!line) return;
          setData((prev) => {
            if (prev.lines.some((item) => item.productId === productId)) {
              return prev;
            }
            return { ...prev, lines: [...prev.lines, line] };
          });
          setErrors((prev) => ({ ...prev, products: undefined }));
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
