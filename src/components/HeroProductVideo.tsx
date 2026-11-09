"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";
import styles from "./Hero.module.css";

const VIDEO_SRC = "/videos/hsp-mart-hero-transparent.webm";
const POSTER_SRC = "/videos/hsp-mart-hero-poster.png";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mediaFailed(video: HTMLVideoElement) {
  return (
    video.error != null ||
    video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
  );
}

export function HeroProductVideo() {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const playVideo = !failed && !reduceMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const markFailed = () => {
      if (mediaFailed(video)) setFailed(true);
    };
    const source = video.querySelector("source");
    video.addEventListener("error", markFailed);
    video.addEventListener("emptied", markFailed);
    source?.addEventListener("error", markFailed);
    const poll = window.setInterval(() => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        window.clearInterval(poll);
        return;
      }
      markFailed();
    }, 300);
    const stop = window.setTimeout(() => window.clearInterval(poll), 4000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
      video.removeEventListener("error", markFailed);
      video.removeEventListener("emptied", markFailed);
      source?.removeEventListener("error", markFailed);
    };
  }, [playVideo]);

  return (
    <div className={styles.videoLayer}>
      {playVideo ? (
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          aria-label="HSP Mart product animation"
          onError={() => setFailed(true)}
        >
          <source
            src={VIDEO_SRC}
            type="video/webm"
            onError={() => setFailed(true)}
          />
        </video>
      ) : null}
      <Image
        src={POSTER_SRC}
        loader={shopifyImageLoader(POSTER_SRC)}
        alt={playVideo ? "" : "HSP Mart notebook and pen"}
        fill
        sizes="(max-width: 959px) 100vw, 62vw"
        className={playVideo ? styles.videoFallback : styles.videoStill}
        style={{ objectFit: "contain", background: "transparent" }}
        priority={!playVideo}
      />
    </div>
  );
}
