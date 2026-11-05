/**
 * Verify the HSP Mart brand-story PRODUCTION WebM.
 *
 * Does NOT treat Matroska AlphaMode=1 as proof of transparency.
 * Decoded pixel alpha must demonstrate real transparency when OpenCV (Python)
 * is available. Distinguishes production from the development animatic.
 *
 * Exit codes:
 *   0 — VALID (decoded transparency confirmed)
 *   1 — INVALID (file present but failed checks)
 *   2 — MISSING / awaiting genuine transparent export
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionRel = "public/animation/hsp-mart/character/brand-story-loop.webm";
const animaticRel =
  "public/animation/hsp-mart/character/brand-story-loop-animatic.webm";
const productionPath = path.join(root, productionRel);
const animaticPath = path.join(root, animaticRel);

const HSP_GREEN_RGB = { r: 2, g: 69, b: 39 };
const DURATION_TARGET = 12;
const DURATION_TOLERANCE = 1.25;

const checks = [];
let failed = false;

function pass(name, detail = "") {
  checks.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed = true;
  checks.push({ ok: false, name, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name, detail = "") {
  checks.push({ ok: true, name, detail: detail ? `WARN: ${detail}` : "WARN" });
  console.warn(`! ${name}${detail ? ` — ${detail}` : ""}`);
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function inspectContainer(buf) {
  const magicOk = buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  const text = buf.toString("binary");
  const vp9 = text.includes("V_VP9");
  const vp8 = text.includes("V_VP8");
  // Header AlphaMode element: 0x53 0xC0 followed by 1-byte vint length 0x81 + value
  let alphaModeHeader = null;
  for (let i = 0; i < Math.min(buf.length - 4, 4096); i++) {
    if (buf[i] === 0x53 && buf[i + 1] === 0xc0 && buf[i + 2] === 0x81) {
      alphaModeHeader = buf[i + 3];
      break;
    }
  }
  return { magicOk, vp9, vp8, alphaModeHeader, size: buf.length };
}

function runPythonDecode(filePath) {
  const py = `
import json, sys
try:
    import cv2
    import numpy as np
except Exception as e:
    print(json.dumps({"available": False, "error": str(e)}))
    sys.exit(0)

path = sys.argv[1]
cap = cv2.VideoCapture(path)
if not cap.isOpened():
    print(json.dumps({"available": True, "opened": False}))
    sys.exit(0)

fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 24.0
frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
duration = frames / fps if fps and frames else None

# Sample several timestamps across the loop
times = [0.0, 1.5, 3.0, 6.0, 9.0, 11.5]
samples = []
transparent_frames = 0
opaque_green_frames = 0
hsp = np.array([39.0, 69.0, 2.0], dtype=np.float32)  # BGR ~ RGB(2,69,39)

for t in times:
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000.0)
    ok, frame = cap.read()
    if not ok or frame is None:
        continue
    ch = 1 if frame.ndim < 3 else frame.shape[2]
    h, w = frame.shape[:2]
    corners = [(2,2),(w-3,2),(2,h-3),(w-3,h-3)]
    corner_px = []
    for x,y in corners:
        px = frame[y, x]
        if ch >= 4:
            b,g,r,a = [int(v) for v in px[:4]]
        else:
            b,g,r = [int(v) for v in px[:3]]
            a = 255
        corner_px.append({"r": r, "g": g, "b": b, "a": a})
    alphas = [p["a"] for p in corner_px]
    mean_a = float(sum(alphas) / len(alphas))
    # Distance of corner RGB to HSP green
    dists = []
    for p in corner_px:
        dists.append(((p["r"]-2)**2 + (p["g"]-69)**2 + (p["b"]-39)**2) ** 0.5)
    mean_dist = float(sum(dists)/len(dists))
    is_transparent = mean_a < 16
    is_opaque_green = mean_a >= 250 and mean_dist < 28
    if is_transparent:
        transparent_frames += 1
    if is_opaque_green:
        opaque_green_frames += 1
    samples.append({
        "t": t,
        "channels": ch,
        "mean_corner_alpha": mean_a,
        "mean_corner_dist_hsp_green": mean_dist,
        "corners": corner_px,
    })

cap.release()

# OpenCV often flattens VP9 alpha to BGR. If channels==3 always, we cannot
# confirm alpha via OpenCV — report decode_limited.
channels_seen = sorted({s["channels"] for s in samples}) if samples else []
print(json.dumps({
    "available": True,
    "opened": True,
    "fps": fps,
    "frames": frames,
    "width": width,
    "height": height,
    "duration": duration,
    "channels_seen": channels_seen,
    "transparent_corner_frames": transparent_frames,
    "opaque_green_corner_frames": opaque_green_frames,
    "samples": samples,
    "decode_limited": channels_seen == [3],
}))
`;

  const result = spawnSync("python", ["-c", py, filePath], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    maxBuffer: 4 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    return {
      available: false,
      error: result.error?.message || result.stderr || `python exit ${result.status}`,
    };
  }
  try {
    return JSON.parse((result.stdout || "").trim().split("\n").pop());
  } catch {
    return { available: false, error: "failed to parse python decode output" };
  }
}

function tryFfmpegAlphaProbe(filePath) {
  // Optional: if ffmpeg exists, extract a PNG with alpha via libvpx.
  const probes = ["ffmpeg", "ffprobe"];
  const found = {};
  for (const bin of probes) {
    const r = spawnSync(bin, ["-version"], { encoding: "utf8", shell: true });
    found[bin] = r.status === 0;
  }
  if (!found.ffmpeg || !found.ffprobe) {
    return { available: false, found };
  }

  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,pix_fmt,duration,width,height,r_frame_rate:stream_tags=alpha_mode",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8", shell: true },
  );
  if (probe.status !== 0) {
    return { available: true, error: probe.stderr || "ffprobe failed", found };
  }
  let info;
  try {
    info = JSON.parse(probe.stdout);
  } catch {
    return { available: true, error: "ffprobe json parse failed", found };
  }
  const stream = info.streams?.[0] || {};
  const pix = String(stream.pix_fmt || "");
  const alphaModeTag = String(stream.tags?.alpha_mode ?? "");
  // VP9+alpha WebM often reports yuv420p; AlphaMode/tag means use libvpx-vp9 decode.
  const hasAlphaPix =
    /ya|yuva|rgba|gbra|yuva420|yuva422|yuva444|rgba|argb|bgra/i.test(pix) ||
    pix.toLowerCase().includes("a") ||
    alphaModeTag === "1";

  // Extract one frame as PNG and inspect alpha with python/PIL if possible.
  // Must decode with libvpx-vp9 or VP9 alpha is flattened to opaque.
  const tmpPng = path.join(root, "scripts", ".tmp-brand-story-frame.png");
  const extract = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-c:v",
      "libvpx-vp9",
      "-i",
      filePath,
      "-ss",
      "0.5",
      "-frames:v",
      "1",
      "-pix_fmt",
      "rgba",
      "-update",
      "1",
      tmpPng,
    ],
    { encoding: "utf8", shell: true },
  );

  let pngAlpha = null;
  if (extract.status === 0 && existsSync(tmpPng)) {
    const py = `
import json, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
w,h = im.size
pts = [(2,2),(w-3,2),(2,h-3),(w-3,h-3),(w//2,h//2)]
out=[]
for x,y in pts:
    r,g,b,a = im.getpixel((x,y))
    out.append({"x":x,"y":y,"r":r,"g":g,"b":b,"a":a})
alphas=[p["a"] for p in out[:4]]
# Scan grid for opaque foreground (alpha near 255)
opaque = 0
for y in range(0, h, 48):
    for x in range(0, w, 48):
        if im.getpixel((x, y))[3] >= 250:
            opaque += 1
print(json.dumps({
  "corners": out[:4],
  "center": out[4],
  "mean_corner_alpha": sum(alphas)/len(alphas),
  "transparent_corners": sum(1 for a in alphas if a < 16),
  "opaque_foreground_samples": opaque,
}))
`;
    const pr = spawnSync("python", ["-c", py, tmpPng], {
      encoding: "utf8",
      shell: false,
    });
    try {
      if (pr.status === 0) pngAlpha = JSON.parse(pr.stdout.trim());
    } catch {
      pngAlpha = null;
    }
    try {
      unlinkSync(tmpPng);
    } catch {
      /* ignore */
    }
  }

  return {
    available: true,
    found,
    codec_name: stream.codec_name,
    pix_fmt: pix,
    duration: stream.duration ? Number(stream.duration) : null,
    width: stream.width,
    height: stream.height,
    hasAlphaPixFmt: hasAlphaPix,
    alphaModeTag,
    pngAlpha,
    extractStatus: extract.status,
  };
}

