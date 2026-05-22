"""
FloodVision AI Analysis Engine
================================
Django view for flood vulnerability detection using:
  - YOLOv8 (ultralytics) for urban object detection
  - OpenCV for image processing and visual overlay generation
  - NumPy for numerical scoring

Endpoint: POST /analyze/
Input:  { "image_url": "<Google Street View static API URL>" }
Output: { "risk": "HIGH|MEDIUM|LOW", "score": int, "reasons": [...], "processed_image": "base64" }
"""

import cv2
import numpy as np
import base64
import requests
import logging
import os
import math
from io import BytesIO

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from PIL import Image, ImageDraw, ImageFont

# ─── Lazy YOLO loader ────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
_yolo_model = None  # Cached model instance

def get_yolo_model():
    """
    Lazily load YOLOv8n model.
    Downloads yolov8n.pt automatically on first call via ultralytics cache.
    """
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            logger.info("[FloodVision] Loading YOLOv8n model...")
            _yolo_model = YOLO("yolov8n.pt")
            logger.info("[FloodVision] YOLOv8n loaded successfully.")
        except Exception as e:
            logger.error(f"[FloodVision] Failed to load YOLO: {e}")
            _yolo_model = None
    return _yolo_model


# ─── YOLO class names relevant to urban flood analysis ────────────────────────
# COCO classes that are flood-relevant (enclosed urban environment indicators)
FLOOD_RELEVANT_CLASSES = {
    "building",       # structural enclosure → trapped runoff
    "wall",           # channel effect
    "person",         # scale reference / road width
    "traffic light",  # urban intersection
    "stop sign",      # road infrastructure
    "bicycle",        # narrow path
    "motorcycle",     # narrow lane
}

# COCO class scores: how much each detected class contributes to vulnerability
CLASS_SCORE_MAP = {
    "building":      12,  # enclosure raises vulnerability
    "wall":          10,  # channel effect
    "person":         2,
    "traffic light":  5,  # urban intersection → drainage bottleneck
    "stop sign":      4,
    "bicycle":        2,
    "motorcycle":     2,
}


# ─── Helper: Download Image ────────────────────────────────────────────────────
def download_image(url: str) -> np.ndarray | None:
    """
    Fetch image from URL and convert to OpenCV BGR numpy array.
    Returns None on failure.
    """
    try:
        headers = {"User-Agent": "FloodVision/1.0 (Hackathon AI System)"}
        response = requests.get(url, timeout=15, headers=headers)
        response.raise_for_status()

        # Decode bytes → PIL → numpy BGR
        pil_img = Image.open(BytesIO(response.content)).convert("RGB")
        img_np = np.array(pil_img)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        return img_bgr
    except Exception as e:
        logger.error(f"[FloodVision] Image download failed: {e}")
        return None


# ─── Helper: YOLOv8 Detection ─────────────────────────────────────────────────
def run_yolo_detection(img_bgr: np.ndarray):
    """
    Run YOLOv8 inference on the image.
    Returns:
      - detections: list of dicts {label, confidence, box: [x1,y1,x2,y2]}
      - yolo_score: integer contribution to flood vulnerability (0–40)
      - yolo_reasons: list of human-readable reason strings
    """
    model = get_yolo_model()
    detections = []
    yolo_score = 0
    yolo_reasons = []
    enclosure_count = 0  # count of walls/buildings on both sides

    if model is None:
        logger.warning("[FloodVision] YOLO not available; skipping YOLO step.")
        return detections, yolo_score, yolo_reasons

    try:
        results = model(img_bgr, verbose=False)[0]
        boxes = results.boxes

        if boxes is None or len(boxes) == 0:
            return detections, yolo_score, yolo_reasons

        class_names = model.names  # dict: {int: str}

        for box in boxes:
            cls_id = int(box.cls[0])
            label = class_names.get(cls_id, "unknown")
            # Skip vehicle detections (car, truck, bus) as requested by user
            if label in ("car", "truck", "bus"):
                continue
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            detections.append({
                "label": label,
                "confidence": round(conf, 3),
                "box": [int(v) for v in xyxy]
            })

            if label in CLASS_SCORE_MAP and conf > 0.30:
                yolo_score += CLASS_SCORE_MAP[label]

            if label in ("building", "wall"):
                enclosure_count += 1

        # Cap raw YOLO score at 40
        yolo_score = min(yolo_score, 40)

        # Generate reason strings
        detected_labels = [d["label"] for d in detections if d["confidence"] > 0.30]
        if enclosure_count >= 2:
            yolo_reasons.append("Enclosed roadway with walls/buildings on both sides — runoff may be trapped")
        if "building" in detected_labels:
            yolo_reasons.append("Dense building structures detected — reduced natural drainage capacity")
        if "wall" in detected_labels:
            yolo_reasons.append("Road-side walls identified — water channeling effect")
        if "traffic light" in detected_labels:
            yolo_reasons.append("Urban intersection detected — known drainage bottleneck zone")

    except Exception as e:
        logger.error(f"[FloodVision] YOLO inference error: {e}")

    return detections, yolo_score, yolo_reasons


