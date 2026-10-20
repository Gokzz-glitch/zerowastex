"""
Zer0wasteX Vision Service
Preserves /health, /classes and /score while supporting:
- optional hosted inference adapter
- local model fallback
- deterministic mock fallback for demo/testing
"""

import io
import os
import time
import logging
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from waste_classes import (
    WASTE_CLASSES,
    CLASS_LABELS,
    CLASS_DIFFICULTY,
    SEGREGATION_RULES,
    MLP_TAXONOMY,
    MLP_KEYWORD_HEURISTICS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zer0wastex.vision")

WEIGHTS_DIR = Path(__file__).parent / "weights"
CUSTOM_WEIGHTS = WEIGHTS_DIR / "best.pt"
FALLBACK_WEIGHTS = WEIGHTS_DIR / "yolov8m.pt"

MODEL_SOURCE = os.environ.get("VISION_MODEL_SOURCE", "auto").lower()  # auto|hosted|local|mock
VISION_SKIP_MODEL_INIT = os.environ.get("VISION_SKIP_MODEL_INIT", "false").lower() == "true"
HOSTED_INFERENCE_URL = os.environ.get("HOSTED_INFERENCE_URL")
HOSTED_INFERENCE_TOKEN = os.environ.get("HOSTED_INFERENCE_TOKEN")

_inference_layer = "mock"
_hosted_enabled = False
_yolo_model = None


def _init_hosted_inference() -> bool:
    global _hosted_enabled, _inference_layer
    if not HOSTED_INFERENCE_URL:
        return False
    _hosted_enabled = True
    _inference_layer = "hosted"
    logger.info("Hosted inference adapter enabled: %s", HOSTED_INFERENCE_URL)
    return True


def _init_local_yolo() -> bool:
    global _yolo_model, _inference_layer
    if VISION_SKIP_MODEL_INIT:
        logger.info("VISION_SKIP_MODEL_INIT=true, skipping local model bootstrap")
        return False

    try:
        from ultralytics import YOLO

        WEIGHTS_DIR.mkdir(exist_ok=True)
        weights = str(CUSTOM_WEIGHTS) if CUSTOM_WEIGHTS.exists() else (str(FALLBACK_WEIGHTS) if FALLBACK_WEIGHTS.exists() else "yolov8m.pt")
        _yolo_model = YOLO(weights)
        _inference_layer = "custom" if CUSTOM_WEIGHTS.exists() else "local-fallback"
        logger.info("Local YOLO model active with weights: %s", weights)
        return True
    except Exception as exc:
        logger.warning("Local YOLO init failed: %s", exc)
        return False


def _bootstrap_model() -> None:
    global _inference_layer
    if MODEL_SOURCE == "hosted":
        if not _init_hosted_inference():
            _inference_layer = "mock"
    elif MODEL_SOURCE == "local":
        if not _init_local_yolo():
            _inference_layer = "mock"
    elif MODEL_SOURCE == "mock":
        _inference_layer = "mock"
    else:
        # auto: hosted -> local -> deterministic mock
        if _init_hosted_inference():
            return
        if _init_local_yolo():
            return
        _inference_layer = "mock"


_bootstrap_model()

COCO_CLASS_MAP = {
    "bottle": ("plastic", 0.90),
    "cup": ("plastic", 0.75),
    "toothbrush": ("plastic", 0.70),
    "book": ("paper", 0.85),
    "banana": ("organic", 0.85),
    "apple": ("organic", 0.85),
    "cell phone": ("hazardous", 0.92),
    "laptop": ("hazardous", 0.92),
    "wine glass": ("glass", 0.90),
    "fork": ("metal", 0.80),
    "knife": ("metal", 0.80),
}


def _score_from_waste_class(primary_class: str, confidence: float) -> int:
    if primary_class == "hazardous":
        return max(0, int(20 * confidence))

    base = int(confidence * 85)
    bonus = 15 if confidence > 0.75 else 0
    return min(100, base + bonus)


def _infer_hosted(image: Image.Image) -> Optional[dict]:
    if not _hosted_enabled:
        return None

    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    headers = {}
    if HOSTED_INFERENCE_TOKEN:
        headers["Authorization"] = f"******"

    try:
        response = requests.post(
            HOSTED_INFERENCE_URL,
            files={"file": ("frame.jpg", buf.getvalue(), "image/jpeg")},
            timeout=8,
            headers=headers,
        )
        response.raise_for_status()
        payload = response.json()

        waste_class = payload.get("waste_class", "plastic")
        confidence = float(payload.get("confidence", 0.6))
        raw_predictions = payload.get("raw_predictions", [])

        return {
            "waste_class": waste_class if waste_class in CLASS_LABELS else "plastic",
            "confidence": max(0.0, min(1.0, confidence)),
            "classes_detected": [waste_class],
            "raw_predictions": raw_predictions,
            "model_source": "hosted",
        }
    except Exception as exc:
        logger.warning("Hosted inference failed, falling back locally: %s", exc)
        return None


def _infer_local_yolo(image: Image.Image) -> Optional[dict]:
    if _yolo_model is None:
        return None

    results = _yolo_model.predict(source=image, conf=0.25, verbose=False)
    detections = []

    for result in results:
        for box in result.boxes:
            cls_name = _yolo_model.names[int(box.cls)].lower()
            detections.append((cls_name, float(box.conf)))

    if not detections:
        return {
            "waste_class": "plastic",
            "confidence": 0.45,
            "classes_detected": [],
            "raw_predictions": [],
            "model_source": _inference_layer,
        }

    waste_votes = {}
    for cls_name, conf in detections:
        if cls_name in COCO_CLASS_MAP:
            waste_class, reliability = COCO_CLASS_MAP[cls_name]
            weighted = conf * reliability
            if weighted > waste_votes.get(waste_class, 0):
                waste_votes[waste_class] = weighted

    if not waste_votes:
        waste_class = "plastic"
        confidence = 0.5
    else:
        waste_class = max(waste_votes, key=waste_votes.get)
        confidence = round(min(1.0, waste_votes[waste_class]), 3)

    return {
        "waste_class": waste_class,
        "confidence": confidence,
        "classes_detected": list(waste_votes.keys()),
        "raw_predictions": [{"class": c, "confidence": round(f, 3)} for c, f in sorted(detections, key=lambda x: -x[1])[:5]],
        "model_source": _inference_layer,
    }


def _infer_mock(image: Image.Image) -> dict:
    # Deterministic fallback based on average brightness and dimensions.
    pixels = image.convert("L")
    mean = sum(pixels.getdata()) / max(len(pixels.getdata()), 1)
    width, height = image.size

    if mean < 70:
        waste_class = "hazardous"
        confidence = 0.62
        mlp_key = "mlp_contaminated"
    elif width > height:
        waste_class = "plastic"
        confidence = 0.71
        mlp_key = "mlp_wrapper"
    elif mean > 170:
        waste_class = "paper"
        confidence = 0.69
        mlp_key = "plastic_general"
    else:
        waste_class = "plastic"
        confidence = 0.74
        mlp_key = "mlp_laminated_pouch"

    return {
        "waste_class": waste_class,
        "confidence": confidence,
        "classes_detected": [waste_class],
        "raw_predictions": [{"class": waste_class, "confidence": confidence}],
        "model_source": "mock",
        "mlp_key": mlp_key,
    }


def _resolve_mlp_category(result: dict) -> dict:
    mlp_key = result.get("mlp_key")

    if not mlp_key:
        for pred in result.get("raw_predictions", []):
            cls_name = str(pred.get("class", "")).lower()
            for keyword, key in MLP_KEYWORD_HEURISTICS.items():
                if keyword in cls_name:
                    mlp_key = key
                    break
            if mlp_key:
                break

    if not mlp_key:
        mlp_key = "plastic_general" if result.get("waste_class") == "plastic" else None

    if not mlp_key:
        return {
            "category": None,
            "label": None,
            "is_mlp_candidate": False,
            "is_heuristic": False,
        }

    info = MLP_TAXONOMY.get(mlp_key, MLP_TAXONOMY["plastic_general"])
    return {
        "category": mlp_key,
        "label": info["label"],
        "is_mlp_candidate": info["is_mlp_candidate"],
        "is_heuristic": info["is_heuristic"],
    }


def _run_inference(image: Image.Image) -> dict:
    if _inference_layer == "hosted":
        result = _infer_hosted(image)
        if result:
            return result

    if _yolo_model is not None:
        result = _infer_local_yolo(image)
        if result:
            return result

    return _infer_mock(image)


app = FastAPI(
    title="Zer0wasteX Vision Service",
    version="2.1.0",
    description="AI-assisted waste classification with hosted/local/mock adapters",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("VISION_CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "zer0wastex-vision",
        "inference_layer": _inference_layer,
        "model_source_config": MODEL_SOURCE,
        "custom_model_loaded": CUSTOM_WEIGHTS.exists(),
        "hosted_inference_enabled": _hosted_enabled,
        "local_model_active": _yolo_model is not None,
    }


@app.get("/classes")
def get_classes():
    return {
        "classes": {
            str(idx): {
                "name": name,
                **CLASS_LABELS[name],
            }
            for idx, name in WASTE_CLASSES.items()
        },
        "mlp_taxonomy": MLP_TAXONOMY,
    }


@app.post("/score")
async def score_image(
    file: UploadFile = File(...),
    bin_type: Optional[str] = Query(None, description="wet_bin | dry_bin | hazardous_bin"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG/PNG)")

    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 15 MB)")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        if max(image.size) > 1280:
            image.thumbnail((1280, 1280), Image.LANCZOS)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not decode image")

    t0 = time.perf_counter()
    result = _run_inference(image)
    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    waste_class = result["waste_class"]
    confidence = float(result["confidence"])

    ai_quality_score = _score_from_waste_class(waste_class, confidence)
    difficulty = CLASS_DIFFICULTY.get(waste_class, 1.0)
    ai_quality_score = max(0, min(100, int(ai_quality_score / difficulty)))

    is_correctly_sorted = None
    if bin_type:
        allowed = SEGREGATION_RULES.get(bin_type, [])
        is_correctly_sorted = waste_class in allowed
        if not is_correctly_sorted:
            ai_quality_score = max(0, ai_quality_score - 30)

    mlp = _resolve_mlp_category(result)

    logger.info(
        "Scored | source=%s | class=%s | conf=%.2f | score=%d | mlp=%s | %.1fms",
        result.get("model_source", _inference_layer),
        waste_class,
        confidence,
        ai_quality_score,
        mlp["category"],
        inference_ms,
    )

    return JSONResponse(
        {
            "ai_quality_score": ai_quality_score,
            "waste_class": waste_class,
            "waste_class_label": CLASS_LABELS[waste_class],
            "classes_detected": result.get("classes_detected", []),
            "confidence": confidence,
            "raw_predictions": result.get("raw_predictions", []),
            "inference_layer": _inference_layer,
            "model_source": result.get("model_source", _inference_layer),
            "inference_ms": inference_ms,
            "is_correctly_sorted": is_correctly_sorted,
            "bin_type_checked": bin_type,
            "mlp_category": mlp,
        }
    )
