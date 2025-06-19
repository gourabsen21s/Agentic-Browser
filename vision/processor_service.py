from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
# Removed cv2, numpy, and direct PaddleOCR import
from . import ocr # Import the ocr module from the same directory

app = FastAPI(
    title="Vision Processor Service",
    description="Processes screenshots using OCR and returns visual elements."
)

# Note: PaddleOCR initialization is now moved to vision/ocr.py,
# so we don't need 'ocr = PaddleOCR(...)' here anymore.

class ProcessImageRequest(BaseModel):
    screenshot_path: str

@app.get("/")
async def read_root():
    return {"message": "Vision Processor Service is running!"}

@app.post("/process_image")
async def process_image_endpoint(request: ProcessImageRequest):
    screenshot_path = request.screenshot_path

    if not os.path.exists(screenshot_path):
        raise HTTPException(status_code=404, detail=f"Screenshot not found at: {screenshot_path}")

    try:
        print(f"[VISION_SERVICE] Calling OCR module for: {os.path.basename(screenshot_path)}")
        # Call the perform_ocr function from the ocr module
        extracted_elements = ocr.perform_ocr(screenshot_path)

        if not extracted_elements:
            print(f"[VISION_SERVICE] No text elements found in {os.path.basename(screenshot_path)} or OCR failed.")

        print(f"[VISION_SERVICE] Processed screenshot {os.path.basename(screenshot_path)}. Found {len(extracted_elements)} text elements.")
        return {"status": "success", "extracted_elements": extracted_elements}

    except Exception as e:
        print(f"[VISION_SERVICE] Internal error in process_image_endpoint for {screenshot_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during image processing: {str(e)}")