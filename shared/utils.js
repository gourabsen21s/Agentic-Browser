const Fuse = require('fuse.js'); 


function isOverlap(bbox1, bbox2) {

    if (bbox1.x + bbox1.width < bbox2.x || bbox2.x + bbox2.width < bbox1.x) {
        return false;
    }

    if (bbox1.y + bbox1.height < bbox2.y || bbox2.y + bbox2.height < bbox1.y) {
        return false;
    }
    return true; 
}

function getIntersectionArea(bbox1, bbox2) {
    const x_overlap = Math.max(0, Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - Math.max(bbox1.x, bbox2.x));
    const y_overlap = Math.max(0, Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - Math.max(bbox1.y, bbox2.y));
    return x_overlap * y_overlap;
}

function getIoU(bbox1, bbox2) {
    const intersectionArea = getIntersectionArea(bbox1, bbox2);
    if (intersectionArea === 0) return 0;

    const unionArea = (bbox1.width * bbox1.height) + (bbox2.width * bbox2.height) - intersectionArea;
    return intersectionArea / unionArea;
}

function fuzzyMatchText(str1, str2) {

    if (!str1 || !str2) return 0;


    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();


    if (s1 === s2) return 1;

    const options = {
        includeScore: true, 
        keys: ['text'],     
        threshold: 0.6,     
        ignoreLocation: true, 
        distance: 100,      
        minMatchCharLength: 1 
    };

    const listToSearch = [{ text: s1 }]; 

    const fuse = new Fuse(listToSearch, options);
    const result = fuse.search(s2);

    if (result.length > 0) {
        const fuseScore = result[0].score;
        const normalizedSimilarity = 1 - (fuseScore / options.threshold);
        return Math.max(0, normalizedSimilarity); 
    }

    return 0; 
}

module.exports = {
    isOverlap,
    getIntersectionArea,
    getIoU,
    fuzzyMatchText,

};