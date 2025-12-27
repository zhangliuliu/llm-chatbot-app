import type { DiagramRenderer } from "./types";
import { RendererCache } from "./types";
import { Transformer } from "markmap-lib";

export class MarkmapRenderer implements DiagramRenderer {
    languages = ["markmap", "mindmap"];
    private cache = new RendererCache();
    private transformer = new Transformer();

    async render(content: string, _key: string, isStreaming: boolean): Promise<string> {
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
        <div class="markmap-wrapper rendered markmap-container" style="min-height: 100px; padding: 10px; background: rgba(255, 255, 255, 0.95); border-radius: 8px; overflow-x: auto;">
          <svg class="markmap-svg" data-json='${escapedJson}' width="800" height="300" style="width: 100%; min-height: 300px; display: block; margin: 0 auto;"></svg>
        </div>`;

            this.cache.set(content, svgPlaceholder);
            return svgPlaceholder;
        } catch (error) {
            console.error("Markmap transform error:", error);
            if (!isStreaming) {
                return `<div class="text-red-500 text-sm p-4">Markmap transform error: ${error}</div>`;
            }
            return loadingHtml;
        }
    }

    async hydrate(element: HTMLElement, _content: string, isStreaming: boolean): Promise<void> {
        // 查找该容器内的 SVG
        const svg = element.querySelector("svg.markmap-svg") as SVGSVGElement;
        if (!svg || svg.hasAttribute("data-initialized")) return;

        // 辅助函数：等待 DOM 尺寸就绪
        const waitForDimensions = async (el: Element, retries = 5, delay = 50): Promise<boolean> => {
            if (el.clientWidth > 0 && el.clientHeight > 0) return true;
            if (retries <= 0) return false;
            await new Promise(resolve => setTimeout(resolve, delay));
            return waitForDimensions(el, retries - 1, delay);
        };

        // 在非流式模式下（即最终渲染），我们愿意多等一会儿以确保渲染成功
        // 流式模式下如果尺寸为0就跳过，等待下一次 update
        if (!isStreaming) {
            const ready = await waitForDimensions(svg);
            if (!ready) {
                console.warn("Markmap SVG has no dimensions after retries, skipping hydration.");
                return;
            }
        } else {
            if (svg.clientWidth === 0 || svg.clientHeight === 0) return;
        }

        try {
            const { Markmap } = await import("markmap-view");
            const jsonData = svg.getAttribute("data-json");
            if (!jsonData) return;

            const root = JSON.parse(jsonData);

            // Clear content (if any fallback exists)
            svg.innerHTML = "";

            const mm = Markmap.create(svg, {
                autoFit: false,
                duration: 0,
                embedGlobalCSS: true,
                zoom: false,
                pan: false,
            }, root);

            // Fit logic based on streaming state
            if (!isStreaming) {
                setTimeout(() => {
                    if (svg.clientWidth > 0 && svg.clientHeight > 0) {
                        mm.fit();
                    }
                }, 100);
            }

            svg.setAttribute("data-initialized", "true");
        } catch (error) {
            console.error("Error hydrating markmap:", error);
        }
    }
}
