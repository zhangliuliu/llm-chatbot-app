import mermaid from "mermaid";
import type { DiagramRenderer } from "./types";
import { RendererCache } from "./types";

// 初始化 mermaid 配置
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

export class MermaidRenderer implements DiagramRenderer {
  languages = ["mermaid"];
  private cache = new RendererCache();

  async render(content: string, _key: string, isStreaming: boolean): Promise<string> {
    const cached = this.cache.get(content);
    if (cached) return cached;

    // Loading 状态的 HTML
    const loadingHtml = `
      <div class="mermaid-wrapper loading">
        <div class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm">
          <div class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5">
            <span class="text-xs font-medium text-zinc-400 select-none font-mono lowercase">mermaid (rendering...)</span>
          </div>
          <pre class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"><code class="font-mono! text-sm bg-transparent! p-0! border-none!">${content}</code></pre>
        </div>
      </div>`;

    if (!content.trim()) return '<div class="empty-diagram"></div>';

    try {
      // 预检查语法
      await mermaid.parse(content);

      // 生成 SVG
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(id, content);

      const renderedHtml = `
        <div class="mermaid-block-container relative mermaid-block-group bg-white/50 dark:bg-zinc-900/50 transition-all duration-300 z-[1] min-h-[80px]">
          <div class="mermaid-wrapper-outer overflow-auto p-0 flex justify-center items-center rounded-xl border border-zinc-200 dark:border-zinc-800">
             <div class="mermaid-wrapper rendered transition-transform duration-200 ease-out" style="transform: scale(1); transform-origin: center center;">${svg}</div>
          </div>
          
          <!-- Actions Bar -->
          <div class="mermaid-actions-bar absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm opacity-0 translate-y-[-4px] transition-all duration-300 mermaid-block-group-hover:opacity-100 mermaid-block-group-hover:translate-y-0 z-50">
            <button class="zoom-out-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Zoom Out">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
            </button>
            <button class="zoom-in-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Zoom In">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </button>
            
            <div class="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
            
            <!-- Download Dropdown Trigger -->
            <div class="relative group/download">
              <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all font-sans" title="Download Options">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span class="text-xs font-semibold">下载</span>
              </button>
              
              <!-- Dropdown Menu -->
              <div class="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl py-1.5 z-[100] opacity-0 invisible group-hover/download:opacity-100 group-hover/download:visible transition-all duration-200 translate-y-1 group-hover/download:translate-y-0">
                <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-svg-btn text-left font-sans">
                  <span>下载 SVG</span>
                </button>
                <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-png-btn text-left font-sans">
                  <span>下载 PNG</span>
                </button>
                <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-code-btn text-left font-sans">
                  <span>下载代码</span>
                </button>
              </div>
            </div>
            
            <button class="fullscreen-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Full Screen">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          </div>
        </div>`;
      this.cache.set(content, renderedHtml);
      return renderedHtml;
    } catch (error) {
      if (!isStreaming) {
        return `<div class="text-red-500 text-sm p-4">Mermaid syntax error</div>`;
      }
      return loadingHtml;
    }
  }

  async hydrate(element: HTMLElement, content: string, isStreaming: boolean): Promise<void> {
    if (isStreaming) return;

    const svgBtn = element.querySelector(".download-svg-btn");
    const pngBtn = element.querySelector(".download-png-btn");
    const codeBtn = element.querySelector(".download-code-btn");
    const zoomInBtn = element.querySelector(".zoom-in-btn");
    const zoomOutBtn = element.querySelector(".zoom-out-btn");
    const fullBtn = element.querySelector(".fullscreen-btn");

    const wrapper = element.querySelector(".mermaid-wrapper") as HTMLElement;
    const svgEl = wrapper?.querySelector("svg") as SVGElement;

    if (!wrapper || !svgEl) return;

    // Zoom Logic
    let currentScale = 1;
    const updateZoom = (delta: number) => {
      currentScale = Math.max(0.5, Math.min(3, currentScale + delta));
      wrapper.style.transform = `scale(${currentScale})`;
    };

    zoomInBtn?.addEventListener("click", () => updateZoom(0.2));
    zoomOutBtn?.addEventListener("click", () => updateZoom(-0.2));

    // Fullscreen Logic (Shadcn-style Lightbox)
    fullBtn?.addEventListener("click", () => {
      this.showLightbox(svgEl);
    });

    // Download Actions
    if (codeBtn) {
      codeBtn.addEventListener("click", () => {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        this.triggerDownload(url, "diagram.mmd");
        URL.revokeObjectURL(url);
      });
    }

    if (svgBtn && svgEl) {
      svgBtn.addEventListener("click", () => this.downloadSvg(svgEl));
    }

    if (pngBtn && svgEl) {
      pngBtn.addEventListener("click", () => this.downloadPng(svgEl));
    }
  }

