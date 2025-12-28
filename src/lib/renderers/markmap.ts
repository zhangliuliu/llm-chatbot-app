import type { DiagramRenderer } from "./types";
import { RendererCache } from "./types";
import { Transformer } from "markmap-lib";
import { renderActionBar, showLightbox } from "./base-actions";
import { downloadPng, triggerDownload } from "../utils/diagram-export";

export class MarkmapRenderer implements DiagramRenderer {
    languages = ["markmap", "mindmap"];
    private cache = new RendererCache();
    private lastGoodHtml = new Map<string, string>();
    private transformer = new Transformer();

    async render(content: string, key: string, isStreaming: boolean): Promise<string> {
        const cached = this.cache.get(content);
        if (cached) return cached;

        // Loading HTML
        const loadingHtml = `
      <div class="markmap-wrapper loading">
        <div class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm">
          <div class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5">
            <span class="text-xs font-medium text-zinc-400 select-none font-mono lowercase">markmap (rendering...)</span>
          </div>
          <pre class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"><code class="font-mono! text-sm bg-transparent! p-0! border-none!">${content}</code></pre>
        </div>
      </div>`;

        if (!content.trim()) return '<div class="empty-diagram"></div>';

        try {
            // Step 1: Transform markdown to markmap data
            const { root } = this.transformer.transform(content);
            const jsonData = JSON.stringify(root);
            const escapedJson = jsonData.replace(/'/g, "&#39;");

            // Step 2: Create SVG placeholder
            const svgPlaceholder = `
        <div class="markmap-block-container relative markmap-block-group bg-white/50 dark:bg-zinc-900/50 transition-all duration-300 z-[1] min-h-[80px]">
          <div class="markmap-wrapper-outer overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
             <div class="markmap-wrapper rendered transition-transform duration-200 ease-out" style="background: white;">
                <svg class="markmap-svg" data-json='${escapedJson}' style="width: 100%; min-height: 300px; display: block;"></svg>
             </div>
          </div>
          ${renderActionBar({
                downloadOptions: { svg: false, png: true, code: true }
            })}
        </div>`;

            this.cache.set(content, svgPlaceholder);
            this.lastGoodHtml.set(key, svgPlaceholder);
            return svgPlaceholder;
        } catch (error) {
            console.error("Markmap transform error:", error);
            if (isStreaming) {
                return this.lastGoodHtml.get(key) || loadingHtml;
            }
            return `<div class="text-red-500 text-sm p-4">Markmap transform error: ${error}</div>`;
        }
    }

    async hydrate(element: HTMLElement, content: string, isStreaming: boolean): Promise<void> {
        const svg = element.querySelector("svg.markmap-svg") as SVGSVGElement;
        if (!svg || svg.hasAttribute("data-initialized")) return;

        const zoomInBtn = element.querySelector(".zoom-in-btn");
        const zoomOutBtn = element.querySelector(".zoom-out-btn");
        const fullBtn = element.querySelector(".fullscreen-btn");
        const pngBtn = element.querySelector(".download-png-btn");
        const codeBtn = element.querySelector(".download-code-btn");

        try {
            const { Markmap } = await import("markmap-view");
            const jsonData = svg.getAttribute("data-json");
            if (!jsonData) return;

            const root = JSON.parse(jsonData);

            // Clear content
            svg.innerHTML = "";

            const mm = Markmap.create(svg, {
                autoFit: true,
                duration: 500,
                embedGlobalCSS: true,
            }, root);

            // Bind Zoom Buttons
            zoomInBtn?.addEventListener("click", () => {
                mm.rescale(1.2);
            });
            zoomOutBtn?.addEventListener("click", () => {
                mm.rescale(0.8);
            });

            // Fullscreen Logic (Preserve State)
            fullBtn?.addEventListener("click", () => {
                showLightbox((container) => {
                    container.className = "w-full h-full p-0 overflow-hidden bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-200";
                    const fsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    fsSvg.setAttribute("class", "w-full h-full");
                    container.appendChild(fsSvg);

                    const fsMm = Markmap.create(fsSvg, {
                        ...mm.options,
                        autoFit: true,
                    }, mm.state.data);

                    // Sync initial state roughly or just fit
                    setTimeout(() => fsMm.fit(), 50);

                    return () => fsMm.destroy();
                });
            });

            // Download Logic
            pngBtn?.addEventListener("click", () => {
                downloadPng(svg, "mindmap.png");
            });

            codeBtn?.addEventListener("click", () => {
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, "mindmap.md");
                URL.revokeObjectURL(url);
            });

            if (!isStreaming) {
                setTimeout(() => mm.fit(), 200);
            }

            svg.setAttribute("data-initialized", "true");
        } catch (error) {
            console.error("Error hydrating markmap:", error);
        }
    }
}