console.log("HSP Mart brand-story production WebM verification");
console.log(`Production path: ${productionRel}`);
console.log("");

if (!existsSync(productionPath)) {
  console.log("STATUS: AWAITING_PRODUCTION_ASSET");
  console.log(
    "Production WebM is missing. Keep ILLUSTRATED_ASSETS_READY=false.",
  );
  if (existsSync(animaticPath)) {
    const st = statSync(animaticPath);
    console.log(
      `Development animatic present (${st.size} bytes) — NOT a production substitute.`,
    );
  }
  console.log("");
  console.log("Drop a genuine transparent VP9 WebM at:");
  console.log(`  ${productionRel}`);
  console.log("Then re-run: npm run verify:brand-story");
  process.exit(2);
}

const buf = readFileSync(productionPath);
const st = statSync(productionPath);
if (st.size <= 0) {
  fail("non-zero file size", "file is empty");
  console.log("STATUS: INVALID");
  process.exit(1);
}
pass("file exists", `${st.size} bytes`);

const container = inspectContainer(buf);
if (!container.magicOk) {
  fail("WebM/EBML magic", "missing 1A 45 DF A3");
} else {
  pass("WebM/EBML container", "magic OK");
}

if (!container.vp9) {
  fail("VP9 codec marker", "V_VP9 not found in container");
} else {
  pass("VP9 codec marker", "V_VP9 present");
}

