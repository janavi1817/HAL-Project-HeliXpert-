# -*- coding: utf-8 -*-
import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from backend.services.vision_service import vision_service

router = APIRouter(prefix="/api/vision", tags=["Image Vision AI"])

ALLOWED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.bmp', '.webp')

@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze a helicopter image for defects or health status.
    Returns: overall_status, health_score, detections (defects), part_assessments.
    """
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    temp_path = f"temp_vision_{uuid.uuid4().hex}{ext}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = vision_service.analyze(temp_path)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))

        return result

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
