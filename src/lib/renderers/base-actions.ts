/**
 * Base actions and UI components for diagram renderers.
 */

export interface DiagramActionOptions {
  showZoom?: boolean;
  showDownload?: boolean;
  showFullscreen?: boolean;
  downloadOptions?: {
    svg?: boolean;
    png?: boolean;
    code?: boolean;
  };
}

export function renderActionBar(options: DiagramActionOptions = {}): string {
  const {
    showZoom = true,
    showDownload = true,
    showFullscreen = true,
    downloadOptions = { svg: true, png: true, code: true }
  } = options;

  return `
    <div class="mermaid-actions-bar absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm opacity-0 translate-y-[-4px] transition-all duration-300 mermaid-block-group-hover:opacity-100 mermaid-block-group-hover:translate-y-0 z-50">
      ${showZoom ? `
        <button class="zoom-out-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Zoom Out">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
        </button>
        <button class="zoom-in-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Zoom In">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </button>
        <div class="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
      ` : ''}
      
      ${showDownload ? `
        <div class="relative group/download">
          <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all font-sans" title="Download Options">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span class="text-xs font-semibold">下载</span>
          </button>
          
          <div class="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl py-1.5 z-[100] opacity-0 invisible group-hover/download:opacity-100 group-hover/download:visible transition-all duration-200 translate-y-1 group-hover/download:translate-y-0">
            ${downloadOptions.svg ? `
              <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-svg-btn text-left font-sans">
                <span>下载 SVG</span>
              </button>
            ` : ''}
            ${downloadOptions.png ? `
              <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-png-btn text-left font-sans">
                <span>下载 PNG</span>
              </button>
            ` : ''}
            ${downloadOptions.code ? `
              <button class="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors download-code-btn text-left font-sans">
                <span>下载代码</span>
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      ${showFullscreen ? `
        <button class="fullscreen-btn p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Full Screen">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      ` : ''}
    </div>
  `;
}

export type LightboxInitializer = (container: HTMLElement) => (() => void) | void;

export function showLightbox(content: SVGElement | LightboxInitializer) {
  let cleanup: (() => void) | void;
  // ... rest of the setup
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[999] bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200";

  const header = document.createElement("div");
  header.className = "absolute top-6 right-6 z-[1000] flex items-center gap-3";
  header.innerHTML = `
    <div class="lightbox-controls flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 p-1 mr-2 shadow-lg">
      <button class="lightbox-zoom-out p-2 rounded-full hover:bg-white/10 text-white transition-all" title="Zoom Out">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
      </button>
      <button class="lightbox-zoom-in p-2 rounded-full hover:bg-white/10 text-white transition-all" title="Zoom In">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
      </button>
    </div>
    <button class="close-lightbox p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  `;

  const container = document.createElement("div");
  container.className = "w-full h-full flex items-center justify-center overflow-auto p-4 md:p-12 animate-in zoom-in-95 duration-200 cursor-grab active:cursor-grabbing";

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "transition-transform duration-200 ease-out flex items-center justify-center min-w-max min-h-max";
  contentWrapper.style.transformOrigin = "center center";

  if (content instanceof SVGElement) {
    // Static SVG mode (Mermaid)
    const svgData = new XMLSerializer().serializeToString(content);
    contentWrapper.innerHTML = svgData;
    const clonedSvg = contentWrapper.querySelector("svg")!;
    clonedSvg.setAttribute("style", "display: block; background: white; padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,15,255,0.1); box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5); height: auto; max-width: 90vw; max-height: 85vh;");
  } else {
    // Initializer mode (Markmap)
    cleanup = content(contentWrapper);
  }

  container.appendChild(contentWrapper);
  overlay.appendChild(header);
  overlay.appendChild(container);

  // Zoom Logic
  let currentScale = 1;
  const updateZoom = (delta: number) => {
    currentScale = Math.max(0.1, Math.min(10, currentScale + delta));
    contentWrapper.style.transform = `scale(${currentScale})`;
  };

  overlay.querySelector(".lightbox-zoom-in")?.addEventListener("click", (e) => {
    e.stopPropagation();
    updateZoom(0.2);
  });
  overlay.querySelector(".lightbox-zoom-out")?.addEventListener("click", (e) => {
    e.stopPropagation();
    updateZoom(-0.2);
  });

  container.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      updateZoom(delta);
    }
  }, { passive: false });

  // Prevent scrolling
  const originalStyle = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const closeHandler = () => {
    // Call cleanup before removing or animating out to prevent SVG errors
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (e) {
        console.warn("Cleanup error:", e);
      }
    }

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
    if (e.target === overlay || e.target === container) closeHandler();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeHandler();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  document.body.appendChild(overlay);
}
