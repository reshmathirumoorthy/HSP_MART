import type {
  CustomizationState,
  ProductCustomizationConfig,
} from "@/types/customization";
import {
  COLOR_LABELS,
  COLOR_VALUES,
  FONT_LABELS,
  PLACEMENT_LABELS,
  TEXT_ORIENTATION_OPTIONS,
  resolveTextOrientation,
} from "@/components/customization/customization.utils";
import styles from "./customization.module.css";

type Props = {
  config: ProductCustomizationConfig;
  state: CustomizationState;
  error: string | null;
  onChange: (next: Partial<CustomizationState>) => void;
  onReset: () => void;
};

export function CustomizationControls({
  config,
  state,
  error,
  onChange,
  onReset,
}: Props) {
  const textOrientation = resolveTextOrientation(state.textOrientation);

  return (
    <div className={styles.controls}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`btn ${state.enabled ? "btn--dark" : "btn--ghost-dark"}`}
          aria-pressed={state.enabled}
          onClick={() => onChange({ enabled: !state.enabled })}
        >
          {state.enabled ? "Customizing" : "Customize this product"}
        </button>
        {state.enabled ? (
          <button type="button" className="btn btn--ghost-dark" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>

      {state.enabled ? (
        <>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="custom-text">
              Custom text
            </label>
            <input
              id="custom-text"
              className={styles.input}
              value={state.text}
              maxLength={config.preview.maxLength}
              placeholder="e.g. YOUR NAME"
              autoComplete="off"
              onChange={(event) => onChange({ text: event.target.value })}
            />
            <p className={styles.helper}>
              {state.text.trim().length}/{config.preview.maxLength} characters
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
          </div>

          <div className={styles.field}>
            <p className={styles.label} id="custom-font-label">
              Font style
            </p>
            <div className={styles.chipRow} role="group" aria-labelledby="custom-font-label">
              {config.preview.fonts.map((font) => (
                <button
                  key={font}
                  type="button"
                  className={`${styles.chip} ${state.font === font ? styles.chipActive : ""}`}
                  aria-pressed={state.font === font}
                  onClick={() => onChange({ font })}
                >
                  {FONT_LABELS[font]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <p className={styles.label} id="text-orientation-label">
              Text direction
            </p>
            <div
              className={styles.chipRow}
              role="group"
              aria-labelledby="text-orientation-label"
            >
              {TEXT_ORIENTATION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.chip} ${
                    textOrientation === option.id ? styles.chipActive : ""
                  }`}
                  aria-label={option.ariaLabel}
                  aria-pressed={textOrientation === option.id}
                  onClick={() => onChange({ textOrientation: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <p className={styles.label} id="custom-color-label">
              Text color
            </p>
            <div className={styles.chipRow} role="group" aria-labelledby="custom-color-label">
              {config.preview.colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.swatch} ${state.color === color ? styles.swatchActive : ""}`}
                  style={{ background: COLOR_VALUES[color] }}
                  aria-label={COLOR_LABELS[color]}
                  aria-pressed={state.color === color}
                  onClick={() => onChange({ color })}
                />
              ))}
            </div>
          </div>

          {config.preview.placements.length > 1 ? (
            <div className={styles.field}>
              <p className={styles.label} id="custom-placement-label">
                Placement
              </p>
              <div
                className={styles.chipRow}
                role="group"
                aria-labelledby="custom-placement-label"
              >
                {config.preview.placements.map((placement) => (
                  <button
                    key={placement}
                    type="button"
                    className={`${styles.chip} ${state.placement === placement ? styles.chipActive : ""}`}
                    aria-pressed={state.placement === placement}
                    onClick={() => onChange({ placement })}
                  >
                    {PLACEMENT_LABELS[placement]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className={styles.disclaimer}>
            Preview is for visualization only. Final print placement and
            appearance may vary.
          </p>
        </>
      ) : (
        <p className={styles.helper}>
          Add a name or short message and see it on the product before you add
          to cart or request a quote.
        </p>
      )}
    </div>
  );
}
