import MarkdownIt from "markdown-it";
// 1. 优化：引入核心库而非全量包
import hljs from "highlight.js/lib/core";
import markdownItHighlightjs from "markdown-it-highlightjs";
// 这里根据需要引入你常用的语言
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml"; // 包含 html
import markdown from "highlight.js/lib/languages/markdown";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";

import markdownItKatex from "markdown-it-katex";
import DOMPurify from "dompurify";

// 注册语言
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("css", css);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);

// import { markmapPlugin } from "@/plugins/markdown-it-markmap";

export function useMarkdown() {
  const md: MarkdownIt = new MarkdownIt({
    html: true, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />).
    breaks: true, // Convert '\n' in paragraphs to <br>
    linkify: true, // Autoconvert URL-like text to links
    typographer: true,
  });

  // Plugins
  // 2. 优化：使用插件并开启行内代码高亮
  // 传入我们自定义注册过的 hljs 实例
  md.use(markdownItHighlightjs, {
    hljs,
    inline: true, // 开启行内代码高亮支持
    auto: true, // 自动检测语言
  });
  md.use(markdownItKatex);

  // 3. 媒体链接识别逻辑
  const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?.*)?$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|webm|ogv|mov|mkv)(\?.*)?$/i.test(url);

  // 自定义链接渲染逻辑
  const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  const defaultLinkClose = md.renderer.rules.link_close || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token) return defaultLinkOpen(tokens, idx, options, env, self);

    const href = token.attrGet("href") || "";

    // 1. 强制所有链接在新标签页打开
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");

    // 2. 检查是否是媒体文件
    const mediaType = isAudio(href) ? "audio" : isVideo(href) ? "video" : null;

    if (mediaType) {
      // 检查是否是独立一行（Standalone）
      // 在 markdown-it 的渲染规则中，对于 inline token 的子 token，tokens 参数就是 children 数组
      const children = tokens;
      const meaningfulChildren = children.filter(
        (c) => !(c.type === "text" && !c.content.trim()) && c.type !== "softbreak"
      );

      const isStandalone =
        meaningfulChildren.length === 3 &&
        meaningfulChildren[0]?.type === "link_open" &&
        meaningfulChildren[2]?.type === "link_close" &&
        meaningfulChildren[0] === token;

      if (isStandalone) {
        // Standalone 模式现在交由 MessageContent.vue 的 Block 解析器处理
        // 这里仅作降级处理，标记一下，避免重复渲染
        token.attrSet("data-media-standalone", "true");
        // 为了防止闪烁，渲染时我们让它保持为普通链接，MessageContent 会将其包装为 Block
      } else {
        // 内联模式：添加特殊类名用于点击拦截
        token.attrSet("class", (token.attrGet("class") || "") + ` media-link-inline media-type-${mediaType}`);
        token.attrSet("data-href", href);
        token.attrSet("data-type", mediaType);
        const icon = mediaType === "audio" ? "🎵" : "📺";
        return `<span class="inline-flex items-center gap-1">${icon}${defaultLinkOpen(
          tokens,
          idx,
          options,
          env,
          self
        )}`;
      }
    }

    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
    // 找到对应的 link_open
    let isMediaInline = false;
    for (let i = idx - 1; i >= 0; i--) {
      const t = tokens[i];
      if (t && t.type === "link_open") {
        isMediaInline = (t.attrGet("class") || "").includes("media-link-inline");
        break;
      }
    }

    if (isMediaInline) {
      return `${defaultLinkClose(tokens, idx, options, env, self)}</span>`;
    }
    return defaultLinkClose(tokens, idx, options, env, self);
  };

  // 4. 优化：保留自定义 UI，但利用 hljs 实例逻辑
  md.renderer.rules.fence = (tokens, idx, _options, _env, _slf) => {
    const token = tokens[idx];
    if (!token) return "";

    const info = token.info ? md.utils.unescapeAll(token.info).trim() : "";
    const lang = info.split(/\s+/g)[0] || "";

    const content = token.content;

    // 获取高亮代码
    let highlighted = "";
    let language = lang || "text";

    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(content, {
          language: lang,
          ignoreIllegals: true,
        }).value;
      } catch (__) {
        highlighted = md.utils.escapeHtml(content);
      }
    } else {
      try {
        const result = hljs.highlightAuto(content);
        highlighted = result.value;
        if (result.language && !lang) language = result.language;
      } catch (__) {
        highlighted = md.utils.escapeHtml(content);
      }
    }

    // 返回标准漂亮的 UI
    return `<div class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm">
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5">
        <span class="text-xs font-medium text-zinc-400 select-none font-mono lowercase">${language}</span>
        <button class="copy-btn flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors focus:outline-none">
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" /></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"><code class="language-${language} !font-mono text-sm !bg-transparent !p-0 !border-none">${highlighted}</code></pre>
    </div>`;
  };

  function render(content: string) {
    if (!content) return "";
    try {
      const env = {
        sourceLines: content.split("\n"),
      };
      const rawHtml = md.render(content, env);
      return DOMPurify.sanitize(rawHtml, {
        // 确保允许你的自定义 UI 标签和属性
        ADD_TAGS: [
          "button",
          "svg",
          "path",
          "use",
          "span",
          "img",
          "div",
          "pre",
          "code",
          "g",
          "circle",
          "rect",
          "line",
          "text",
          "style",
          "foreignObject",
          "audio",
          "video",
          "source",
        ],
        ADD_ATTR: [
          "xmlns",
          "fill",
          "viewBox",
          "stroke",
          "stroke-width",
          "stroke-linecap",
          "stroke-linejoin",
          "d",
          "class",
          "id",
          "x1",
          "y1",
          "x2",
          "y2",
          "x",
          "y",
          "width",
          "height",
          "r",
          "fill-opacity",
          "stroke-opacity",
          "transform",
          "style",
          "points",
          "rx",
          "ry",
          "dx",
          "dy",
          "text-anchor",
          "marker-end",
          "marker-start",
          // Image attributes
          "src",
          "alt",
          "width",
          "height",
          "loading",
          // Media attributes
          "controls",
          "preload",
          "autoplay",
          "muted",
          "loop",
          "type",
          // General attributes
          "target",
          "rel",
          "data-href",
          "data-type",
          // Mermaid attributes
          "data-processed",
          "data-content",
          // Markmap attributes
          "data-depth",
          "data-path",
          "data-json",
        ],
        FORBID_TAGS: ["script"], // 移除 style 的禁用，因为 Mermaid SVG 经常包含内联 style
        FORBID_ATTR: ["onerror", "onclick"],
      });
    } catch (err) {
      console.error("Markdown render error:", err);
      return DOMPurify.sanitize(content);
    }
  }

  return {
    render,
  };
}
