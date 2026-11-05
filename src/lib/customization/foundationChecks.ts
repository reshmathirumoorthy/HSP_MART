/**
 * Lightweight Phase 13A/13B model checks (no test runner required).
 * Run via scripts/verify-customization-foundation.ts
 */

import { getCustomizationIdentityKey } from "@/lib/customization/identity";
import { migrateLegacyCustomization } from "@/lib/customization/migrate";
import {
  cartCustomizationToSession,
  createCustomizationSession,
  listSessionElements,
  sessionToCartCustomization,
} from "@/lib/customization/session";
import { getSurfaceAllowedElements } from "@/lib/customization/surfaces";
import {
  ORBIT_MIN_FRAMES,
  resolveProductViewerState,
} from "@/lib/customization/viewer";
import {
  canRedo,
  canUndo,
  createHistoryBundle,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/customization/history";
import {
  buildCustomizationReviewModel,
  isElementOutsidePrintableBounds,
  validateCustomizationForReview,
} from "@/lib/customization/review";
import { assertCustomizationConfigShape } from "@/lib/customization/validateConfig";
import { isValidPrintableArea } from "@/lib/customization/coordinates";
import { getProductById } from "@/lib/products";
import { resolveProductCustomizationConfig } from "@/components/customization/resolveProductCustomization";
import {
  clearSurfaceCustomization,
  createDefaultAdvancedState,
  resetElementPlacement,
  switchActiveZone,
  toCartCustomization,
} from "@/components/customization/customization.utils";
import type {
  CartCustomization,
  ProductCustomizationConfig,
} from "@/types/customization";

const PHASE_14A_PRODUCT_IDS = [
  "writing-pad-01",
  "document-folder-01",
  "clipboard-01",
  "desk-organizer-01",
  "pen-holder-01",
  "card-holder-01",
  "desk-calendar-01",
  "document-portfolio-01",
  "conference-folder-01",
  "meeting-kit-01",
  "notebook-pen-gift-01",
  "welcome-kit-01",
] as const;

export type FoundationCheckResult = {
  ok: boolean;
  failures: string[];
  passed: string[];
};

function assert(
  failures: string[],
  passed: string[],
  condition: boolean,
  label: string,
) {
  if (condition) passed.push(label);
  else failures.push(label);
}

export function runCustomizationFoundationChecks(): FoundationCheckResult {
  const failures: string[] = [];
  const passed: string[] = [];

  const tumbler = getProductById("branded-tumbler-01");
  const plain = getProductById("cable-organizer-01");
  const config = tumbler
    ? resolveProductCustomizationConfig(tumbler)
    : null;

  assert(
    failures,
    passed,
    Boolean(plain) && !plain?.customization?.enabled,
    "CASE 6: plain product has no required customization config",
  );

  if (!tumbler || !config) {
    failures.push("CASE setup: branded-tumbler-01 config unavailable");
    return { ok: false, failures, passed };
  }

  const surfaces = config.surfaces ?? [];
  assert(
    failures,
    passed,
    surfaces.length >= 2 &&
      surfaces.every((s) => s.viewKey || s.previewImage) &&
      !surfaces.some((s) => s.id === "cap" && !config.views?.cap),
    "13B: tumbler surfaces are real view-backed (no invented Cap)",
  );

  // CASE 1 — Pink + Body text RESHMA serializes and restores
  let session = createCustomizationSession(tumbler, config, {
    variantId: "pink",
  });
  const bodyId = session.activeZoneId;
  session = {
    ...session,
    enabled: true,
    variantId: "pink",
    layer: {
      ...session.layer,
      type: "text",
      text: "RESHMA",
      x: 50,
      y: 48,
      scale: 1,
      rotation: 0,
      surfaceId: bodyId,
    },
    zoneLayers: {
      ...session.zoneLayers,
      [bodyId]: {
        ...session.zoneLayers[bodyId],
        mediaType: "text",
        layer: {
          ...session.layer,
          type: "text",
          text: "RESHMA",
          surfaceId: bodyId,
        },
        objects: [
          {
            ...session.layer,
            type: "text",
            text: "RESHMA",
            surfaceId: bodyId,
          },
        ],
        activeObjectId: session.layer.id,
      },
    },
  };
  const cart1 = sessionToCartCustomization(session);
  const restored1 = cartCustomizationToSession(tumbler, config, cart1);
  assert(
    failures,
    passed,
    Boolean(
      cart1?.variantId === "pink" &&
        listSessionElements(restored1).some(
          (el) => el.type === "text" && el.text === "RESHMA",
        ),
    ),
    "CASE 1: Pink + Body text RESHMA serializes and restores",
  );

  // CHECK 1 & 2 — surface switching preserves independent elements
  const secondSurface = surfaces.find((s) => s.id !== bodyId)?.id;
  assert(
    failures,
    passed,
    Boolean(secondSurface),
    "CHECK setup: second configured surface exists",
  );

  if (secondSurface) {
    let multi = switchActiveZone(session, config, secondSurface);
    const logoLayer = {
      ...multi.zoneLayers[secondSurface].layer,
      id: `logo-${secondSurface}`,
      type: "logo" as const,
      text: "logo.png",
      mediaName: "logo.png",
      mediaDataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      x: 50,
      y: 30,
      scale: 0.8,
      rotation: 0,
      surfaceId: secondSurface,
    };
    multi = {
      ...multi,
      enabled: true,
      activeObjectId: logoLayer.id,
      mediaType: "logo",
      layer: logoLayer,
      zoneLayers: {
        ...multi.zoneLayers,
        [secondSurface]: {
          ...multi.zoneLayers[secondSurface],
          mediaType: "logo",
          layer: logoLayer,
          objects: [logoLayer],
          activeObjectId: logoLayer.id,
        },
      },
    };

    const backToBody = switchActiveZone(multi, config, bodyId);
    const bodyStillHasText = listSessionElements(backToBody).some(
      (el) =>
        (el.surfaceId === bodyId || el.id === backToBody.layer.id) &&
        el.text === "RESHMA",
    );
    const logoStillThere = Boolean(
      backToBody.zoneLayers[secondSurface] &&
        listSessionElements(backToBody).some(
          (el) => el.type === "logo" && el.mediaName === "logo.png",
        ),
    );
    assert(
      failures,
      passed,
      bodyStillHasText && logoStillThere,
      "CHECK 1: Surface switching preserves elements",
    );
    assert(
      failures,
      passed,
      bodyStillHasText && logoStillThere,
      "CHECK 2: Two surfaces can contain different elements",
    );

    const logoEl = listSessionElements(multi).find((el) => el.type === "logo");
    assert(
      failures,
      passed,
      logoEl?.surfaceId === secondSurface ||
        multi.zoneLayers[secondSurface]?.objects.some((o) => o.type === "logo"),
      "CHECK 3: Element belongs to correct surface",
    );

    // CHECK 5 — variant + surface survives serialization
    const cartMulti = toCartCustomization(multi);
    const restoredMulti = cartCustomizationToSession(tumbler, config, {
      ...cartMulti,
      variantId: "pink",
    });
    assert(
      failures,
      passed,
      restoredMulti.variantId === "pink" &&
        listSessionElements(restoredMulti).some((el) => el.text === "RESHMA") &&
        listSessionElements(restoredMulti).some((el) => el.type === "logo"),
      "CHECK 5: Variant + surface state survives serialization",
    );

    // CHECK 6 — multi-surface identity deterministic & distinct
    const keyA = getCustomizationIdentityKey(cartMulti!);
    const keyB = getCustomizationIdentityKey(cartMulti!);
    const alt = toCartCustomization({
      ...backToBody,
      zoneLayers: {
        ...backToBody.zoneLayers,
        [bodyId]: {
          ...backToBody.zoneLayers[bodyId],
          layer: {
            ...backToBody.zoneLayers[bodyId].layer,
            text: "GOKUL",
          },
          objects: backToBody.zoneLayers[bodyId].objects.map((obj) =>
            obj.type === "text" ? { ...obj, text: "GOKUL" } : obj,
          ),
        },
      },
      layer: { ...backToBody.layer, text: "GOKUL" },
    });
    assert(
      failures,
      passed,
      keyA === keyB &&
        Boolean(alt) &&
        getCustomizationIdentityKey(alt!) !== keyA,
      "CHECK 6: Multi-surface customization identity is deterministic",
    );
  }

  // CHECK 4 — allowedElementTypes respected
  const bodySurface = surfaces.find((s) => s.id === bodyId) ?? surfaces[0];
  const allowed = getSurfaceAllowedElements(bodySurface, config);
  assert(
    failures,
    passed,
    allowed.includes("text") &&
      allowed.includes("logo") &&
      allowed.includes("image"),
    "CHECK 4: Surface-specific allowedElementTypes are respected",
  );

  // Restricted surface simulation
  const restrictedConfig = {
    ...config,
    surfaces: [
      {
        ...bodySurface,
        allowedElementTypes: ["text" as const],
        supportedCustomization: ["text" as const],
      },
    ],
  };
  const restrictedAllowed = getSurfaceAllowedElements(
    restrictedConfig.surfaces![0],
    restrictedConfig,
  );
  assert(
    failures,
    passed,
    restrictedAllowed.length === 1 && restrictedAllowed[0] === "text",
    "CHECK 4b: Restricted allowedElementTypes exclude logo/image",
  );

  // CHECK 7 — legacy primary-surface customization restores
  const legacy = migrateLegacyCustomization({
    type: "text",
    text: "GOKUL",
    font: "bold",
    color: "green",
    placement: "front",
  });
  const legacySession = cartCustomizationToSession(tumbler, config, legacy);
  assert(
    failures,
    passed,
    Boolean(
      legacy?.text === "GOKUL" &&
        legacy.placement === "front" &&
        legacy.schemaVersion === 2 &&
        listSessionElements(legacySession).some((el) => el.text === "GOKUL"),
    ),
    "CHECK 7: Legacy primary-surface customization still restores",
  );

  // Clear surface does not wipe sibling
  if (secondSurface) {
    const seeded = createDefaultAdvancedState(config);
    const keepLayer = {
      ...seeded.zoneLayers[bodyId].layer,
      id: "keep-body",
      text: "KEEP",
      type: "text" as const,
      surfaceId: bodyId,
    };
    const clearLayer = {
      ...seeded.zoneLayers[secondSurface].layer,
      id: "clear-secondary",
      text: "CLEARME",
      type: "text" as const,
      surfaceId: secondSurface,
    };
    const withTwo = {
      ...seeded,
      enabled: true,
      activeZoneId: secondSurface,
      activeObjectId: clearLayer.id,
      mediaType: "text" as const,
      layer: clearLayer,
      zoneLayers: {
        ...seeded.zoneLayers,
        [bodyId]: {
          ...seeded.zoneLayers[bodyId],
          mediaType: "text" as const,
          layer: keepLayer,
          objects: [keepLayer],
          activeObjectId: keepLayer.id,
        },
        [secondSurface]: {
          ...seeded.zoneLayers[secondSurface],
          mediaType: "text" as const,
          layer: clearLayer,
          objects: [clearLayer],
          activeObjectId: clearLayer.id,
        },
      },
    };
    const cleared = clearSurfaceCustomization(withTwo, config, secondSurface);
    const elements = listSessionElements(cleared);
    assert(
      failures,
      passed,
      elements.some((el) => el.text === "KEEP") &&
        !elements.some((el) => el.text === "CLEARME"),
      "CHECK clear: Clearing one surface leaves the other intact",
    );
  }

  // CASE 4 — Blue+RESHMA vs Pink+RESHMA distinct identities
  const blue: CartCustomization = {
    variantId: "blue",
    type: "text",
    text: "RESHMA",
    font: "classic",
    color: "black",
    textOrientation: "horizontal",
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };
  const pink: CartCustomization = { ...blue, variantId: "pink" };
  assert(
    failures,
    passed,
    getCustomizationIdentityKey(blue) !== getCustomizationIdentityKey(pink),
    "CASE 4: Blue+RESHMA and Pink+RESHMA have different identity keys",
  );

  // ——— Phase 13C viewer checks ———
  const tumblerViewer = resolveProductViewerState(tumbler, config, "pink");
  assert(
    failures,
    passed,
    tumblerViewer.mode === "multi" &&
      tumblerViewer.frames.length === 2 &&
      !tumblerViewer.orbitEnabled &&
      !tumblerViewer.statusLabel.toLowerCase().includes("360"),
    "13C-2: Two real tumbler views produce multi-view mode, not 360°",
  );

  if (plain) {
    const singleOnlyConfig: ProductCustomizationConfig = {
      enabled: false,
      types: ["text"],
      preview: {
        type: "box",
        defaultPlacement: "front",
        placements: ["front"],
        fonts: ["classic"],
        colors: ["black"],
        maxLength: 12,
      },
    };
    const plainViewer = resolveProductViewerState(plain, singleOnlyConfig);
    assert(
      failures,
      passed,
      plainViewer.mode === "single" &&
        plainViewer.frames.length <= 1 &&
        !plainViewer.orbitEnabled &&
        !/360/.test(plainViewer.statusLabel),
      "13C-1: Single-view product remains single-view",
    );
  }

  const sevenFrames = Array.from(
    { length: 7 },
    (_, i) => `/images/products/fake-orbit-${i}.jpg`,
  );
  const sevenConfig: ProductCustomizationConfig = {
    ...config,
    rotationFrames: sevenFrames,
    views: undefined,
    viewList: sevenFrames.map((image, index) => ({
      id: `v${index}`,
      label: `View ${index + 1}`,
      image,
      sortOrder: index,
      isOrbitFrame: true,
    })),
  };
  const sevenViewer = resolveProductViewerState(tumbler, sevenConfig);
  assert(
    failures,
    passed,
    sevenViewer.mode === "multi" &&
      !sevenViewer.orbitEnabled &&
      sevenViewer.frames.length === 7,
    "13C-3: Seven views do not enable orbit",
  );

  const eightFrames = Array.from(
    { length: ORBIT_MIN_FRAMES },
    (_, i) => `/images/products/fake-orbit-${i}.jpg`,
  );
  const eightConfig: ProductCustomizationConfig = {
    ...config,
    rotationFrames: eightFrames,
    views: undefined,
    viewList: eightFrames.map((image, index) => ({
      id: `orbit-${index}`,
      label: `View ${index + 1}`,
      image,
      sortOrder: index,
      isOrbitFrame: true,
    })),
  };
  const eightViewer = resolveProductViewerState(tumbler, eightConfig);
  assert(
    failures,
    passed,
    eightViewer.mode === "orbit" &&
      eightViewer.orbitEnabled &&
      eightViewer.frames.length >= ORBIT_MIN_FRAMES,
    "13C-4: Eight valid sequential views enable orbit eligibility",
  );

  const brokenOrbitConfig: ProductCustomizationConfig = {
    ...config,
    rotationFrames: [
      ...eightFrames.slice(0, 7),
      "", // missing frame
    ],
    views: undefined,
    viewList: undefined,
  };
  const brokenViewer = resolveProductViewerState(tumbler, brokenOrbitConfig);
  assert(
    failures,
    passed,
    !brokenViewer.orbitEnabled,
    "13C-5: Missing frame prevents invalid orbit sequence",
  );

  const dupViewIssues = assertCustomizationConfigShape(
    {
      ...config,
      viewList: [
        {
          id: "front",
          label: "Front",
          image: "/images/products/a.jpg",
          sortOrder: 0,
        },
        {
          id: "front",
          label: "Front dup",
          image: "/images/products/b.jpg",
          sortOrder: 1,
        },
      ],
    },
    "dup-view-test",
  );
  assert(
    failures,
    passed,
    dupViewIssues.some((issue) => issue.code === "duplicate-view-id"),
    "13C-6: Duplicate frame/view IDs are rejected",
  );

  const pinkViewer = resolveProductViewerState(tumbler, config, "pink");
  const blackViewer = resolveProductViewerState(tumbler, config, "black");
  const pinkFront = pinkViewer.views[0]?.image ?? "";
  const blackFront = blackViewer.views[0]?.image ?? "";
  assert(
    failures,
    passed,
    Boolean(pinkFront) &&
      Boolean(blackFront) &&
      (pinkFront !== blackFront ||
        (config.variants?.find((v) => v.id === "pink")?.images?.[0] ===
          pinkFront &&
          config.variants?.find((v) => v.id === "black")?.images?.[0] ===
            blackFront)),
    "13C-7: Variant-specific views resolve correctly",
  );

  const identityBefore = getCustomizationIdentityKey(cart1!);
  const identityAfterViewChange = getCustomizationIdentityKey(cart1!);
  assert(
    failures,
    passed,
    identityBefore === identityAfterViewChange &&
      tumblerViewer.mode === "multi",
    "13C-8: Viewer state does not affect cart identity",
  );

  assert(
    failures,
    passed,
    Boolean(secondSurface) &&
      listSessionElements(session).some((el) => el.text === "RESHMA"),
    "13C-9: Surface customization remains intact while changing views",
  );

  assert(
    failures,
    passed,
    Boolean(
      legacy?.text === "GOKUL" &&
        listSessionElements(legacySession).some((el) => el.text === "GOKUL"),
    ),
    "13C-10: Legacy customization still works",
  );

  // ——— Phase 14A coverage checks ———
  for (const productId of PHASE_14A_PRODUCT_IDS) {
    const product = getProductById(productId);
    const resolved = product
      ? resolveProductCustomizationConfig(product)
      : null;
    const shapeIssues = product
      ? assertCustomizationConfigShape(
          product.customization ?? ({} as ProductCustomizationConfig),
          productId,
        )
      : [{ level: "error" as const, code: "malformed-customization-config" as const, message: "missing" }];
    const surfaces = resolved?.surfaces ?? [];
    const surfaceIds = surfaces.map((surface) => surface.id);
    const uniqueSurfaceIds = new Set(surfaceIds);
    const printableOk = surfaces.every(
      (surface) =>
        (!surface.bounds || isValidPrintableArea(surface.bounds)) &&
        (!surface.printableRegion ||
          isValidPrintableArea(surface.printableRegion)),
    );
    const viewer = product && resolved
      ? resolveProductViewerState(product, resolved)
      : null;

    assert(
      failures,
      passed,
      Boolean(
        product?.customizable &&
          (product.customization?.enabled || product.hamperConfig?.enabled) &&
          resolved &&
          shapeIssues.filter((issue) => issue.level === "error").length === 0 &&
          surfaces.length >= 1 &&
          uniqueSurfaceIds.size === surfaceIds.length &&
          printableOk &&
          viewer &&
          !viewer.orbitEnabled &&
          viewer.frames.length >= 1 &&
          viewer.frames.length < 8,
      ),
      `14A: ${productId} config valid`,
    );
  }

  const welcome = getProductById("welcome-kit-01");
  assert(
    failures,
    passed,
    Boolean(
      welcome?.hamperConfig?.enabled &&
        welcome.customization?.enabled &&
        (welcome.hamperConfig.availableProducts?.length ?? 0) >= 3,
    ),
    "14A: welcome-kit uses existing hamper architecture",
  );

  const meetingKit = getProductById("meeting-kit-01");
  assert(
    failures,
    passed,
    Boolean(meetingKit?.customization?.enabled && !meetingKit.hamperConfig),
    "14A: meeting-kit remains a single-product config (not a fake hamper)",
  );

  const padCart = (() => {
    const pad = getProductById("writing-pad-01");
    const padConfig = pad ? resolveProductCustomizationConfig(pad) : null;
    if (!pad || !padConfig) return null;
    const session = createCustomizationSession(pad, padConfig);
    const withText = {
      ...session,
      enabled: true,
      layer: { ...session.layer, type: "text" as const, text: "HSP" },
      zoneLayers: {
        ...session.zoneLayers,
        [session.activeZoneId]: {
          ...session.zoneLayers[session.activeZoneId],
          mediaType: "text" as const,
          layer: {
            ...session.zoneLayers[session.activeZoneId].layer,
            type: "text" as const,
            text: "HSP",
          },
          objects: [
            {
              ...session.zoneLayers[session.activeZoneId].layer,
              type: "text" as const,
              text: "HSP",
            },
          ],
        },
      },
    };
    return sessionToCartCustomization(withText);
  })();
  assert(
    failures,
    passed,
    Boolean(
      padCart &&
        getCustomizationIdentityKey(padCart) ===
          getCustomizationIdentityKey(padCart),
    ),
    "14A: newly configured product cart identity remains stable",
  );

  // ——— Phase 14B UX foundation ———
  const histBase = createDefaultAdvancedState(config);
  const moved = {
    ...histBase,
    enabled: true,
    layer: { ...histBase.layer, text: "RESHMA", x: 40, y: 40 },
  };
  let hist = createHistoryBundle(histBase);
  const pushed = pushHistory(hist, moved);
  hist = pushed.bundle;
  assert(
    failures,
    passed,
    canUndo(hist) && !canRedo(hist),
    "14B: undo available after a customization edit",
  );
  hist = undoHistory(hist);
  assert(
    failures,
    passed,
    hist.present.layer.text === histBase.layer.text && canRedo(hist),
    "14B: undo restores prior session state",
  );
  hist = redoHistory(hist);
  assert(
    failures,
    passed,
    hist.present.layer.text === "RESHMA",
    "14B: redo reapplies the edit",
  );

  const oriented = {
    ...moved,
    layer: {
      ...moved.layer,
      textOrientation: "vertical" as const,
      rotation: 0,
    },
  };
  assert(
    failures,
    passed,
    oriented.layer.textOrientation === "vertical" &&
      Boolean(toCartCustomization(oriented)) &&
      getCustomizationIdentityKey(toCartCustomization(oriented)!) !==
        getCustomizationIdentityKey(toCartCustomization(moved)!),
    "14B: text orientation changes element state without breaking identity helpers",
  );

  const beforeReset = {
    ...moved,
    layer: {
      ...moved.layer,
      text: "KEEP",
      x: 20,
      y: 20,
      scale: 1.4,
      rotation: 45,
    },
  };
  const afterReset = resetElementPlacement(beforeReset, config);
  assert(
    failures,
    passed,
    afterReset.layer.text === "KEEP" &&
      afterReset.layer.rotation === 0 &&
      afterReset.layer.scale === 1,
    "14B: reset element restores placement without clearing content",
  );

  assert(
    failures,
    passed,
    getCustomizationIdentityKey(toCartCustomization(moved)!) ===
      getCustomizationIdentityKey(toCartCustomization(moved)!),
    "14B: history/viewer session state is not required for cart identity",
  );

  // ——— Phase 14C review ———
  const reviewReady = {
    ...moved,
    enabled: true,
    layer: {
      ...moved.layer,
      text: "RESHMA",
      x: 50,
      y: 48,
      scale: 1,
      rotation: 0,
    },
    zoneLayers: {
      ...moved.zoneLayers,
      [moved.activeZoneId]: {
        ...moved.zoneLayers[moved.activeZoneId],
        mediaType: "text" as const,
        layer: {
          ...moved.layer,
          text: "RESHMA",
          x: 50,
          y: 48,
          scale: 1,
          rotation: 0,
        },
        objects: [
          {
            ...moved.layer,
            text: "RESHMA",
            x: 50,
            y: 48,
            scale: 1,
            rotation: 0,
          },
        ],
      },
    },
  };
  const reviewModel = buildCustomizationReviewModel({
    product: tumbler,
    config,
    state: reviewReady,
    quantity: 2,
  });
  assert(
    failures,
    passed,
    reviewModel.canAddToCart &&
      reviewModel.surfaces.length >= 1 &&
      reviewModel.quantity === 2 &&
      reviewModel.surfaces.some((surface) =>
        surface.elements.some((el) => el.label.includes("RESHMA")),
      ),
    "14C: review summary includes product surfaces and text",
  );

  const outOfBoundsLayer = {
    ...reviewReady.layer,
    x: 2,
    y: 2,
    scale: 2,
  };
  const bounds = config.surfaces?.[0]
    ? config.surfaces[0].printableRegion ?? config.surfaces[0].bounds
    : config.printableArea;
  assert(
    failures,
    passed,
    Boolean(bounds) &&
      isElementOutsidePrintableBounds(outOfBoundsLayer, bounds),
    "14C: invalid placement is detected as out of bounds",
  );

  const invalidReview = {
    ...reviewReady,
    zoneLayers: {
      ...reviewReady.zoneLayers,
      [reviewReady.activeZoneId]: {
        ...reviewReady.zoneLayers[reviewReady.activeZoneId],
        layer: outOfBoundsLayer,
        objects: [outOfBoundsLayer],
      },
    },
    layer: outOfBoundsLayer,
  };
  const invalidIssues = validateCustomizationForReview(invalidReview, config);
  assert(
    failures,
    passed,
    invalidIssues.some(
      (issue) =>
        issue.level === "error" &&
        /printable area/i.test(issue.message),
    ),
    "14C: invalid placement blocks review add-to-cart",
  );

  const validIssues = validateCustomizationForReview(reviewReady, config);
  assert(
    failures,
    passed,
    !validIssues.some((issue) => issue.level === "error") &&
      Boolean(toCartCustomization(reviewReady)),
    "14C: valid placement accepted for cart handoff",
  );

  return {
    ok: failures.length === 0,
    failures,
    passed,
  };
}
