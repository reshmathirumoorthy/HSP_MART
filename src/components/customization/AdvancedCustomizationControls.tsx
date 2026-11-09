"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import type {
  AdvancedCustomizationState,
  CustomizationMediaType,
  ProductCustomizationConfig,
} from "@/types/customization";
import {
  COLOR_LABELS,
  COLOR_VALUES,
  FONT_LABELS,
  MEDIA_TYPE_LABELS,
  TEXT_ORIENTATION_OPTIONS,
  clampRotation,
  getSurfaceSupportedTypes,
  getVariants,
  getZoneById,
  layerHasContent,
  readImageFile,
  resolveCustomizationZones,
  resolveTextOrientation,
  validateUploadFile,
  zoneHasContent,
} from "@/components/customization/customization.utils";
import { CustomizationSurfaceSelector } from "@/components/customization/CustomizationSurfaceSelector";
import { ZoneSurfaceMap } from "@/components/customization/ZoneSurfaceMap";
import styles from "./customization.module.css";

type Props = {
  config: ProductCustomizationConfig;
  state: AdvancedCustomizationState;
  error: string | null;
  onChange: (next: Partial<AdvancedCustomizationState>) => void;
  onLayerChange: (
    next: Partial<AdvancedCustomizationState["layer"]>,
    objectId?: string,
  ) => void;
  onZoneChange: (zoneId: string) => void;
  onSelectObject?: (objectId: string) => void;
  onAddObject?: (mediaType: CustomizationMediaType) => void;
  onRemoveObject?: (objectId: string) => void;
  onClearSurface?: (surfaceId: string) => void;
  onReset: () => void;
  onResetElement?: () => void;
  onNudge: (dx: number, dy: number) => void;
  /** full = show surface chips; compact = surface tabs live in the studio toolbar. */
  surfacePicker?: "full" | "compact";
  /** Hide the reset button when it lives in the studio toolbar. */
  showReset?: boolean;
};

