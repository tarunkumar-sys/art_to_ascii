# 🎨 Ascii-Studio

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC.svg)](https://tailwindcss.com/)

**Ascii-Studio** is a premium, Blender-inspired web application designed for high-fidelity ASCII art conversion. It transforms images, videos, and real-time webcam feeds into stunning character-based visuals using a high-performance rendering engine.

---

### 🚀 Key Features

| 🛠️ Processing | 🎮 Viewport | 📤 Export & Presets |
| :--- | :--- | :--- |
| **Real-time Engine**: Instant conversion of images, MP4/WebM videos, and **Live Webcam**. | **Blender Navigation**: Professional pan (MMB) and zoom (Scroll) controls. | **GIF Animation**: Export video segments as universal animated GIFs via `gif.js`. |
| **Edge Detection**: Integrated Sobel operator for structural ASCII outlines. | **Integrated Shortcuts**: Quick-access keybindings dropdown (Window menu). | **HTML Snippets**: Copy colored ASCII as production-ready CSS/HTML snippets. |
| **Preset System**: Save and name custom render configurations to `localStorage`. | **Dark Studio UI**: 1:1 Blender-style interface for a focused workflow. | **Progress & ETA**: Real-time export progress with estimated time remaining. |

---

### ✨ What's New

-   **🎬 Animated GIF Export**: High-quality GIF generation for Discord, Twitter, and GitHub.
-   **💾 Named Presets**: Store your favorite combinations of characters, brightness, and contrast.
-   **🎨 Background Control**: Custom background colors for all exports, including transparency support for PNG/GIF.
-   **📋 Copy HTML**: One-click "Copy HTML" for pasting colored ASCII directly into web pages or READMEs.
-   **⏱️ ETA Logic**: Intelligent throughput measurement provides accurate encoding time estimates.

---

### 🛠️ Installation & Setup

Get started with Ascii-Studio in seconds:

#### 1. Clone the Repository
```bash
git clone https://github.com/tarunkumar-sys/art_to_ascii.git
cd art_to_ascii
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Run Development Server
```bash
npm run dev
```
*The app will be available at `http://localhost:5173`*

---

### 📖 How to Use

1.  **Media Source**: Open the **Source Tab** (ImageIcon) in the sidebar. You can:
    *   **Open File**: Drag & drop or click to upload local images/videos.
    *   **Activate Webcam**: Start a real-time live ASCII stream.
    *   **Fetch URL**: Pull media directly from the web (CORS permitting).
2.  **Render Properties**: Switch to the **Render Tab** (CameraIcon) to tweak the engine:
    *   **Sampling**: Change the character ramp or resolution density.
    *   **Presets**: Save your current settings or load one of the built-in professional ramps.
    *   **Adjustments**: Fine-tune **Brightness** and **Contrast** using Blender-style draggable fields.
3.  **Visuals**: Customize the **Fill Color** and **Opacity** or toggle **Colored Output** for vibrant RGB ASCII.
4.  **Navigation & Keys**: 
    *   **Pan**: Middle Mouse Button or `Space + Drag`.
    *   **Zoom**: Scroll Wheel or `+`/`-` keys.
    *   **Shortcuts**: Click the **Window** menu in the header to see all keyboard commands.
5.  **Export**: Use the **Export** button in the header to save as PNG, TXT, SVG, WebM, or GIF. Configure your **Background Color** and **Alpha** before rendering.

---

### 💻 Tech Stack

-   **React 19**: Modern UI component architecture with hooks-based state.
-   **Vite 6**: Blazing fast development environment and optimized builds.
-   **Tailwind CSS 4**: Custom "Blender-Dark" theme implementation.
-   **GIF.js**: Client-side GIF encoding using Web Workers.
-   **HTML5 Canvas**: Low-level pixel processing and frame extraction.
-   **Lucide React**: Clean, consistent interface iconography.

---

*Built with precision for the ASCII art community.*


