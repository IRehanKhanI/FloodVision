"""YOLO service wrapper for local object detection.

This module provides a lightweight wrapper around the `ultralytics` YOLO API
when available. It is optional — the service will gracefully return an
unavailable response when the package or model is missing.

Environment variables:
 - YOLO_MODEL_PATH: path or model name to load (default: 'yolov8n.pt')
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
    from PIL import Image
    _YOLO_AVAILABLE = True
except Exception as exc:  # pragma: no cover - optional runtime dependency
    _YOLO_AVAILABLE = False
    _YOLO_ERROR = str(exc)

_model = None


def _load_model() -> Any:
    global _model
    if not _YOLO_AVAILABLE:
        raise ImportError(f"ultralytics not available: {_YOLO_ERROR}")
    if _model is None:
        model_path = os.environ.get('YOLO_MODEL_PATH', 'yolov8n.pt')
        logger.info(f"Loading YOLO model from: {model_path}")
        _model = YOLO(model_path)
    return _model


def detect_from_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """Run YOLO inference on raw image bytes and return detections.

    Returns a dict with `available` and `detections` list where each detection
    has `class`, `confidence` and `bbox` (xyxy).
    """
    if not _YOLO_AVAILABLE:
        return {'available': False, 'detections': [], 'error': _YOLO_ERROR}

    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    model = _load_model()

    # The ultralytics model returns a Results object; iterate safely
    try:
        results = model(img)
    except Exception as exc:
        logger.error(f"YOLO inference failed: {exc}")
        return {'available': False, 'detections': [], 'error': str(exc)}

    detections: List[Dict[str, Any]] = []
    for res in results:
        boxes = getattr(res, 'boxes', None)
        if boxes is None:
            continue
        # boxes.xyxy, boxes.conf, boxes.cls are arrays/tensors
        xyxy = getattr(boxes, 'xyxy', None)
        confs = getattr(boxes, 'conf', None)
        cls_ids = getattr(boxes, 'cls', None)
        for i in range(len(confs)):
            try:
                cls_id = int(cls_ids[i].item()) if hasattr(cls_ids[i], 'item') else int(cls_ids[i])
            except Exception:
                cls_id = int(cls_ids[i]) if cls_ids is not None else -1
            try:
                conf = float(confs[i].item()) if hasattr(confs[i], 'item') else float(confs[i])
            except Exception:
                conf = float(confs[i]) if confs is not None else 0.0
            try:
                box_xy = xyxy[i].tolist() if hasattr(xyxy[i], 'tolist') else list(xyxy[i])
            except Exception:
                box_xy = []
            cls_name = model.names.get(cls_id, str(cls_id)) if hasattr(model, 'names') else str(cls_id)
            detections.append({'class': cls_name, 'confidence': conf, 'bbox': box_xy})

    return {'available': True, 'detections': detections}