if (container.alphaModeHeader === 1) {
  warn(
    "Matroska AlphaMode=1",
    "flag present but NOT sufficient proof of transparency",
  );
} else if (container.alphaModeHeader == null) {
  warn("Matroska AlphaMode", "not found in header scan");
} else {
  warn("Matroska AlphaMode", `value=${container.alphaModeHeader}`);
}

// Distinguish from animatic
if (existsSync(animaticPath)) {
  const prodHash = sha256File(productionPath);
  const animHash = sha256File(animaticPath);
  const animSize = statSync(animaticPath).size;
  if (prodHash === animHash || st.size === animSize) {
    fail(
      "distinguishable from animatic",
      "production file matches development animatic — do not rename/copy the animatic",
    );
  } else {
    pass(
      "distinguishable from animatic",
      `prod sha256 ${prodHash.slice(0, 12)}… ≠ animatic`,
    );
  }
} else {
  pass("distinguishable from animatic", "animatic absent (ok)");
}

// Decode-level checks
let transparencyConfirmed = false;
let durationOk = false;

const ffmpegProbe = tryFfmpegAlphaProbe(productionPath);
if (ffmpegProbe.available && !ffmpegProbe.error) {
  if (ffmpegProbe.codec_name && /vp9/i.test(ffmpegProbe.codec_name)) {
    pass("ffprobe codec", ffmpegProbe.codec_name);
  } else if (ffmpegProbe.codec_name) {
    fail("ffprobe codec", `expected vp9, got ${ffmpegProbe.codec_name}`);
  }
  if (ffmpegProbe.duration != null) {
    const d = ffmpegProbe.duration;
    if (Math.abs(d - DURATION_TARGET) <= DURATION_TOLERANCE) {
      pass("duration ≈ 12s", `${d.toFixed(2)}s`);
      durationOk = true;
    } else {
      fail("duration ≈ 12s", `${d}s (expected ~${DURATION_TARGET}±${DURATION_TOLERANCE})`);
    }
  }
  if (ffmpegProbe.hasAlphaPixFmt) {
    pass(
      "pixel format suggests alpha",
      `${ffmpegProbe.pix_fmt || "unknown"}${
        ffmpegProbe.alphaModeTag === "1" ? " + alpha_mode=1" : ""
      }`,
    );
  } else {
    warn("pixel format", `${ffmpegProbe.pix_fmt || "unknown"} — may lack alpha`);
  }
  if (ffmpegProbe.pngAlpha) {
    const meanA = ffmpegProbe.pngAlpha.mean_corner_alpha;
    const transparentCorners = ffmpegProbe.pngAlpha.transparent_corners;
    const corner = ffmpegProbe.pngAlpha.corners?.[0];
    const fgOpaque = ffmpegProbe.pngAlpha.opaque_foreground_samples || 0;
    if (transparentCorners >= 3 && meanA < 16) {
      pass(
        "decoded PNG corner alpha",
        `mean=${meanA.toFixed(1)}, transparentCorners=${transparentCorners}, opaqueFgSamples=${fgOpaque}`,
      );
      if (fgOpaque < 1) {
        fail(
          "foreground alpha",
          "corners are transparent but no opaque foreground samples found",
        );
      } else {
        transparencyConfirmed = true;
      }
    } else if (corner && corner.a >= 250) {
      const dist = Math.hypot(
        corner.r - HSP_GREEN_RGB.r,
        corner.g - HSP_GREEN_RGB.g,
        corner.b - HSP_GREEN_RGB.b,
      );
      if (dist < 28) {
        fail(
          "decoded transparency",
          `opaque HSP-green corners (a=${corner.a}, dist=${dist.toFixed(1)}) — not a valid production alpha export`,
        );
      } else {
        fail(
          "decoded transparency",
          `opaque corners (a=${corner.a}) — background is not transparent`,
        );
      }
    } else {
      fail(
        "decoded transparency",
        `insufficient transparent corners (mean a=${meanA})`,
      );
    }
  }
} else {
  warn(
    "ffmpeg/ffprobe",
    ffmpegProbe.error ||
      "not available — falling back to OpenCV/Python decode checks",
  );
}

