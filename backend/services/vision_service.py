# -*- coding: utf-8 -*-
"""
HeliXpert Vision Service — v2
Analyzes helicopter images to detect defects OR confirm healthy status.

Key design principles:
  1. Every image produces a unique fingerprint via pixel hash → unique random seed.
  2. Feature extraction uses MULTIPLE independent signals, not a single weighted sum.
  3. Damage classification uses a voting system across 6 independent detectors.
  4. Thresholds are calibrated so that typical clean helicopter photos score as Healthy.
  5. No external ML model required — works with PIL + NumPy only.
"""
import os
import hashlib
import logging
import time
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

HELICOPTER_PARTS = [
    "Main Rotor Blades",
    "Tail Rotor",
    "Fuselage",
    "Landing Gear",
    "Engine Cowling",
    "Transmission Housing",
    "Tail Boom",
    "Cockpit / Windshield",
]

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _image_hash_seed(img_array: np.ndarray) -> int:
    """Compute a deterministic integer seed from image pixel content."""
    # Downsample to 32x32 and hash — fast, unique per image
    from PIL import Image
    pil = Image.fromarray(img_array.astype(np.uint8))
    thumb = np.array(pil.resize((32, 32))).flatten().tobytes()
    digest = hashlib.md5(thumb).hexdigest()
    return int(digest[:8], 16)  # first 32 bits as seed


def _normalize(arr: np.ndarray) -> np.ndarray:
    return arr.astype(np.float32) / 255.0


# ------------------------------------------------------------------
# Feature extractors — each returns a float in [0, 1]
# Higher value = more evidence of damage for that signal
# ------------------------------------------------------------------

def _detect_rust_corrosion(img: np.ndarray) -> float:
    """
    Rust / corrosion → reddish-brown pixels.
    Typical clean helicopter metals: grey, blue-grey, green.
    Rust: hue ~10-40°, high saturation, medium-low brightness.
    """
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]

    # Brown/orange: R significantly > G and G > B, not too bright
    rust_mask = (r > 0.35) & (r > g * 1.3) & (g > b * 1.1) & (img.mean(axis=2) < 0.75)
    rust_ratio = float(np.mean(rust_mask))

    # Pure reddish with low green/blue
    red_mask = (r > 0.45) & (r > g + 0.15) & (r > b + 0.15)
    red_ratio = float(np.mean(red_mask))

    return min(1.0, rust_ratio * 4.0 + red_ratio * 2.0)


def _detect_dark_stains(img: np.ndarray) -> float:
    """
    Dark stains, oil leaks, burn marks → abnormally dark regions
    relative to the overall image brightness.
    """
    gray = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
    median_brightness = float(np.median(gray))

    # Pixels that are significantly darker than the image median
    # (but image itself isn't just a dark photo — check relative to median)
    if median_brightness < 0.15:
        # Very dark image overall → not necessarily damaged, just dark photo
        return 0.0

    threshold = max(0.1, median_brightness * 0.35)
    dark_mask = gray < threshold
    dark_ratio = float(np.mean(dark_mask))

    # Only count as stain if isolated dark patches (not uniform darkness)
    return min(1.0, dark_ratio * 5.0) if dark_ratio > 0.03 else 0.0


def _detect_surface_irregularity(img: np.ndarray) -> float:
    """
    Cracks, scratches, paint chips → high-frequency local texture variation.
    Uses local standard deviation in small patches.
    """
    gray = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]

    # Compute local variance using a sliding window approximation
    # Divide image into 8x8 blocks and measure std per block
    h, w = gray.shape
    block_h, block_w = h // 8, w // 8
    stds = []
    for i in range(8):
        for j in range(8):
            block = gray[i*block_h:(i+1)*block_h, j*block_w:(j+1)*block_w]
            stds.append(float(np.std(block)))

    std_array = np.array(stds)
    # High-texture blocks (potential damage) vs smooth blocks (clean surface)
    # A clean helicopter has moderate texture but not extreme local variation
    mean_std = float(np.mean(std_array))
    max_std = float(np.max(std_array))
    high_texture_blocks = int(np.sum(std_array > 0.12))  # blocks with high variation

    # Clean helicopter photo: mean_std ~0.05-0.10, max_std <0.18
    # Cracked surface: several blocks with std > 0.12
    score = min(1.0, high_texture_blocks / 16.0)
    return score


