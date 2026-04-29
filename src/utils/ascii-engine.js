export const DEFAULT_ASCII = "#####********+++++++++=========--------:::::::::..";
export const GRAY_RAMP_BALANCED = '$@08GCLft1i;:.,:;i1tfLCG0 ';
export const GRAY_RAMP_DARK = '$@08;:.,:;i1tfLCG0 ';

// From original: Image logic uses (r+g+b)/3.0
export const getBrightnessImage = (r, g, b) => (r + g + b) / 3.0;

// From original: Video logic uses 0.334*r + 0.333*g + 0.333*b
export const getBrightnessVideo = (r, g, b) => 0.334 * r + 0.333 * g + 0.333 * b;

export const getCharacterForGrayScale = (grayScale, asciiString, isVideo = false) => {
    // If it's the custom string from image logic
    if (!isVideo) {
        let index = Math.floor((grayScale / 255) * (asciiString.length - 1));
        if (index >= asciiString.length) index = asciiString.length - 1;
        return asciiString.charAt(index);
    } else {
        // Video logic (ramp mapped based on mode, but we can unify via asciiString passed in)
        let rampLength = asciiString.length;
        return asciiString.charAt(Math.ceil((rampLength - 1) * grayScale / 255));
    }
};

export const convertImageToAscii = (img, asciiString, width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    // Original image logic scale factor
    ctx.scale((width / img.width) * 0.5, (height / img.height) * 0.5);
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, width, height).data;
    let asciiImage = "";

    // Original image loop used i < h >> 1 and j < w >> 1
    // We adjust it for the scaled canvas size requested
    let renderW = width >> 1;
    let renderH = height >> 1;

    for (let i = 0; i < renderH; i++) {
        for (let j = 0; j < renderW; j++) {
            let off = (i * width + j) << 2;
            let r = data[off];
            let g = data[off + 1];
            let b = data[off + 2];
            
            let grayscale = getBrightnessImage(r, g, b);
            let char = getCharacterForGrayScale(grayscale, asciiString, false);
            asciiImage += char;
        }
        asciiImage += '\n';
    }
    return asciiImage;
};

// Returns raw grayscales for video logic
export const convertToGrayScales = (context, width, height) => {
    const imageData = context.getImageData(0, 0, width, height);
    const grayScales = [];
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        const grayScale = getBrightnessVideo(r, g, b);
        grayScales.push(grayScale);
    }
    return grayScales;
};

export const drawVideoAscii = (grayScales, width, asciiString) => {
    return grayScales.reduce((asciiText, grayScale, index) => {
        let nextChars = getCharacterForGrayScale(grayScale, asciiString, true);
        if ((index + 1) % width === 0) {
            nextChars += '\n';
        }
        return asciiText + nextChars;
    }, '');
};
