# 🎨 Ascii-Studio

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC.svg)](https://tailwindcss.com/)

**Ascii-Studio** is a premium, Blender-inspired web application designed for high-fidelity ASCII art conversion. It transforms images, videos, and real-time webcam feeds into stunning character-based visuals using a high-performance rendering engine.

---

### 🚀 Key Features

| 🛠️ Processing | 🎮 Viewport | 📤 Export |
| :--- | :--- | :--- |
| **Real-time Engine**: Instant conversion of images, MP4 videos, and **Live Webcam**. | **Blender Navigation**: Professional pan (MMB) and zoom (Scroll) controls. | **Multi-Format**: Export as high-res PNG, TXT, or GitHub-ready Markdown. |
| **Edge Detection**: Integrated Sobel operator for structural ASCII outlines. | **Precise Zoom**: Fine-grained viewport scaling with centered origin. | **ANSI Color**: Optional RGB color mapping for HTML/Terminal displays. |
| **Custom Ramps**: Define and save custom character gradients as presets. | **Dark Studio UI**: 1:1 Blender-style interface for a focused workflow. | **Aspect Correction**: Automatic compensation for monospace line-height. |

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
    *   **Adjustments**: Fine-tune **Brightness** and **Contrast** using Blender-style draggable fields.
    *   **Effects**: Enable **Edge Detect** to emphasize shapes and borders.
3.  **Visuals**: Customize the **Fill Color** and **Opacity** or toggle **Colored Output** for vibrant RGB ASCII.
4.  **Navigation**: 
    *   **Pan**: Hold Middle Mouse Button (or Space + Left Click).
    *   **Zoom**: Scroll Wheel or use the zoom slider.
5.  **Export**: Click the **Output & Export** button in the header to save your creation.

---

### 💻 Tech Stack

-   **React 19**: Modern UI component architecture with hooks-based state.
-   **Vite 6**: Blazing fast development environment and optimized builds.
-   **Tailwind CSS 4**: Custom "Blender-Dark" theme implementation.
-   **HTML5 Canvas**: Low-level pixel processing and frame extraction.
-   **Lucide React**: Clean, consistent interface iconography.
-   **Sobel Engine**: Custom JavaScript implementation of structural edge detection.

---

*Built with precision for the ASCII art community.*

