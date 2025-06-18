import cv2
import numpy as np
from paddleocr import PaddleOCR

_ocr_model = None

def _initialize_ocr_model():
    global _ocr_model
    if _ocr_model is None:
        print("[OCR_MODULE] Initializing PaddleOCR model (this may take a moment)...")

        _ocr_model = PaddleOCR(use_angle_cls=True, lang='en')
        print("[OCR_MODULE] PaddleOCR model initialized.")
    return _ocr_model

def perform_ocr(image_path: str) -> list:
    ocr_instance = _initialize_ocr_model()

    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"[OCR_MODULE] ERROR: cv2.imread returned None for {image_path}. File may not exist or is corrupted.")
            return []
        if img.size == 0:
            print(f"[OCR_MODULE] ERROR: Image loaded but is empty (size 0) for {image_path}. Check file integrity.")
            return []
        if img.ndim not in (2, 3):
            print(f"[OCR_MODULE] ERROR: Image loaded but has unexpected dimensions ({img.ndim}D) for {image_path}. Expected 2D or 3D.")
            return []

        print(f"[OCR_MODULE] Debug: Image successfully loaded. Shape: {img.shape}, Dtype: {img.dtype}")

        raw_ocr_result = ocr_instance.ocr(img)

        extracted_elements = []

        if raw_ocr_result and isinstance(raw_ocr_result, list) and len(raw_ocr_result) > 0 and isinstance(raw_ocr_result[0], dict):
            ocr_data = raw_ocr_result[0]

            texts = ocr_data.get('rec_texts', [])
            scores = ocr_data.get('rec_scores', [])
            polys = ocr_data.get('rec_polys', []) 

            if not (len(texts) == len(scores) == len(polys) and len(texts) > 0):
                print(f"[OCR_MODULE] Warning: OCR results inconsistent or empty. Texts: {len(texts)}, Scores: {len(scores)}, Polys: {len(polys)}")
                return []

            for i in range(len(texts)):
                text = texts[i]
                confidence = scores[i]
                bbox_coords = polys[i] 

                if bbox_coords.size == 0 or \
                   not isinstance(bbox_coords, np.ndarray) or \
                   bbox_coords.shape[0] < 4 or \
                   bbox_coords.shape[1] != 2 or \
                   not np.issubdtype(bbox_coords.dtype, np.number): # Check if elements are numbers
                    print(f"[OCR_MODULE] Warning: Invalid or malformed bbox_coords for element {i}: {bbox_coords}. Skipping.")
                    continue

                np_bbox = bbox_coords 

                x_min = int(np.min(np_bbox[:, 0]))
                y_min = int(np.min(np_bbox[:, 1]))
                x_max = int(np.max(np_bbox[:, 0]))
                y_max = int(np.max(np_bbox[:, 1]))

                extracted_elements.append({
                    "text": str(text),
                    "confidence": float(confidence),
                    "bbox": {
                        "x": x_min,
                        "y": y_min,
                        "width": x_max - x_min,
                        "height": y_max - y_min
                    }
                })
        return extracted_elements

    except Exception as e:
        print(f"[OCR_MODULE] Error performing OCR on {image_path}: {e}")
        import traceback
        traceback.print_exc()
        return []