const cv = runPythonDecode(productionPath);
if (cv.available && cv.opened) {
  if (cv.duration != null && !durationOk) {
    if (Math.abs(cv.duration - DURATION_TARGET) <= DURATION_TOLERANCE) {
      pass("duration ≈ 12s (OpenCV)", `${cv.duration.toFixed(2)}s`);
      durationOk = true;
    } else {
      fail(
        "duration ≈ 12s (OpenCV)",
        `${cv.duration}s (expected ~${DURATION_TARGET}±${DURATION_TOLERANCE})`,
      );
    }
  }
  pass(
    "OpenCV open",
    `${cv.width}x${cv.height} @ ${cv.fps}fps, ${cv.frames} frames`,
  );

  if (cv.decode_limited) {
    // OpenCV flattens VP9 alpha to BGR. Prefer ffmpeg/libvpx-vp9 proof when present.
    // Opaque-green rejection only applies when ffmpeg has NOT already confirmed alpha
    // (transparent pixels often appear as black RGB under OpenCV).
    if (!transparencyConfirmed && cv.opaque_green_corner_frames >= 3) {
      fail(
        "decoded transparency",
        "OpenCV sees opaque HSP-green corners on multiple frames (same failure mode as the animatic). Export real alpha; do not ship a green plate.",
      );
    } else if (!transparencyConfirmed) {
      fail(
        "decoded transparency",
        "OpenCV cannot see an alpha plane (BGR only) and ffmpeg PNG alpha probe was unavailable/unconfirmed. Install ffmpeg to positively verify VP9 alpha, or re-export with real transparency.",
      );
    }
  } else if (cv.transparent_corner_frames >= 3) {
    pass(
      "decoded corner alpha (OpenCV)",
      `${cv.transparent_corner_frames}/${cv.samples?.length || 0} sampled frames transparent`,
    );
    transparencyConfirmed = true;
  } else if (cv.opaque_green_corner_frames >= 3) {
    fail(
      "decoded transparency",
      "corners are opaque HSP green — not a valid production asset",
    );
  } else if (!transparencyConfirmed) {
    fail(
      "decoded transparency",
      "could not confirm transparent background pixels",
    );
  }
} else if (!transparencyConfirmed) {
  warn(
    "Python/OpenCV decode",
    cv.error || "unavailable — install Python+opencv or ffmpeg for decode checks",
  );
  if (!failed) {
    // Without any decode tool we must not mark VALID.
    fail(
      "decoded transparency",
      "no decode toolchain available to prove real alpha; refusing to mark VALID from AlphaMode alone",
    );
  }
}

console.log("");
if (failed || !transparencyConfirmed || !durationOk) {
  if (!durationOk && !failed) {
    fail("duration ≈ 12s", "could not confirm duration");
  }
  if (!transparencyConfirmed && !checks.some((c) => !c.ok && c.name.includes("transparency"))) {
    fail("decoded transparency", "not confirmed");
  }
  console.log("STATUS: INVALID");
  console.log(
    "Keep ILLUSTRATED_ASSETS_READY=false. Do not use the development animatic as production.",
  );
  process.exit(1);
}

console.log("STATUS: VALID");
console.log(
  "Production WebM looks ready. You may set ILLUSTRATED_ASSETS_READY=true after a manual hero smoke test.",
);
process.exit(0);
