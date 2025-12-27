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

      const renderedHtml = `<div class="mermaid-wrapper rendered">${svg}</div>`;
      this.cache.set(content, renderedHtml);
      return renderedHtml;
    } catch (error) {
      if (!isStreaming) {
        return `<div class="text-red-500 text-sm p-4">Mermaid syntax error</div>`;
      }
      return loadingHtml;
    }
  }

  // Mermaid 是直接生成 SVG 字符串的，不需要额外的 hydration 步骤（除了可能的交互绑定）
  // 但为了统一接口，我们保留这个方法
  async hydrate(_element: HTMLElement, _content: string, _isStreaming: boolean): Promise<void> {
    // No-op for mermaid as it's pre-rendered strings
  }
}