  private showLightbox(svgEl: SVGElement) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[999] bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200";

    // Header with Zoom and Close Buttons
    const header = document.createElement("div");
    header.className = "absolute top-6 right-6 z-[1000] flex items-center gap-3";
    header.innerHTML = `
      <div class="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 p-1 mr-2 shadow-lg">
        <button class="lightbox-zoom-out p-2 rounded-full hover:bg-white/10 text-white transition-all" title="Zoom Out">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
        </button>
        <button class="lightbox-zoom-in p-2 rounded-full hover:bg-white/10 text-white transition-all" title="Zoom In">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </button>
      </div>
      <button class="close-lightbox p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all ring-offset-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:pointer-events-none">
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;

    const container = document.createElement("div");
    container.className = "w-full h-full flex items-center justify-center overflow-auto p-4 md:p-12 animate-in zoom-in-95 duration-200 cursor-grab active:cursor-grabbing";

    const svgWrapper = document.createElement("div");
    svgWrapper.className = "transition-transform duration-200 ease-out flex items-center justify-center min-w-max min-h-max";
    svgWrapper.style.transformOrigin = "center center";

    // Use the serialized SVG data to ensure a clean clone
    const svgData = new XMLSerializer().serializeToString(svgEl);
    svgWrapper.innerHTML = svgData;
    const clonedSvg = svgWrapper.querySelector("svg")!;

    // Apply styling to the new SVG
    clonedSvg.setAttribute("style", "display: block; background: white; padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5); height: auto; max-width: 90vw; max-height: 85vh;");
    container.appendChild(svgWrapper);
    overlay.appendChild(header);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Zoom Logic
    let currentScale = 1;
    const updateZoom = (delta: number) => {
      currentScale = Math.max(0.2, Math.min(5, currentScale + delta));
      svgWrapper.style.transform = `scale(${currentScale})`;
    };

    overlay.querySelector(".lightbox-zoom-in")?.addEventListener("click", (e) => {
      e.stopPropagation();
      updateZoom(0.2);
    });
    overlay.querySelector(".lightbox-zoom-out")?.addEventListener("click", (e) => {
      e.stopPropagation();
      updateZoom(-0.2);
    });

    // Mouse wheel zoom
    container.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        updateZoom(delta);
      }
    }, { passive: false });

    // Prevent scrolling behind
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeHandler = () => {
      overlay.classList.replace("fade-in", "fade-out");
      overlay.classList.add("animate-out", "duration-200");
      container.classList.replace("zoom-in-95", "zoom-out-95");
      container.classList.add("animate-out", "duration-200");

      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
          document.body.style.overflow = originalStyle;
        }
      }, 180);
    };

    overlay.querySelector(".close-lightbox")?.addEventListener("click", closeHandler);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target === container) {
        closeHandler();
      }
    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        closeHandler();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  private downloadSvg(svgEl: SVGElement) {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.triggerDownload(url, "mermaid-diagram.svg");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private downloadPng(svgEl: SVGElement) {
    // Clone and sanitize SVG for export
    const clonedSvg = svgEl.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute("style", "background-color: white;");

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Use a high scale for better quality
    const scale = 2;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 600;

    canvas.width = width * scale;
    canvas.height = height * scale;

    // Fix tainted canvas by using base64 and escaping characters
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    img.src = `data:image/svg+xml;base64,${svgBase64}`;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const pngUrl = canvas.toDataURL("image/png");
          this.triggerDownload(pngUrl, "mermaid-diagram.png");
        } catch (e) {
          console.error("Export failed:", e);
        }
      }
    };
  }

  private triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
