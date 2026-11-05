"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  BRAND_STORY_COPY,
  BRAND_STORY_LOOP_SECONDS,
  DEV_ANIMATIC_PREVIEW,
  HSP_MART_LOGO,
  ILLUSTRATED_ASSETS_READY,
  SPRITE_ASSETS,
  TIMELINE,
  VIDEO_ASSETS,
  type AnimationMode,
} from "./animation-config";
import styles from "./BrandStoryAnimation.module.css";

type ResolvedPlayback =
  | { mode: "loading" }
  | { mode: "pending" }
  | { mode: "sprite" }
  | { mode: "video"; webmSrc: string; mp4Src?: string; isDevPreview: boolean };

async function assetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function resolvePlayback(): Promise<ResolvedPlayback> {
  if (ILLUSTRATED_ASSETS_READY) {
    if (await assetExists(VIDEO_ASSETS.webm)) {
      const mp4Ok = await assetExists(VIDEO_ASSETS.mp4);
      return {
        mode: "video",
        webmSrc: VIDEO_ASSETS.webm,
        mp4Src: mp4Ok ? VIDEO_ASSETS.mp4 : undefined,
        isDevPreview: false,
      };
    }
    if (await assetExists(VIDEO_ASSETS.mp4)) {
      return {
        mode: "video",
        webmSrc: VIDEO_ASSETS.webm,
        mp4Src: VIDEO_ASSETS.mp4,
        isDevPreview: false,
      };
    }
    if (await assetExists(SPRITE_ASSETS.sheet)) return { mode: "sprite" };
    return { mode: "pending" };
  }

  // ANIMATIC PREVIEW — NOT PRODUCTION
  // Explicit opt-in only: ?animatic=1 in development when readiness is false.
  if (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("animatic") === "1"
  ) {
    if (await assetExists(DEV_ANIMATIC_PREVIEW.alphaPreviewWebm)) {
      return {
        mode: "video",
        webmSrc: DEV_ANIMATIC_PREVIEW.alphaPreviewWebm,
        isDevPreview: true,
      };
    }
    if (await assetExists(DEV_ANIMATIC_PREVIEW.webm)) {
      return {
        mode: "video",
        webmSrc: DEV_ANIMATIC_PREVIEW.webm,
        isDevPreview: true,
      };
    }
  }

  return { mode: "pending" };
}

/**
 * HSP Mart Brand Story player — consumes REAL illustrated animation assets.
 *
 * Ready for a genuine transparent VP9 WebM at VIDEO_ASSETS.webm:
 * autoplay, muted, loop (~12s), playsInline, transparent CSS stage,
 * HTML brand overlay, reduced-motion static fallback, video error fallback.
 *
 * Does NOT draw characters with CSS/SVG primitives.
 * Does NOT run a static-image slideshow of the storyboard.
 * Does NOT chroma-key the development animatic.
 *
 * Until `/public/animation/hsp-mart/character/brand-story-loop.webm` exists,
 * passes `npm run verify:brand-story`, and ILLUSTRATED_ASSETS_READY is true,
 * renders a safe brand-stage placeholder (or a development-only animatic
 * preview when that file is present).
 */
export function BrandStoryAnimation() {
  const [playback, setPlayback] = useState<ResolvedPlayback>({ mode: "loading" });

  useEffect(() => {
    let alive = true;
    resolvePlayback().then((next) => {
      if (alive) setPlayback(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const mode: AnimationMode | "loading" = playback.mode;

  return (
    <div
      className={styles.root}
      role="img"
      aria-label={BRAND_STORY_COPY.ariaLabel}
      data-animation-mode={mode}
      data-dev-preview={
        playback.mode === "video" && playback.isDevPreview ? "animatic" : undefined
      }
    >
      {playback.mode === "loading" ? (
        <div className={styles.pending} aria-hidden="true">
          <BrandComposition />
        </div>
      ) : null}

      {playback.mode === "video" ? (
        <VideoPlayer webmSrc={playback.webmSrc} mp4Src={playback.mp4Src} />
      ) : null}
      {playback.mode === "sprite" ? <SpritePlayer /> : null}
      {playback.mode === "pending" ? <PendingAssetsPlaceholder /> : null}

      {/* Brand copy — timed overlay when continuous illustrated assets play */}
      {playback.mode === "video" || playback.mode === "sprite" ? (
        <div className={styles.brandOverlay} aria-hidden="true">
          <BrandComposition />
        </div>
      ) : null}

      {/* Reduced motion: static brand presence, no continuous animation */}
      <div className={styles.reducedMotion} aria-hidden="true">
        <ReducedMotionStage />
      </div>
    </div>
  );
}

function BrandComposition() {
  return (
    <>
      <BrandMark />
      <p className={styles.brandTitle}>{BRAND_STORY_COPY.title}</p>
      <p className={styles.brandLine}>{BRAND_STORY_COPY.tagline}</p>
    </>
  );
}

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative brand mark inside animation stage
    <img
      className={styles.logo}
      src={HSP_MART_LOGO}
      alt=""
      width={163}
      height={137}
      decoding="async"
    />
  );
}

function ReducedMotionStage() {
  const [posterOk, setPosterOk] = useState(false);

  useEffect(() => {
    if (!ILLUSTRATED_ASSETS_READY) return;
    let alive = true;
    assetExists(VIDEO_ASSETS.poster).then((ok) => {
      if (alive) setPosterOk(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {posterOk ? (
        // eslint-disable-next-line @next/next/no-img-element -- static poster for reduced motion
        <img
          className={styles.poster}
          src={VIDEO_ASSETS.poster}
          alt=""
          width={720}
          height={720}
          decoding="async"
        />
      ) : null}
      <BrandComposition />
    </>
  );
}

function VideoPlayer({
  webmSrc,
  mp4Src,
}: {
  webmSrc: string;
  mp4Src?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.pending} aria-hidden="true" data-fallback="video-error">
        <BrandComposition />
      </div>
    );
  }

  return (
    <div className={styles.stage} aria-hidden="true">
      <video
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={VIDEO_ASSETS.poster}
        onError={() => setFailed(true)}
      >
        <source src={webmSrc} type="video/webm" />
        {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
      </video>
    </div>
  );
}

function SpritePlayer() {
  const duration = `${SPRITE_ASSETS.frameCount / SPRITE_ASSETS.fps}s`;
  const sheetWidth = SPRITE_ASSETS.frameCount * 100;

  return (
    <div className={styles.stage} aria-hidden="true">
      <div
        className={styles.sprite}
        style={
          {
            "--sprite-url": `url(${SPRITE_ASSETS.sheet})`,
            "--sprite-frames": String(SPRITE_ASSETS.frameCount),
            "--sprite-duration": duration,
            "--sprite-width": `${sheetWidth}%`,
          } as CSSProperties
        }
      />
    </div>
  );
}

/**
 * Safe brand stage while the illustrated WebM is not yet supplied.
 * Not a finished animation and not a storyboard slideshow.
 */
function PendingAssetsPlaceholder() {
  return (
    <div className={styles.pending} data-placeholder="assets-required">
      <BrandComposition />
      {process.env.NODE_ENV === "development" ? (
        <p className={styles.pendingNote}>
          Illustrated animation asset required
          <span className={styles.pendingPath}>
            /public/animation/hsp-mart/character/brand-story-loop.webm
          </span>
          Target loop {BRAND_STORY_LOOP_SECONDS}s · brand overlay at{" "}
          {TIMELINE.brandStart}–{TIMELINE.brandEnd}s
        </p>
      ) : null}
    </div>
  );
}
