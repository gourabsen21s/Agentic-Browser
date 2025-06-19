const { isOverlap, fuzzyMatchText } = require('../shared/utils');

function mergeDomAndOcr(domElements, ocrElements) {
    console.log(`[MATCHER] Starting merge: ${domElements.length} DOM elements and ${ocrElements.length} OCR elements.`);

    const mergedElements = [];
    const unmatchedOcrElements = [...ocrElements]; 

    domElements.forEach(domEl => {
        let bestOcrMatch = null;
        let bestSimilarity = 0;
        let bestOcrIndex = -1;

        for (let i = unmatchedOcrElements.length - 1; i >= 0; i--) {
            const ocrEl = unmatchedOcrElements[i];

            if (isOverlap(domEl.bbox, ocrEl.bbox)) {
                const domText = (domEl.textContent || '').trim();
                const ocrText = (ocrEl.text || '').trim();       

                const similarity = fuzzyMatchText(domText, ocrText);

                if (similarity > bestSimilarity && similarity >= 0.6) {
                    bestSimilarity = similarity;
                    bestOcrMatch = ocrEl;
                    bestOcrIndex = i;
                }
            }
        }

        if (bestOcrMatch) {
            const enrichedElement = {
                ...domEl,
                ocrText: bestOcrMatch.text,
                ocrConfidence: bestOcrMatch.confidence,
                ocrSimilarity: bestSimilarity,
                ocrBbox: bestOcrMatch.bbox,
                matchedByOcr: true
            };
            mergedElements.push(enrichedElement);
            unmatchedOcrElements.splice(bestOcrIndex, 1);
        } else {
            mergedElements.push({ ...domEl, matchedByOcr: false });
        }
    });

    unmatchedOcrElements.forEach(ocrEl => {
        mergedElements.push({
            tagName: 'ocr_text',
            id: '',
            className: '',
            textContent: ocrEl.text,
            bbox: ocrEl.bbox,
            ocrText: ocrEl.text,
            ocrConfidence: ocrEl.confidence,
            ocrSimilarity: 1.0,
            matchedByOcr: true,
        });
    });

    console.log(`[MATCHER] Merging complete. Total actionable elements: ${mergedElements.length}`);
    return mergedElements;
}

module.exports = {
    mergeDomAndOcr
};