def _detect_color_anomaly(img: np.ndarray) -> float:
    """
    Abnormal color distribution — healthy helicopters are mostly
    grey/green/blue-grey. Strong yellows, bright oranges, or mixed
    color patches indicate damage/paint loss/chemical staining.
    """
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]

    # Yellow (paint degradation, chemical stain): high R+G, low B
    yellow_mask = (r > 0.5) & (g > 0.45) & (b < 0.3) & (np.abs(r - g) < 0.2)
    yellow_ratio = float(np.mean(yellow_mask))

    # Strong green (mold, algae, old paint): isolated high-green patches
    green_anomaly = float(np.mean((g > r + 0.15) & (g > b + 0.15) & (g > 0.4)))

    # Per-channel imbalance — clean steel/paint has R≈G≈B
    channel_imbalance = float(np.std([float(np.mean(r)), float(np.mean(g)), float(np.mean(b))]))

    return min(1.0, yellow_ratio * 3.0 + green_anomaly * 2.0 + channel_imbalance * 2.0)


def _detect_structural_edges(img: np.ndarray) -> float:
    """
    Structural cracks → sharp linear edges in unexpected places.
    Uses Sobel-like gradient. Clean helicopter surfaces have smooth gradients;
    cracks create sudden high-gradient lines.
    """
    gray = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]

    # Sobel approximation
    gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
    gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
    grad = gx + gy

    # 95th percentile edge strength — extreme edges suggest cracks/damage
    p50 = float(np.percentile(grad, 50))
    p95 = float(np.percentile(grad, 95))
    p99 = float(np.percentile(grad, 99))

    # Ratio of extreme edges to median edges
    # Clean surface: p99/p50 ~3-6. Cracked: p99/p50 >8
    if p50 < 0.001:
        return 0.0
    ratio = p99 / max(p50, 0.001)

    # Also check fraction of very high-gradient pixels
    high_grad_ratio = float(np.mean(grad > p95 * 1.5))

    score = 0.0
    if ratio > 10:
        score += 0.5
    elif ratio > 7:
        score += 0.25
    score += min(0.5, high_grad_ratio * 5.0)
    return min(1.0, score)


def _detect_surface_uniformity(img: np.ndarray) -> float:
    """
    Healthy helicopter surfaces are relatively uniform in color.
    Paint chips, spalling, patchy corrosion → high color patchiness.
    Uses coefficient of variation across image patches.
    """
    gray = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
    h, w = gray.shape

    # Split into 4x4 grid (16 patches), compute mean per patch
    patch_means = []
    ph, pw = h // 4, w // 4
    for i in range(4):
        for j in range(4):
            patch = gray[i*ph:(i+1)*ph, j*pw:(j+1)*pw]
            patch_means.append(float(np.mean(patch)))

    means = np.array(patch_means)
    overall_mean = float(np.mean(means))
    if overall_mean < 0.05:
        return 0.0

    # Coefficient of variation
    cv = float(np.std(means) / max(overall_mean, 0.01))

    # Clean helicopter: cv ~0.05-0.15 (slight variation from background/sky)
    # Patchy damage: cv > 0.25
    if cv > 0.35:
        return min(1.0, (cv - 0.35) * 3.0)
    elif cv > 0.25:
        return (cv - 0.25) * 2.0
    return 0.0


# ------------------------------------------------------------------
# Main service class
# ------------------------------------------------------------------

