export const DEFAULT_ASCII = "#####********+++++++++=========--------:::::::::..";
export const GRAY_RAMP_BALANCED = '$@08GCLft1i;:.,:;i1tfLCG0 ';
export const GRAY_RAMP_DARK = '$@08;:.,:;i1tfLCG0 ';

export const ASCII_PRESETS = [
  { name: 'Standard', chars: "#####********+++++++++=========--------:::::::::.." },
  { name: 'Balanced', chars: '$@08GCLft1i;:.,:;i1tfLCG0 ' },
  { name: 'Dark', chars: '$@08;:.,:;i1tfLCG0 ' },
  { name: 'Gradient', chars: ' .:-=+*#%@' },
  { name: 'Dense', chars: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}?-_+~<>i!lI;:,". ' },
  { name: 'Blocks', chars: '█▓▒░ ' },
  { name: 'Minimal', chars: '@# .' },
  { name: 'Binary', chars: '10 ' },
  { name: 'Dots', chars: '●◉◎○ ' },
];

// ─── Brightness calculation ───────────────────────────────────────────────────

export const getBrightnessImage = (r, g, b) => (r + g + b) / 3.0;
export const getBrightnessVideo = (r, g, b) => 0.334 * r + 0.333 * g + 0.333 * b;

// ─── Pixel adjustments ───────────────────────────────────────────────────────

export const adjustPixel = (gray, opts = {}) => {
  const { brightness = 1.0, contrast = 1.0, invert = false } = opts;
  let v = gray * brightness;
  v = (v - 128) * contrast + 128;
  if (invert) v = 255 - v;
  return Math.max(0, Math.min(255, v));
};

// ─── Character mapping ────────────────────────────────────────────────────────

export const getCharForGray = (gray, asciiString) => {
  const index = Math.round((gray / 255) * (asciiString.length - 1));
  return asciiString.charAt(Math.min(index, asciiString.length - 1));
};

// Legacy compat
export const getCharacterForGrayScale = (grayScale, asciiString, isVideo = false) => {
  return getCharForGray(grayScale, asciiString);
};

// ─── Sobel edge detection ─────────────────────────────────────────────────────

function sobelOnData(data, width, height) {
  // Build grayscale array
  const g = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  const result = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const gx =
        -g[(y - 1) * width + (x - 1)] + g[(y - 1) * width + (x + 1)]
        - 2 * g[y * width + (x - 1)] + 2 * g[y * width + (x + 1)]
        - g[(y + 1) * width + (x - 1)] + g[(y + 1) * width + (x + 1)];
      const gy =
        g[(y - 1) * width + (x - 1)] + 2 * g[(y - 1) * width + x] + g[(y - 1) * width + (x + 1)]
        - g[(y + 1) * width + (x - 1)] - 2 * g[(y + 1) * width + x] - g[(y + 1) * width + (x + 1)];
      result[p] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return result;
}

// ─── Image → ASCII ────────────────────────────────────────────────────────────

export const convertImageToAscii = (img, asciiString, width, height, opts = {}) => {
  const {
    invertBrightness = false,
    brightness = 1.0,
    contrast = 1.0,
    edgeDetection = false,
    coloredAscii = false,
    aspectRatioCorrection = true,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false }); // Optimization

  const yScale = aspectRatioCorrection ? 0.5 : 1;
  ctx.scale(width / img.width, (height / img.height) * yScale);
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let edgeMap = null;
  if (edgeDetection) {
    edgeMap = sobelOnData(data, width, height);
  }

  const renderH = Math.floor(height * yScale);
  const renderW = width;
  const asciiLen = asciiString.length - 1;
  const output = [];

  for (let i = 0; i < renderH; i++) {
    let rowStr = '';
    const rowOffset = i * width;
    for (let j = 0; j < renderW; j++) {
      const idx = rowOffset + j;
      const off = idx << 2;
      const r = data[off], g = data[off + 1], b = data[off + 2];

      let rawGray;
      if (edgeDetection && edgeMap) {
        rawGray = edgeMap[idx];
      } else {
        // Inlined getBrightnessImage
        rawGray = (r + g + b) / 3.0;
      }

      // Inlined adjustPixel
      let v = rawGray * brightness;
      v = (v - 128) * contrast + 128;
      if (invertBrightness) v = 255 - v;
      if (v < 0) v = 0; else if (v > 255) v = 255;

      // Inlined getCharForGray
      const charIdx = Math.round((v / 255) * asciiLen);
      const char = asciiString[charIdx] || ' ';

      if (coloredAscii) {
        const safe = char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char;
        rowStr += `<span style="color:rgb(${r},${g},${b})">${safe}</span>`;
      } else {
        rowStr += char;
      }
    }
    output.push(rowStr);
  }

  return output.join('\n');
};

// ─── Video grayscale extraction ───────────────────────────────────────────────

export const convertToGrayScales = (context, width, height, opts = {}) => {
  const { invertBrightness = false, brightness = 1.0, contrast = 1.0 } = opts;
  const imageData = context.getImageData(0, 0, width, height);
  const d = imageData.data;
  const len = d.length;
  const grayScales = new Float32Array(len >> 2); // Use typed array for speed

  for (let i = 0, p = 0; i < len; i += 4, p++) {
    // Inlined getBrightnessVideo
    const raw = 0.334 * d[i] + 0.333 * d[i + 1] + 0.333 * d[i + 2];
    
    // Inlined adjustPixel
    let v = raw * brightness;
    v = (v - 128) * contrast + 128;
    if (invertBrightness) v = 255 - v;
    if (v < 0) v = 0; else if (v > 255) v = 255;
    
    grayScales[p] = v;
  }
  return grayScales;
};

export const drawVideoAscii = (grayScales, width, asciiString) => {
  const len = grayScales.length;
  const asciiLen = asciiString.length - 1;
  const output = [];
  let row = '';
  
  for (let i = 0; i < len; i++) {
    const gray = grayScales[i];
    const charIdx = Math.round((gray / 255) * asciiLen);
    row += asciiString[charIdx] || ' ';
    
    if ((i + 1) % width === 0) {
      output.push(row);
      row = '';
    }
  }
  return output.join('\n');
};