# ─── Helper: OpenCV Road Analysis ─────────────────────────────────────────────
def run_opencv_analysis(img_bgr: np.ndarray):
    """
    Perform multi-stage OpenCV analysis to detect flood vulnerability indicators:

    1. Dark/wet region detection (potential water accumulation)
    2. Narrow road / enclosed geometry detection
    3. Pothole-like contour detection
    4. Edge density analysis (poor drainage visibility)
    5. Low-elevation road region estimation

    Returns:
      - cv_score:   integer 0–60
      - cv_reasons: list of reason strings
      - analysis_masks: dict of binary masks for overlay
    """
    h, w = img_bgr.shape[:2]
    cv_score = 0
    cv_reasons = []
    analysis_masks = {}

    # ── 1. DARK / WET REGION DETECTION ────────────────────────────────────────
    # Convert to HSV; dark saturated regions mimic wet asphalt / water pooling
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Wet/dark road: low Value (V) in HSV, moderate Saturation
    lower_dark = np.array([0, 0, 0], dtype=np.uint8)
    upper_dark = np.array([180, 80, 70], dtype=np.uint8)
    dark_mask = cv2.inRange(hsv, lower_dark, upper_dark)

    # Focus on the bottom 60% of the image (road surface area)
    road_roi_mask = np.zeros_like(dark_mask)
    road_roi_mask[int(h * 0.40):, :] = 255
    dark_road_mask = cv2.bitwise_and(dark_mask, road_roi_mask)

    dark_ratio = np.sum(dark_road_mask > 0) / (w * h * 0.60 + 1e-5)
    analysis_masks["dark"] = dark_road_mask

    if dark_ratio > 0.35:
        cv_score += 20
        cv_reasons.append("Significant dark/wet-looking road surface detected — possible water accumulation")
    elif dark_ratio > 0.18:
        cv_score += 10
        cv_reasons.append("Moderate dark road regions observed — minor water pooling possible")

    # ── 2. NARROW ROAD / ENCLOSED GEOMETRY ────────────────────────────────────
    # Detect road width by looking at the sky-to-building ratio in upper half
    upper_half = img_bgr[:int(h * 0.50), :]
    upper_gray = cv2.cvtColor(upper_half, cv2.COLOR_BGR2GRAY)

    # Sky is typically bright (high value) — narrow sky gap → enclosed road
    _, sky_mask = cv2.threshold(upper_gray, 180, 255, cv2.THRESH_BINARY)
    sky_ratio = np.sum(sky_mask > 0) / (sky_mask.size + 1e-5)

    # Low sky ratio means tall buildings/walls block view → narrow/enclosed road
    narrow_score = 0
    if sky_ratio < 0.15:
        narrow_score = 15
        cv_reasons.append("Very narrow/enclosed road geometry — severe runoff trapping risk")
    elif sky_ratio < 0.30:
        narrow_score = 10
        cv_reasons.append("Partially enclosed road — moderate drainage obstruction possible")
    elif sky_ratio < 0.45:
        narrow_score = 5
        cv_reasons.append("Moderately open road geometry detected")

    cv_score += narrow_score

    # ── 3. POTHOLE / SURFACE IRREGULARITY DETECTION ───────────────────────────
    # Use Canny edges on road ROI, then find circular/irregular contours
    road_region = img_bgr[int(h * 0.50):, :]
    road_gray = cv2.cvtColor(road_region, cv2.COLOR_BGR2GRAY)
    road_blur = cv2.GaussianBlur(road_gray, (5, 5), 0)
    edges = cv2.Canny(road_blur, 50, 150)

    # Morphological close to connect nearby edges (fill small gaps)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    closed_edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(closed_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    pothole_count = 0
    pothole_mask = np.zeros((h - int(h * 0.50), w), dtype=np.uint8)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Potholes: small-to-medium area, somewhat circular (circularity check)
        if 200 < area < 5000:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter > 0:
                circularity = 4 * math.pi * area / (perimeter ** 2)
                if 0.20 < circularity < 0.85:
                    pothole_count += 1
                    cv2.drawContours(pothole_mask, [cnt], -1, 255, -1)

    # Compose pothole mask in full image space
    full_pothole_mask = np.zeros((h, w), dtype=np.uint8)
    full_pothole_mask[int(h * 0.50):, :] = pothole_mask
    analysis_masks["potholes"] = full_pothole_mask

    if pothole_count > 8:
        cv_score += 20
        cv_reasons.append(f"{pothole_count} surface irregularities/potholes detected — poor road drainage expected")
    elif pothole_count > 3:
        cv_score += 12
        cv_reasons.append(f"{pothole_count} surface irregularities detected — moderate drainage concern")
    elif pothole_count > 0:
        cv_score += 5
        cv_reasons.append(f"Minor road surface irregularities noted ({pothole_count} contours)")

    # ── 4. EDGE DENSITY → DRAINAGE INFRASTRUCTURE VISIBILITY ──────────────────
    # High edge density in road area can indicate rough/broken surface
    # Low edge density at sides → no visible drain gutter structures
    full_edges = cv2.Canny(gray, 30, 100)
    bottom_strip = full_edges[int(h * 0.75):, :]
    edge_density = np.sum(bottom_strip > 0) / (bottom_strip.size + 1e-5)

    # Look for horizontal line segments that might be drain covers
    lines = cv2.HoughLinesP(
        bottom_strip, rho=1, theta=np.pi / 180,
        threshold=40, minLineLength=30, maxLineGap=10
    )
    drain_lines = 0
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = abs(math.atan2(y2 - y1, x2 - x1) * 180 / math.pi)
            if angle < 15 or angle > 165:  # near-horizontal → possible drain grate
                drain_lines += 1

    if drain_lines < 3:
        cv_score += 10
        cv_reasons.append("Poor drainage infrastructure visibility — possible absence of drain covers")
    elif drain_lines < 6:
        cv_score += 5

    # ── 5. ROAD RECEDING / LOW-ELEVATION DETECTION ────────────────────────────
    # Compute brightness gradient along vertical axis of road area
    # A dark basin at bottom suggests recessed/low elevation road
    road_strip = gray[int(h * 0.60):, int(w * 0.30):int(w * 0.70)]  # center strip
    if road_strip.size > 0:
        top_mean = float(np.mean(road_strip[:road_strip.shape[0] // 2, :]))
        bot_mean = float(np.mean(road_strip[road_strip.shape[0] // 2:, :]))
        gradient = top_mean - bot_mean  # positive → gets darker toward camera (recessed)
        if gradient > 20:
            cv_score += 10
            cv_reasons.append("Road appears to recede to a lower elevation — natural water accumulation point")

    # Cap OpenCV score at 60
    cv_score = min(cv_score, 60)

    return cv_score, cv_reasons, analysis_masks


# ─── Helper: Generate Visual Overlay ──────────────────────────────────────────
def generate_overlay_image(
    img_bgr: np.ndarray,
    detections: list,
    analysis_masks: dict,
    risk: str,
    score: int,
    yolo_model
) -> str:
    """
    Create a cinematic, AI-style flood vulnerability visualization:
      - Red semi-transparent overlay on vulnerable regions
      - Cyan YOLO bounding boxes with labels
      - HUD-style header panel with risk level and score
      - Scanline effect for futuristic look
      - Corner brackets around key detected objects

    Returns: base64-encoded JPEG string (no data: prefix)
    """
    h, w = img_bgr.shape[:2]
    overlay = img_bgr.copy().astype(np.float32)

    # ── RISK COLORS ──────────────────────────────────────────────────────────
    risk_color_bgr = {
        "HIGH":   (0,   30, 220),   # deep red
        "MEDIUM": (0,  160, 240),   # amber
        "LOW":    (50, 200,  50),   # green
    }.get(risk, (0, 30, 220))

    # ── DARK REGION FLOOD OVERLAY ─────────────────────────────────────────────
    dark_mask = analysis_masks.get("dark")
    if dark_mask is not None and np.any(dark_mask):
        # Dilate slightly for a more visible flood zone
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        dark_dilated = cv2.dilate(dark_mask, kernel, iterations=2)
        flood_overlay = np.zeros_like(overlay)
        flood_overlay[dark_dilated > 0] = [0, 0, 200]  # red in BGR
        overlay = cv2.addWeighted(overlay, 1.0, flood_overlay, 0.40, 0)

    # ── POTHOLE OVERLAY ───────────────────────────────────────────────────────
    pot_mask = analysis_masks.get("potholes")
    if pot_mask is not None and np.any(pot_mask):
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        pot_dilated = cv2.dilate(pot_mask, kernel, iterations=1)
        pot_overlay = np.zeros_like(overlay)
        pot_overlay[pot_dilated > 0] = [0, 80, 255]  # orange-red
        overlay = cv2.addWeighted(overlay, 1.0, pot_overlay, 0.45, 0)

    # Convert back to uint8 for drawing
    result = np.clip(overlay, 0, 255).astype(np.uint8)

    # ── SCANLINE EFFECT (every 4th row dimmed) ────────────────────────────────
    scanline_alpha = 0.08
    for y in range(0, h, 4):
        result[y, :] = (result[y, :].astype(np.float32) * (1 - scanline_alpha)).astype(np.uint8)

    # ── YOLO BOUNDING BOXES ───────────────────────────────────────────────────
    LABEL_COLOR = (0, 255, 220)     # cyan
    BOX_COLOR   = (0, 200, 180)
    HIGH_COLOR  = (0, 60, 255)      # red for high-risk labels

    flood_risk_labels = {"building", "wall", "traffic light"}

    for det in detections:
        if det["confidence"] < 0.30:
            continue
        x1, y1, x2, y2 = det["box"]
        label = det["label"]
        conf  = det["confidence"]
        color = HIGH_COLOR if label in flood_risk_labels else BOX_COLOR

        # Main rectangle
        cv2.rectangle(result, (x1, y1), (x2, y2), color, 2)

        # Corner brackets for a tech-futuristic look
        bracket_len = 12
        thick = 2
        for (sx, sy, dx, dy) in [
            (x1, y1,  1,  1), (x2, y1, -1,  1),
            (x1, y2,  1, -1), (x2, y2, -1, -1),
        ]:
            cv2.line(result, (sx, sy), (sx + dx * bracket_len, sy), color, thick + 1)
            cv2.line(result, (sx, sy), (sx, sy + dy * bracket_len), color, thick + 1)

        # Label pill
        label_text = f"{label.upper()} {int(conf * 100)}%"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(result, (x1, y1 - th - 8), (x1 + tw + 8, y1), color, -1)
        cv2.putText(result, label_text, (x1 + 4, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1, cv2.LINE_AA)

    # ── FLOOD CONTOUR OUTLINES ────────────────────────────────────────────────
    dark_mask = analysis_masks.get("dark")
    if dark_mask is not None and np.any(dark_mask):
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        dm = cv2.dilate(dark_mask, kernel, iterations=1)
        contours_flood, _ = cv2.findContours(dm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(result, contours_flood, -1, (0, 0, 255), 2)

    pot_mask = analysis_masks.get("potholes")
    if pot_mask is not None and np.any(pot_mask):
        contours_pot, _ = cv2.findContours(pot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(result, contours_pot, -1, (0, 120, 255), 1)

    # ── HUD HEADER PANEL ──────────────────────────────────────────────────────
    panel_h = 56
    panel = result[:panel_h, :].astype(np.float32)
    dark_panel = np.zeros_like(panel)
    panel_blended = cv2.addWeighted(panel, 0.35, dark_panel, 0.65, 0)
    result[:panel_h, :] = np.clip(panel_blended, 0, 255).astype(np.uint8)

    # Header accent line
    cv2.line(result, (0, panel_h), (w, panel_h), risk_color_bgr, 2)

    # Header text
    cv2.putText(result, "FLOODVISION AI  |  VULNERABILITY SCAN",
                (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 220, 255), 1, cv2.LINE_AA)

    risk_text = f"RISK: {risk}   SCORE: {score}/100"
    cv2.putText(result, risk_text, (12, 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, risk_color_bgr, 2, cv2.LINE_AA)

    # System tag top-right
    sys_tag = "SYS: MAPUSA-GOA  CAM: STREET-VIEW"
    (stw, _), _ = cv2.getTextSize(sys_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(result, sys_tag, (w - stw - 10, 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (100, 180, 240), 1, cv2.LINE_AA)

    model_tag = f"MODEL: YOLOv8n + OpenCV  |  DET: {len(detections)}"
    (mtw, _), _ = cv2.getTextSize(model_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(result, model_tag, (w - mtw - 10, 36),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (100, 180, 240), 1, cv2.LINE_AA)

    # ── BOTTOM FOOTER ─────────────────────────────────────────────────────────
    footer_y = h - 24
    cv2.line(result, (0, footer_y), (w, footer_y), risk_color_bgr, 1)

    if risk == "HIGH":
        footer_msg = "⚠  HIGH FLOOD VULNERABILITY — AVOID THIS ROUTE DURING MONSOON"
    elif risk == "MEDIUM":
        footer_msg = "◈  MEDIUM FLOOD RISK — EXERCISE CAUTION IN HEAVY RAINFALL"
    else:
        footer_msg = "✓  LOW FLOOD VULNERABILITY — ROAD APPEARS RELATIVELY SAFE"

    cv2.putText(result, footer_msg, (10, h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, risk_color_bgr, 1, cv2.LINE_AA)

    # ── SCORE BAR (bottom right) ───────────────────────────────────────────────
    bar_w = 160
    bar_h = 12
    bar_x = w - bar_w - 12
    bar_y = h - 20
    cv2.rectangle(result, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (60, 60, 60), -1)
    filled = int(bar_w * score / 100)
    cv2.rectangle(result, (bar_x, bar_y), (bar_x + filled, bar_y + bar_h), risk_color_bgr, -1)
    cv2.rectangle(result, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (120, 120, 120), 1)

    # ── ENCODE TO BASE64 ──────────────────────────────────────────────────────
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 88]
    success, buffer = cv2.imencode(".jpg", result, encode_params)
    if not success:
        logger.error("[FloodVision] Failed to encode processed image.")
        return ""

    return base64.b64encode(buffer).decode("utf-8")


# ─── Scoring Logic ────────────────────────────────────────────────────────────
def compute_final_score(yolo_score: int, cv_score: int) -> tuple[int, str]:
    """
    Combine YOLO and OpenCV scores into a final vulnerability score.
    YOLO contributes up to 40 points, OpenCV up to 60 points → total 0–100.

    Thresholds:
      0–30  → LOW
      31–60 → MEDIUM
      61–100→ HIGH
    """
    raw = yolo_score + cv_score
    # Clamp to 0–100
    final_score = max(0, min(100, raw))

    if final_score >= 61:
        risk = "HIGH"
    elif final_score >= 31:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return final_score, risk


# ─── Fallback: Error image ────────────────────────────────────────────────────
def _error_image_b64(message: str = "Image unavailable") -> str:
    """Create a small placeholder error image in base64."""
    placeholder = np.zeros((240, 400, 3), dtype=np.uint8)
    cv2.putText(placeholder, message, (20, 120),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 220), 2)
    _, buf = cv2.imencode(".jpg", placeholder)
    return base64.b64encode(buf).decode("utf-8")


# ─── Main API View ────────────────────────────────────────────────────────────
@api_view(["POST"])
def analyze(request):
    """
    POST /analyze/
    Body: { "image_url": "<URL>" }

    Performs full AI flood vulnerability analysis:
      1. Download Street View image
      2. YOLOv8 urban object detection
      3. OpenCV multi-stage road analysis
      4. Score fusion and risk classification
      5. Visual overlay generation

    Returns:
    {
      "risk": "HIGH" | "MEDIUM" | "LOW",
      "score": 0–100,
      "reasons": [...],
      "processed_image": "<base64 JPEG>"
    }
    """
    image_url = request.data.get("image_url", "").strip()

    if not image_url:
        return Response(
            {"error": "image_url is required in request body."},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(f"[FloodVision] Received analysis request for URL: {image_url[:80]}...")

    # ── STEP 1: Download Image ────────────────────────────────────────────────
    img_bgr = download_image(image_url)
    if img_bgr is None:
        logger.warning("[FloodVision] Could not download image — returning error response.")
        return Response(
            {
                "risk": "UNKNOWN",
                "score": 0,
                "reasons": ["Failed to download Street View image. Check the API key or URL."],
                "processed_image": _error_image_b64("Street View image fetch failed"),
            },
            status=status.HTTP_200_OK
        )

    logger.info(f"[FloodVision] Image downloaded: {img_bgr.shape[1]}x{img_bgr.shape[0]} px")

    # ── STEP 2: YOLOv8 Detection ──────────────────────────────────────────────
    detections, yolo_score, yolo_reasons = run_yolo_detection(img_bgr)
    logger.info(f"[FloodVision] YOLO: {len(detections)} objects detected, score contribution: {yolo_score}")

    # ── STEP 3: OpenCV Analysis ───────────────────────────────────────────────
    cv_score, cv_reasons, analysis_masks = run_opencv_analysis(img_bgr)
    logger.info(f"[FloodVision] OpenCV score contribution: {cv_score}")

    # ── STEP 4: Score Fusion ──────────────────────────────────────────────────
    final_score, risk = compute_final_score(yolo_score, cv_score)

    # Merge and deduplicate reasons; ensure at least one
    all_reasons = yolo_reasons + cv_reasons
    if not all_reasons:
        all_reasons = ["Infrastructure analysis complete — insufficient indicators for specific diagnosis."]

    # Limit to top 5 most informative reasons
    all_reasons = all_reasons[:5]

    logger.info(f"[FloodVision] Final → Risk: {risk}, Score: {final_score}")

    # ── STEP 5: Visual Overlay ────────────────────────────────────────────────
    processed_b64 = generate_overlay_image(
        img_bgr, detections, analysis_masks, risk, final_score, get_yolo_model()
    )

    # ── STEP 6: Return Response ───────────────────────────────────────────────
    return Response({
        "risk":             risk,
        "score":            final_score,
        "reasons":          all_reasons,
        "processed_image":  processed_b64,
    }, status=status.HTTP_200_OK)