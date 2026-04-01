# Tauri +<div align="center">
  <img src="public/icons/pixelImage-60x60.webp" alt="pixelImage Logo" width="120" height="120" />
  <h1>pixelImage</h1>
  <p><b>High-Performance Desktop Image Optimization and Tooling</b></p>
  
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white)](https://v2.tauri.app/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

<br/>

**pixelImage** is a lightning-fast, privacy-first desktop application built for developers, designers, and content creators. It provides a comprehensive suite of image processing tools running entirely on your local machine—no internet required.

Built with **Tauri v2** and **React**, it offers near-native performance while maintaining a beautiful, intuitive user interface.

---

## ✨ Features

<div align="center">
  <img src="/public/screenshots/dashboard.png" alt="Dashboard Overview" width="800" />
  <br/>
  <i>(Include a screenshot of the main dashboard here)</i>
</div>
<br/>

### 🛠️ Core Tools
*   **Batch Processor**: Process hundreds of images simultaneously. Resize, compress, and convert formats with a single click.
*   **Format Converter**: Seamlessly convert images between modern and legacy formats (WebP, AVIF, PNG, JPEG, SVG).
*   **Image Compressor**: Reduce file sizes drastically without noticeable quality loss using advanced compression algorithms.
*   **Image Resizer**: Accurately scale images while preserving aspect ratios or enforcing exact dimensions.
*   **Web Icons Generator**: Automatically generate `favicon.ico`, Apple Touch icons, Android icons, and Microsoft tile icons from a single source image, complete with the necessary HTML meta tags.
*   **Smart Scaler**: Intelligently upsample images while minimizing artifacts.
*   **Image Scraper**: Extract all images from any public webpage/URL efficiently.

<div align="center">
  <img src="/public/screenshots/batch_processor.png" alt="Batch Processing Interface" width="800" />
  <br/>
  <i>(Include a screenshot of the Batch Processor or Format Converter interface here)</i>
</div>
<br/>

### 📊 Management & History
*   **Analytics Dashboard**: Visual insights into your processing history, space saved, and most used formats.
*   **History Logs**: Keep track of all previously processed files, success rates, and export locations.

---

## 🚀 Installation (Windows)

No need to compile from source to start using pixelImage! You can download pre-compiled, ready-to-use installers straight from our GitHub Releases.

1. Go to the [Releases page](../../releases/latest).
2. Download the installer that best fits your needs:
    *   **`pixelImage_x.x.x_x64-setup.exe`**: Recommended for most users. Standard executable installer.
    *   **`pixelImage_x.x.x_x64.msi`**: Windows Installer package, ideal for enterprise or managed deployments.
3. Run the downloaded file and follow the setup wizard.
4. Launch **pixelImage** from your Start Menu!

---

## 🧑‍💻 Development Setup

Want to contribute or build pixelImage from source?

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Rust](https://www.rust-lang.org/)
*   [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/) (C++ Build Tools, Windows SDK)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pixelThreaderOfficial/pixelimage.git
   cd pixelimage
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run tauri dev
   ```
   *This command will start the Vite frontend server and launch the Tauri Rust backend.*

4. **Build for production:**
   ```bash
   npm run tauri build
   ```
   *The output installers (.exe, .msi) will be located in `src-tauri/target/release/bundle/`.*

---

## 🛡️ Privacy & Security

**pixelImage operates 100% offline.** 
Except for the Image Scraper tool (which requires internet access to fetch external web pages), all image processing, compression, and conversion happen locally on your hardware. Your files are never uploaded to any remote server.

---

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to improve the codebase:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is open-source. Please check the repository for specific licensing details.
```
