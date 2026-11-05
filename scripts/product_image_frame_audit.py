import csv
import glob
import os
import re
import sys
import time
from collections import Counter

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINALS_DIR = os.path.join(PROJECT_ROOT, "public", "images", "products", "_originals")
OUTPUT_CSV = os.path.join(PROJECT_ROOT, "product_image_audit.csv")
MODEL_ID = "HuggingFaceTB/SmolVLM-500M-Instruct"
PATTERNS = [
    "laptop",
    "spring-action",
    "calculator-diary",
    "vacuum-bottle",
    "corporate-gift",
    "gift-hamper",
    "premium-corporate",
]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

PROMPT_CLASSIFY = """You are auditing a product photograph. Look only at the main product, not the background or accessories.
COMPLETE = every part of the main product is visible inside the image frame.
CUT OFF = any part of the main product is visibly truncated by an image edge.
UNCERTAIN = the product boundary is ambiguous or you cannot tell.
Do not choose CUT OFF merely because the product is close to an edge.
Answer exactly in this format:
LABEL: COMPLETE|CUT OFF|UNCERTAIN
REASON: <one short sentence>"""

PROMPT_YES_CUT = """Does an image border cut off any part of the main product?
Answer YES if any part is cut off. Answer NO if the entire main product is visible.
Do not answer YES just because the product is near an edge.
Answer exactly in this format:
LABEL: YES|NO
REASON: <one short sentence>"""

PROMPT_YES_FULL = """Are all parts of the main product visible inside the image frame?
Answer YES if the whole product is visible. Answer NO if any part is cut off.
Answer exactly in this format:
LABEL: YES|NO
REASON: <one short sentence>"""


def find_images():
    found = []
    for pattern in PATTERNS:
        for path in glob.glob(os.path.join(ORIGINALS_DIR, f"{pattern}*")):
            if not os.path.isfile(path):
                continue
            if os.path.splitext(path)[1].lower() not in IMAGE_EXTENSIONS:
                continue
            found.append(os.path.normpath(path))
    return sorted(set(found))


def clean_text(text):
    return " ".join(text.split())


def extract_reason(text):
    match = re.search(r"REASON\s*:\s*(.*)", text, flags=re.IGNORECASE | re.DOTALL)
    if match:
        return clean_text(match.group(1))[:300]
    return clean_text(text)[:300]


def parse_classification(text):
    upper = text.upper()
    match = re.search(r"LABEL\s*:\s*(COMPLETE|CUT\s*OFF|UNCERTAIN)", upper)
    if match:
        label = re.sub(r"\s+", " ", match.group(1))
        return "CUT OFF" if label == "CUT OFF" else label
    head = clean_text(upper)[:80]
    if "UNCERTAIN" in head:
        return "UNCERTAIN"
    if "CUT OFF" in head or "CUTOFF" in head:
        return "CUT OFF"
    if "COMPLETE" in head:
        return "COMPLETE"
    return None


def parse_yes_no(text):
    upper = text.upper()
    match = re.search(r"LABEL\s*:\s*(YES|NO)", upper)
    if match:
        return match.group(1)
    head = clean_text(upper)[:40]
    if re.match(r"^(YES|NO)\b", head):
        return head.split()[0]
    return None


def load_model():
    print(f"Loading {MODEL_ID} ...", flush=True)
    started = time.time()
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForImageTextToText.from_pretrained(
        MODEL_ID,
        dtype=torch.float32,
    ).eval()
    print(f"Model loaded in {time.time() - started:.1f}s", flush=True)
    return processor, model


def run_prompt(processor, model, image, prompt):
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": prompt},
            ],
        }
    ]
    text = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=text, images=[image], return_tensors="pt")
    with torch.inference_mode():
        output = model.generate(**inputs, max_new_tokens=40, do_sample=False)
    full = processor.batch_decode(output, skip_special_tokens=True)[0]
    if "Assistant:" in full:
        return full.split("Assistant:")[-1].strip()
    return full.strip()


def audit_image(processor, model, path):
    image = Image.open(path).convert("RGB")
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)

    classify_text = run_prompt(processor, model, image, PROMPT_CLASSIFY)
    classify_label = parse_classification(classify_text)

    votes = []
    reasons = {}
    if classify_label:
        votes.append(classify_label)
        reasons[classify_label] = extract_reason(classify_text)
    elif classify_label is None:
        fallback_text = run_prompt(processor, model, image, PROMPT_YES_CUT)
        fallback_answer = parse_yes_no(fallback_text)
        if fallback_answer:
            label = "CUT OFF" if fallback_answer == "YES" else "COMPLETE"
            votes.append(label)
            reasons[label] = extract_reason(fallback_text)

    if not votes:
        return "UNCERTAIN", "Model did not return a parseable label.", votes

    label = votes[0]
    explanation = reasons.get(label) or f"Model returned label: {label}."
    return label, explanation, votes


def main():
    print(f"Project root: {PROJECT_ROOT}", flush=True)
    print(f"Originals directory: {ORIGINALS_DIR}", flush=True)
    print(f"Patterns: {', '.join(PATTERNS)}", flush=True)

    images = find_images()
    print(f"Matched {len(images)} image(s).", flush=True)
    if not images:
        print("No matching images found. Check the directory and filename patterns.", flush=True)
        return 1

    for index, path in enumerate(images, start=1):
        print(f"  {index}. {os.path.basename(path)}", flush=True)

    if len(images) > 40:
        print("Selection is unexpectedly broad; stopping before inference.", flush=True)
        return 1

    processor, model = load_model()
    rows = []
    errors = 0

    for index, path in enumerate(images, start=1):
        filename = os.path.basename(path)
        relative_path = os.path.relpath(path, PROJECT_ROOT)
        print(f"[{index}/{len(images)}] Processing {filename} ...", flush=True)
        started = time.time()
        try:
            classification, explanation, votes = audit_image(processor, model, path)
            error = ""
            print(
                f"  -> {classification} ({time.time() - started:.1f}s) votes={votes}",
                flush=True,
            )
        except Exception as exc:
            classification = "UNCERTAIN"
            explanation = f"Audit failed for this image: {exc}"
            votes = []
            error = f"{type(exc).__name__}: {exc}"
            errors += 1
            print(f"  -> UNCERTAIN (error: {error})", flush=True)

        rows.append(
            {
                "filename": filename,
                "relative_path": relative_path,
                "classification": classification,
                "explanation": explanation,
                "votes": "|".join(votes),
                "error": error,
            }
        )

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "filename",
                "relative_path",
                "classification",
                "explanation",
                "votes",
                "error",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["classification"] for row in rows)
    print("\nAudit summary", flush=True)
    print(f"  Total images: {len(rows)}", flush=True)
    print(f"  COMPLETE: {counts.get('COMPLETE', 0)}", flush=True)
    print(f"  CUT OFF: {counts.get('CUT OFF', 0)}", flush=True)
    print(f"  UNCERTAIN: {counts.get('UNCERTAIN', 0)}", flush=True)
    print(f"  Errors: {errors}", flush=True)
    print(f"  CSV: {OUTPUT_CSV}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