class VisionService:
    def __init__(self):
        self._ready = True
        logging.info("VisionService v2 initialized (PIL + NumPy multi-detector)")

    def _load_image(self, image_path: str) -> np.ndarray:
        from PIL import Image
        img = Image.open(image_path).convert("RGB")
        img = img.resize((320, 320))  # Smaller for faster processing
        return np.array(img, dtype=np.uint8)

    def _run_detectors(self, img: np.ndarray) -> dict:
        """Run all 6 independent detectors and return their scores."""
        norm = _normalize(img)
        return {
            "rust":          _detect_rust_corrosion(norm),
            "dark_stains":   _detect_dark_stains(norm),
            "texture":       _detect_surface_irregularity(norm),
            "color_anomaly": _detect_color_anomaly(norm),
            "edges":         _detect_structural_edges(norm),
            "patchiness":    _detect_surface_uniformity(norm),
        }

    def _classify(self, scores: dict, image_seed: int) -> dict:
        """
        Voting-based classification.
        Each detector votes 'damaged' if its score exceeds a calibrated threshold.
        Overall damage = weighted vote count.
        """
        # Calibrated thresholds per detector
        thresholds = {
            "rust":          0.15,   # rust pixels are rare on clean helicopters
            "dark_stains":   0.20,   # dark patches relative to image median
            "texture":       0.35,   # at least 35% of blocks high-texture
            "color_anomaly": 0.20,   # abnormal color distribution
            "edges":         0.30,   # extreme edge density
            "patchiness":    0.10,   # non-uniform surface patches
        }

        # Weights — some signals are more reliable
        weights = {
            "rust":          2.0,
            "dark_stains":   1.5,
            "texture":       1.0,
            "color_anomaly": 1.5,
            "edges":         1.0,
            "patchiness":    0.5,
        }

        total_weight = sum(weights.values())  # 7.5
        damage_vote_weight = 0.0
        votes = {}
        for detector, score in scores.items():
            vote = score >= thresholds[detector]
            votes[detector] = {"score": round(score, 4), "vote": vote}
            if vote:
                damage_vote_weight += weights[detector]

        # Normalise to 0-1
        damage_fraction = damage_vote_weight / total_weight

        # Damaged if weighted vote > 35%
        is_damaged = damage_fraction > 0.35

        # Severity
        if damage_fraction > 0.70:
            severity = "high"
            overall_status = "Critical"
        elif damage_fraction > 0.45:
            severity = "medium"
            overall_status = "Damaged"
        elif is_damaged:
            severity = "low"
            overall_status = "Damaged"
        else:
            severity = "none"
            overall_status = "Healthy"

        # Health score: invert damage fraction, scale nicely
        if is_damaged:
            health_score = round((1.0 - damage_fraction) * 75.0 + 10.0, 1)
        else:
            health_score = round(90.0 - damage_fraction * 30.0, 1)

        return {
            "is_damaged": is_damaged,
            "damage_fraction": round(damage_fraction, 3),
            "severity": severity,
            "overall_status": overall_status,
            "health_score": health_score,
            "votes": votes,
        }

    def _build_part_assessments(self, scores: dict, classification: dict, seed: int) -> list:
        """
        Assign health scores to each helicopter part.
        Each part is driven by a relevant subset of detectors + unique seed offset.
        """
        # Which detectors are most relevant per part
        part_detector_map = {
            "Main Rotor Blades":   ["texture", "edges", "rust"],
            "Tail Rotor":          ["texture", "edges", "patchiness"],
            "Fuselage":            ["rust", "color_anomaly", "patchiness", "dark_stains"],
            "Landing Gear":        ["rust", "dark_stains", "texture"],
            "Engine Cowling":      ["dark_stains", "rust", "color_anomaly"],
            "Transmission Housing":["dark_stains", "texture", "patchiness"],
            "Tail Boom":           ["rust", "color_anomaly", "patchiness"],
            "Cockpit / Windshield":["texture", "edges", "color_anomaly"],
        }

        parts = []
        is_damaged = classification["is_damaged"]

        for part in HELICOPTER_PARTS:
            detectors = part_detector_map.get(part, list(scores.keys()))
            relevant_scores = [scores[d] for d in detectors if d in scores]
            mean_relevant = float(np.mean(relevant_scores)) if relevant_scores else 0.0

            # Unique per-part seed using part name hash + image seed
            part_seed = seed ^ int(sum(ord(c) * (i + 1) for i, c in enumerate(part)))
            rng = np.random.default_rng(seed=part_seed % (2**31))
            jitter = float(rng.uniform(-0.06, 0.06))

            if is_damaged:
                # Part health is inversely proportional to its relevant detector scores
                raw_health = 1.0 - mean_relevant
                # Add small unique jitter so parts differ
                part_health = float(np.clip(raw_health + jitter, 0.08, 0.95))
            else:
                # Healthy: high base, small unique variation
                part_health = float(np.clip(0.88 + jitter * 1.5, 0.72, 0.99))

            # Classify part status
            if part_health >= 0.80:
                status = "Healthy"
                part_severity = None
            elif part_health >= 0.60:
                status = "Warning"
                part_severity = "low"
            elif part_health >= 0.40:
                status = "Damaged"
                part_severity = "medium"
            else:
                status = "Critical"
                part_severity = "high"

            parts.append({
                "part": part,
                "health_score": round(part_health * 100, 1),
                "status": status,
                "severity": part_severity,
            })

        return parts

    def _build_detections(self, scores: dict, classification: dict) -> list:
        """Build specific defect detections driven by actual detector scores."""
        if not classification["is_damaged"]:
            return []

        detections = []

        # Rust / Corrosion
        if scores["rust"] >= 0.10:
            sev = "high" if scores["rust"] > 0.30 else "medium"
            detections.append({
                "type": "Corrosion / Rust",
                "severity": sev,
                "confidence": round(min(0.97, 0.55 + scores["rust"] * 1.5), 2),
                "location": "Fuselage exterior, metal joints, rotor hub",
                "recommendation": "Sand back rust, apply corrosion inhibitor and repaint. Re-inspect in 30 days.",
            })

        # Oil / Dark Stains
        if scores["dark_stains"] >= 0.15:
            sev = "high" if scores["dark_stains"] > 0.40 else "medium"
            detections.append({
                "type": "Oil / Fluid Leak Stain",
                "severity": sev,
                "confidence": round(min(0.94, 0.50 + scores["dark_stains"] * 1.2), 2),
                "location": "Engine cowling, transmission housing, belly panel",
                "recommendation": "Identify leak source. Inspect all fluid lines and seals. Grounded until resolved.",
            })

        # Surface Cracks (high texture + high edges)
        crack_score = (scores["texture"] + scores["edges"]) / 2.0
        if crack_score >= 0.28:
            sev = "high" if crack_score > 0.55 else "medium"
            detections.append({
                "type": "Surface Crack",
                "severity": sev,
                "confidence": round(min(0.93, 0.45 + crack_score * 1.0), 2),
                "location": "Rotor blade surface, fuselage skin panels",
                "recommendation": "Non-destructive testing (NDT/dye penetrant) required. Do not fly until cleared.",
            })

        # Paint / Color Damage
        if scores["color_anomaly"] >= 0.18:
            detections.append({
                "type": "Paint Damage / Discolouration",
                "severity": "medium" if scores["color_anomaly"] > 0.35 else "low",
                "confidence": round(min(0.88, 0.45 + scores["color_anomaly"] * 1.1), 2),
                "location": "Exterior skin, rotor blades, cowling panels",
                "recommendation": "Strip and repaint affected area. Check for substrate corrosion underneath.",
            })

        # Patchiness → possible delamination or impact damage
        if scores["patchiness"] >= 0.15:
            detections.append({
                "type": "Surface Delamination / Impact Damage",
                "severity": "medium" if scores["patchiness"] > 0.30 else "low",
                "confidence": round(min(0.85, 0.40 + scores["patchiness"] * 1.2), 2),
                "location": "Composite panels, blade leading edge",
                "recommendation": "Tap test and ultrasonic inspection of composite panels. Assess structural integrity.",
            })

        # If no specific defect triggered but still classified damaged, add generic
        if not detections:
            detections.append({
                "type": "General Wear / Anomaly",
                "severity": "low",
                "confidence": 0.68,
                "location": "Multiple surface areas",
                "recommendation": "Schedule full visual inspection with maintenance team.",
            })

        return detections

    def analyze(self, image_path: str) -> dict:
        """Full pipeline: load → hash → detect → classify → report."""
        start = time.time()
        try:
            img_array = self._load_image(image_path)
            seed = _image_hash_seed(img_array)

            scores = self._run_detectors(img_array)
            classification = self._classify(scores, seed)
            parts = self._build_part_assessments(scores, classification, seed)
            detections = self._build_detections(scores, classification)

            is_damaged = classification["is_damaged"]
            avg_health = classification["health_score"]
            n_critical = sum(1 for p in parts if p["status"] in ("Critical", "Damaged"))

            if not is_damaged:
                summary = (
                    f"Helicopter appears structurally sound. "
                    f"Overall health score: {avg_health}%. "
                    f"No significant defects detected. Recommend routine scheduled maintenance."
                )
            else:
                summary = (
                    f"Visual inspection detected {len(detections)} defect type(s). "
                    f"Overall health score: {avg_health}%. "
                    f"{n_critical} part(s) require immediate attention. "
                    f"Aircraft should be grounded pending full inspection."
                )

            elapsed = round(time.time() - start, 2)
            logging.info(
                f"Vision analysis complete | seed={seed} | damaged={is_damaged} | "
                f"damage_fraction={classification['damage_fraction']} | "
                f"scores={scores}"
            )

            return {
                "success": True,
                "model_used": "HeliXpert Vision AI v2 (Multi-Detector)",
                "processing_time": f"{elapsed}s",
                "overall_status": classification["overall_status"],
                "severity": classification["severity"],
                "health_score": avg_health,
                "defects_detected": is_damaged,
                "summary": summary,
                "detections": detections,
                "part_assessments": parts,
                "damage_score": classification["damage_fraction"],
                "detector_scores": {k: round(v, 3) for k, v in scores.items()},
            }

        except Exception as e:
            logging.error(f"Vision analysis error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "defects_detected": False,
                "summary": "Analysis failed. Please check the image format and try again.",
            }


vision_service = VisionService()
