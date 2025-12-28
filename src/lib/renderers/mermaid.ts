import mermaid from "mermaid";
import type { DiagramRenderer } from "./types";
import { RendererCache } from "./types";
import { renderActionBar, showLightbox } from "./base-actions";
import { downloadPng, downloadSvg, triggerDownload } from "../utils/diagram-export";

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
  private lastGoodHtml = new Map<string, string>(); // Stable identity cache for streaming

  async render(content: string, key: string, isStreaming: boolean): Promise<string> {
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

      // 生成稳定 ID (基于传入的 key)
      const id = `mermaid-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;

      // 生成 SVG
      const { svg } = await mermaid.render(id, content);

      const renderedHtml = `
        <div class="mermaid-block-container relative mermaid-block-group bg-white/50 dark:bg-zinc-900/50 transition-all duration-300 z-[1] min-h-[80px]">
          <div class="mermaid-wrapper-outer overflow-auto p-0 flex justify-center items-center rounded-xl border border-zinc-200 dark:border-zinc-800">
             <div class="mermaid-wrapper rendered transition-transform duration-200 ease-out" style="transform: scale(1); transform-origin: center center;">${svg}</div>
          </div>
          ${renderActionBar({
        downloadOptions: { svg: true, png: true, code: true }
      })}
        </div>`;

      this.cache.set(content, renderedHtml);
      this.lastGoodHtml.set(key, renderedHtml); // 更新最后一次成功的渲染
      return renderedHtml;
    } catch (error) {
      if (isStreaming) {
        // 如果正在流式输出且语法错误，优先返回最后一次成功的渲染，否则显示加载状态
        return this.lastGoodHtml.get(key) || loadingHtml;
      }
      return `<div class="text-red-500 text-sm p-4">Mermaid syntax error</div>`;
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
      currentScale = Math.max(0.2, Math.min(3, currentScale + delta));
      wrapper.style.transform = `scale(${currentScale})`;
    };

    zoomInBtn?.addEventListener("click", () => updateZoom(0.2));
    zoomOutBtn?.addEventListener("click", () => updateZoom(-0.2));

    // Fullscreen Logic
    fullBtn?.addEventListener("click", () => {
      showLightbox(svgEl);
    });

    // Download Actions
    if (codeBtn) {
      codeBtn.addEventListener("click", () => {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, "diagram.mermaid");
        URL.revokeObjectURL(url);
      });
    }

    if (svgBtn && svgEl) {
      svgBtn.addEventListener("click", () => downloadSvg(svgEl));
    }

    if (pngBtn && svgEl) {
      pngBtn.addEventListener("click", () => downloadPng(svgEl));
    }
  }
}
