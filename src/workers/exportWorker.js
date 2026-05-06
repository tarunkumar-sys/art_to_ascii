// Dynamic WebMMuxer loader for worker
self.importScripts('https://unpkg.com/webm-muxer/build/webm-muxer.js');

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texcoord;

  uniform sampler2D u_video;
  uniform sampler2D u_atlas;

  uniform vec2 u_resolution;
  uniform vec2 u_charSize;
  uniform float u_asciiLength;
  uniform bool u_colored;
  uniform vec3 u_color;
  uniform float u_opacity;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform bool u_invertBrightness;
  uniform vec4 u_bgColor;

  void main() {
    vec2 pixelPos = v_texcoord * u_resolution;
    vec2 cellCoord = floor(pixelPos / u_charSize);
    
    vec2 samplePos = (cellCoord * u_charSize + u_charSize * 0.5) / u_resolution;
    vec4 vidColor = texture2D(u_video, samplePos);
    
    float gray = dot(vidColor.rgb, vec3(0.334, 0.333, 0.333));
    if (u_invertBrightness) {
      gray = 1.0 - gray;
    }
    gray = (gray - 0.5) * u_contrast + 0.5;
    gray = gray * u_brightness;
    gray = clamp(gray, 0.0, 1.0);
    
    float index = floor(gray * (u_asciiLength - 1.0) + 0.5);
    
    vec2 charUV = fract(pixelPos / u_charSize);
    float atlasX = (index + charUV.x) / u_asciiLength;
    float atlasY = charUV.y;
    
    float textIntensity = texture2D(u_atlas, vec2(atlasX, atlasY)).r;
    
    // Fake 1px drop shadow
    vec2 shadowOffset = vec2(1.0, 1.0) / u_charSize;
    vec2 shadowUV = charUV - shadowOffset;
    float shadowIntensity = 0.0;
    if (shadowUV.x >= 0.0 && shadowUV.x <= 1.0 && shadowUV.y >= 0.0 && shadowUV.y <= 1.0) {
      shadowIntensity = texture2D(u_atlas, vec2((index + shadowUV.x) / u_asciiLength, shadowUV.y)).r;
    }
    
    vec4 finalColor = u_bgColor;
    vec3 textColor = u_colored ? vidColor.rgb : u_color;
    float alpha = u_colored ? 1.0 : (u_opacity / 100.0);
    
    finalColor.rgb = mix(finalColor.rgb, vec3(0.0), shadowIntensity * 0.5);
    finalColor.rgb = mix(finalColor.rgb, textColor, textIntensity * alpha);
    
    gl_FragColor = finalColor;
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

self.onmessage = async (e) => {
  const { frames, atlasBitmap, opts } = e.data;
  const {
    outWidth,
    outHeight,
    charW,
    charH,
    fps,
    asciiStr,
    coloredAscii,
    invertBrightness,
    brightness,
    contrast,
    exportBgColor,
    exportTransparent,
    asciiColor,
    asciiOpacity
  } = opts;

  // Initialize OffscreenCanvas and WebGL
  const canvas = new OffscreenCanvas(outWidth, outHeight);
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true });
  if (!gl) {
    self.postMessage({ type: 'error', error: 'WebGL not supported in worker' });
    return;
  }

  // Setup Shaders
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 1,
     1, -1, 1, 1,
    -1,  1, 0, 0,
     1,  1, 1, 0
  ]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

  const texLoc = gl.getAttribLocation(program, "a_texcoord");
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

  // Textures
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  
  const atlasTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasBitmap);

  const videoTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Uniforms
  gl.uniform1i(gl.getUniformLocation(program, "u_video"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "u_atlas"), 1);
  gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), outWidth, outHeight);
  gl.uniform2f(gl.getUniformLocation(program, "u_charSize"), charW, charH);
  gl.uniform1f(gl.getUniformLocation(program, "u_asciiLength"), asciiStr.length);
  gl.uniform1i(gl.getUniformLocation(program, "u_colored"), coloredAscii ? 1 : 0);
  
  const [r, g, b] = hexToRgb(asciiColor);
  gl.uniform3f(gl.getUniformLocation(program, "u_color"), r/255, g/255, b/255);
  
  gl.uniform1f(gl.getUniformLocation(program, "u_opacity"), asciiOpacity);
  gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), brightness);
  gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), contrast);
  gl.uniform1i(gl.getUniformLocation(program, "u_invertBrightness"), invertBrightness ? 1 : 0);
  
  const [bgR, bgG, bgB] = hexToRgb(exportBgColor);
  gl.uniform4f(gl.getUniformLocation(program, "u_bgColor"), bgR/255, bgG/255, bgB/255, exportTransparent ? 0.0 : 1.0);

  // Setup WebMMuxer
  const muxer = new WebMMuxer.Muxer({
    target: new WebMMuxer.ArrayBufferTarget(),
    video: { codec: 'V_VP9', width: outWidth, height: outHeight, frameRate: fps }
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      console.error(err);
      self.postMessage({ type: 'error', error: err.message });
    }
  });

  videoEncoder.configure({
    codec: 'vp09.00.10.08',
    width: outWidth,
    height: outHeight,
    bitrate: 8_000_000
  });

  gl.viewport(0, 0, outWidth, outHeight);

  // Render loop
  const totalFrames = frames.length;
  for (let f = 0; f < totalFrames; f++) {
    const bitmap = frames[f];
    
    // Upload video frame texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    
    // Draw
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Encode
    const timestamp = (f * 1e6) / fps;
    const vframe = new VideoFrame(canvas, { timestamp });
    videoEncoder.encode(vframe, { keyFrame: f % (fps * 2) === 0 });
    vframe.close();
    bitmap.close();

    self.postMessage({ type: 'progress', progress: (f + 1) / totalFrames });
  }

  await videoEncoder.flush();
  muxer.finalize();
  
  const buffer = muxer.target.buffer;
  self.postMessage({ type: 'done', buffer }, [buffer]);
};