export function AdvancedCustomizationControls({
  config,
  state,
  error,
  onChange,
  onLayerChange,
  onZoneChange,
  onSelectObject,
  onAddObject,
  onRemoveObject,
  onClearSurface,
  onReset,
  onResetElement,
  onNudge,
  surfacePicker = "full",
  showReset = true,
}: Props) {
  const variantLabelId = useId();
  const variants = getVariants(config);
  const zones = resolveCustomizationZones(config);
  const activeZone = getZoneById(config, state.activeZoneId);
  const supported = getSurfaceSupportedTypes(config, state.activeZoneId);
  const uploadId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textOrientation = resolveTextOrientation(state.layer.textOrientation);
  const rotation = clampRotation(state.layer.rotation ?? 0);
  const surfaceObjects =
    state.zoneLayers[state.activeZoneId]?.objects ?? [state.layer];
  const surfaceEmpty =
    !surfaceObjects.some((obj) => layerHasContent(obj)) &&
    !zoneHasContent({
      mediaType: state.mediaType,
      layer: state.layer,
      objects: surfaceObjects,
    });
  const selectedHasContent = layerHasContent(state.layer);
  // Allow editing newly added empty text/logo/image before content exists.
  const showTextControls = state.layer.type === "text";
  const showMediaControls =
    state.layer.type === "logo" || state.layer.type === "image";
  const showTransform =
    selectedHasContent || showTextControls || showMediaControls;
  const primaryOrientations = TEXT_ORIENTATION_OPTIONS.filter(
    (option) => option.id !== "horizontal-reverse",
  );

  const handleTypeChange = (mediaType: CustomizationMediaType) => {
    setUploadError(null);
    onChange({
      mediaType,
      layer: {
        ...state.layer,
        type: mediaType,
        text: mediaType === "text" ? state.layer.text : state.layer.text,
        mediaDataUrl:
          mediaType === "text" ? undefined : state.layer.mediaDataUrl,
        mediaName: mediaType === "text" ? undefined : state.layer.mediaName,
      },
    });
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const typeError = validateUploadFile(file);
    if (typeError) {
      setUploadError(typeError);
      return;
    }
    try {
      const result = await readImageFile(file);
      setUploadError(null);
      onLayerChange({
        mediaDataUrl: result.dataUrl,
        mediaName: file.name,
        type: state.mediaType,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not read that image.",
      );
    }
  };

  const customizedZones = Object.values(state.zoneLayers).filter((entry) =>
    zoneHasContent(entry),
  );

  return (
    <div className={styles.controls}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.controlBtn} ${
            state.enabled ? styles.controlBtnActive : ""
          }`}
          aria-pressed={state.enabled}
          onClick={() => onChange({ enabled: !state.enabled })}
        >
          {state.enabled ? "Customizing" : "Customize this product"}
        </button>
        {state.enabled && showReset ? (
          <button type="button" className={styles.controlBtn} onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>

      {state.enabled ? (
        <>
          {variants.length > 0 ? (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>Finish</h3>
              <div className={styles.field}>
                <p className={styles.label} id={variantLabelId}>
                  Colour
                </p>
                <div
                  className={styles.variantRow}
                  role="group"
                  aria-labelledby={variantLabelId}
                >
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className={`${styles.variantSwatch} ${
                        state.variantId === variant.id
                          ? styles.variantSwatchActive
                          : ""
                      }`}
                      style={
                        {
                          "--swatch-color": variant.color ?? "#ccc",
                        } as CSSProperties
                      }
                      aria-label={variant.label}
                      aria-pressed={state.variantId === variant.id}
                      title={variant.label}
                      onClick={() => onChange({ variantId: variant.id })}
                    >
                      <span className={styles.variantLabel}>
                        {variant.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {surfacePicker === "full" ? (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>Surface</h3>
              <div className={styles.field}>
                <CustomizationSurfaceSelector
                  surfaces={zones}
                  activeSurfaceId={state.activeZoneId}
                  zoneLayers={state.zoneLayers}
                  onSelect={onZoneChange}
                  labelId="zone-select-label"
                />
                {zones.length > 1 ? (
                  <ZoneSurfaceMap
                    previewType={config.preview.type}
                    zones={zones}
                    activeZoneId={state.activeZoneId}
                    onSelect={onZoneChange}
                  />
                ) : null}
                {customizedZones.length > 1 ? (
                  <p className={styles.helper}>
                    {customizedZones.length} surfaces customized
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>
              {surfaceEmpty ? "Add element" : "Elements"}
            </h3>
            <div
              className={styles.field}
              id="customization-surface-panel"
              role="tabpanel"
              aria-labelledby={`surface-tab-${state.activeZoneId}`}
            >
              {surfaceEmpty ? (
                <div className={styles.surfaceEmpty}>
                  <p className={styles.helper}>
                    Nothing on {activeZone?.label ?? "this surface"} yet. Add
                    text, a logo or an image to begin.
                  </p>
                  {onAddObject ? (
                    <div className={styles.addRow}>
                      {supported.map((type) => (
                        <button
                          key={`empty-add-${type}`}
                          type="button"
                          className={styles.addBtn}
                          onClick={() => onAddObject(type)}
                        >
                          +{" "}
                          {type === "text"
                            ? "Add Text"
                            : type === "logo"
                              ? "Add Logo"
                              : "Add Image"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  {onSelectObject ? (
                    <div
                      className={styles.layerList}
                      role="listbox"
                      aria-label="Elements"
                    >
                      {surfaceObjects.map((obj, index) => {
                        const label =
                          obj.type === "text"
                            ? obj.text?.trim() || `Text ${index + 1}`
                            : obj.mediaName || MEDIA_TYPE_LABELS[obj.type];
                        const selected = state.activeObjectId === obj.id;
                        return (
                          <button
                            key={obj.id}
                            type="button"
                            role="option"
                            className={`${styles.layerItem} ${
                              selected ? styles.layerItemActive : ""
                            }`}
                            aria-selected={selected}
                            onClick={() => {
                              setConfirmDelete(false);
                              onSelectObject(obj.id);
                            }}
                          >
                            <span className={styles.layerItemMark} aria-hidden>
                              {selected ? "●" : "○"}
                            </span>
                            <span className={styles.layerItemLabel}>{label}</span>
                            <span className={styles.layerItemType}>
                              {MEDIA_TYPE_LABELS[obj.type]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {onAddObject ? (
                    <div className={styles.addRow}>
                      {supported.map((type) => (
                        <button
                          key={`add-${type}`}
                          type="button"
                          className={styles.addBtn}
                          onClick={() => onAddObject(type)}
                        >
                          + Add {MEDIA_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {showTextControls ? (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>Text</h3>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="custom-text">
                  Content
                </label>
                <input
                  id="custom-text"
                  className={styles.input}
                  value={state.layer.text ?? ""}
                  maxLength={config.preview.maxLength}
                  placeholder="e.g. YOUR NAME"
                  autoComplete="off"
                  onChange={(event) =>
                    onLayerChange({ text: event.target.value })
                  }
                />
                <p className={styles.helper}>
                  {(state.layer.text ?? "").trim().length}/
                  {config.preview.maxLength} characters
                </p>
                {error ? <p className={styles.error}>{error}</p> : null}
              </div>

              <div className={styles.field}>
                <p className={styles.label} id="custom-font-label">
                  Font
                </p>
                <div
                  className={styles.chipRow}
                  role="group"
                  aria-labelledby="custom-font-label"
                >
                  {config.preview.fonts.map((font) => (
                    <button
                      key={font}
                      type="button"
                      className={`${styles.chip} ${
                        state.layer.font === font ? styles.chipActive : ""
                      }`}
                      aria-pressed={state.layer.font === font}
                      onClick={() => onLayerChange({ font })}
                    >
                      {FONT_LABELS[font]}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <p className={styles.label} id="text-orientation-label">
                  Orientation
                </p>
                <div
                  className={styles.chipRow}
                  role="group"
                  aria-labelledby="text-orientation-label"
                >
                  {primaryOrientations.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.chip} ${
                        textOrientation === option.id ? styles.chipActive : ""
                      }`}
                      aria-label={option.ariaLabel}
                      aria-pressed={textOrientation === option.id}
                      onClick={() =>
                        onLayerChange({ textOrientation: option.id })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <p className={styles.label} id="custom-color-label">
                  Colour
                </p>
                <div
                  className={styles.chipRow}
                  role="group"
                  aria-labelledby="custom-color-label"
                >
                  {config.preview.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.swatch} ${
                        state.layer.color === color ? styles.swatchActive : ""
                      }`}
                      style={{ background: COLOR_VALUES[color] }}
                      aria-label={COLOR_LABELS[color]}
                      aria-pressed={state.layer.color === color}
                      onClick={() => onLayerChange({ color })}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {showMediaControls ? (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>
                {state.layer.type === "logo" ? "Logo" : "Image"}
              </h3>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={uploadId}>
                  File
                </label>
                <input
                  ref={fileRef}
                  id={uploadId}
                  className={styles.fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className={`${styles.controlBtn} ${styles.controlBtnWide}`}
                  onClick={() => {
                    handleTypeChange(state.layer.type);
                    fileRef.current?.click();
                  }}
                >
                  {state.layer.mediaName
                    ? `Replace · ${state.layer.mediaName}`
                    : state.layer.type === "logo"
                      ? "Choose logo file"
                      : "Choose image file"}
                </button>
                <p className={styles.helper}>
                  PNG, JPG or WEBP · max 2 MB · stays in your browser only
                </p>
                {uploadError ? (
                  <p className={styles.error}>{uploadError}</p>
                ) : null}
                {error ? <p className={styles.error}>{error}</p> : null}
              </div>
            </section>
          ) : null}

          {showTransform ? (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>Adjust</h3>
              <div className={styles.field}>
                <p className={styles.label} id="size-label">
                  Size
                </p>
                <div
                  className={styles.sizeRow}
                  role="group"
                  aria-labelledby="size-label"
                >
                  <button
                    type="button"
                    className={styles.sizeBtn}
                    aria-label="Decrease size"
                    onClick={() =>
                      onLayerChange({
                        scale: Math.max(
                          0.4,
                          Number((state.layer.scale - 0.1).toFixed(2)),
                        ),
                      })
                    }
                  >
                    −
                  </button>
                  <span className={styles.sizeValue} aria-live="polite">
                    {Math.round(state.layer.scale * 100)}%
                  </span>
                  <button
                    type="button"
                    className={styles.sizeBtn}
                    aria-label="Increase size"
                    onClick={() =>
                      onLayerChange({
                        scale: Math.min(
                          2.2,
                          Number((state.layer.scale + 0.1).toFixed(2)),
                        ),
                      })
                    }
                  >
                    +
                  </button>
                  <input
                    type="range"
                    className={styles.sizeSlider}
                    min={0.4}
                    max={2.2}
                    step={0.05}
                    value={state.layer.scale}
                    aria-label="Customization size"
                    onChange={(event) =>
                      onLayerChange({ scale: Number(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className={styles.field}>
                <p className={styles.label} id="rotation-label">
                  Rotation
                </p>
                <div
                  className={styles.sizeRow}
                  role="group"
                  aria-labelledby="rotation-label"
                >
                  <button
                    type="button"
                    className={styles.sizeBtn}
                    aria-label="Rotate left"
                    onClick={() => onLayerChange({ rotation: rotation - 15 })}
                  >
                    ↺
                  </button>
                  <span className={styles.sizeValue} aria-live="polite">
                    {rotation}°
                  </span>
                  <button
                    type="button"
                    className={styles.sizeBtn}
                    aria-label="Rotate right"
                    onClick={() => onLayerChange({ rotation: rotation + 15 })}
                  >
                    ↻
                  </button>
                  <input
                    type="range"
                    className={styles.sizeSlider}
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    aria-label="Customization rotation"
                    onChange={(event) =>
                      onLayerChange({ rotation: Number(event.target.value) })
                    }
                  />
                </div>
                <div className={styles.chipRow}>
                  {[0, 45, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      className={`${styles.chip} ${
                        rotation === (deg > 180 ? deg - 360 : deg)
                          ? styles.chipActive
                          : ""
                      }`}
                      onClick={() =>
                        onLayerChange({
                          rotation: deg === 270 ? -90 : deg === 180 ? 180 : deg,
                        })
                      }
                    >
                      {deg}°
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.chip}
                    onClick={() => onLayerChange({ rotation: 0 })}
                  >
                    Reset rotation
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <p className={styles.label} id="position-label">
                  Position
                </p>
                <div
                  className={styles.nudgeGrid}
                  role="group"
                  aria-labelledby="position-label"
                >
                  <span />
                  <button
                    type="button"
                    className={styles.nudgeBtn}
                    aria-label="Move up"
                    onClick={() => onNudge(0, -4)}
                  >
                    ↑
                  </button>
                  <span />
                  <button
                    type="button"
                    className={styles.nudgeBtn}
                    aria-label="Move left"
                    onClick={() => onNudge(-4, 0)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.nudgeBtn}
                    aria-label="Center"
                    onClick={() =>
                      onLayerChange({
                        x: activeZone?.defaultPosition?.x ?? 50,
                        y: activeZone?.defaultPosition?.y ?? 50,
                      })
                    }
                  >
                    ·
                  </button>
                  <button
                    type="button"
                    className={styles.nudgeBtn}
                    aria-label="Move right"
                    onClick={() => onNudge(4, 0)}
                  >
                    →
                  </button>
                  <span />
                  <button
                    type="button"
                    className={styles.nudgeBtn}
                    aria-label="Move down"
                    onClick={() => onNudge(0, 4)}
                  >
                    ↓
                  </button>
                  <span />
                </div>
              </div>

              <div className={styles.chipRow}>
                {onResetElement ? (
                  <button
                    type="button"
                    className={styles.chip}
                    onClick={onResetElement}
                  >
                    Reset position
                  </button>
                ) : null}
                {onRemoveObject ? (
                  confirmDelete ? (
                    <>
                      <button
                        type="button"
                        className={styles.chip}
                        onClick={() => {
                          onRemoveObject(state.activeObjectId);
                          setConfirmDelete(false);
                        }}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className={styles.chip}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.chip}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>
                  )
                ) : null}
                {onClearSurface ? (
                  confirmClear ? (
                    <>
                      <button
                        type="button"
                        className={styles.chip}
                        onClick={() => {
                          onClearSurface(state.activeZoneId);
                          setConfirmClear(false);
                        }}
                      >
                        Confirm clear surface
                      </button>
                      <button
                        type="button"
                        className={styles.chip}
                        onClick={() => setConfirmClear(false)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.chip}
                      onClick={() => setConfirmClear(true)}
                    >
                      Clear surface
                    </button>
                  )
                ) : null}
              </div>
            </section>
          ) : null}

          <p className={styles.disclaimer}>
            Preview is for visualization only. Final print placement and
            appearance may vary. 360° rotation uses verified product-angle
            photography only when available.
          </p>
        </>
      ) : (
        <p className={styles.helper}>
          Choose where to customize on the product, then add text, logo or
          image before adding to cart or requesting a quote.
        </p>
      )}
    </div>
  );
}
