<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useMarkdown } from "@/composables/useMarkdown";
import { useChatStore } from "@/stores/chat";
import { Card } from "@/components/ui/card";
import TypingIndicator from "./TypingIndicator.vue";
import type { Message } from "@/lib/db";
import mermaid from "mermaid";

const props = defineProps<{
  message: Message;
}>();

const store = useChatStore();
const { render } = useMarkdown();

interface ContentBlock {
  type: "markdown" | "mermaid" | "markmap";
  content: string;
  key: string;
  startPos: number; // Position of this block in original content
  rendered?: string; // Pre-rendered SVG for mermaid/markmap blocks
}

const contentBlocks = ref<ContentBlock[]>([]);
const mermaidRenderCache = new Map<string, string>(); // content -> svg
const markmapRenderCache = new Map<string, string>(); // content -> svg
const lastParsedLength = ref(0); // Track last parsed content position for incremental parsing

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

// Block key counter for unique keys
let blockKeyCounter = 0;

// Parse content into blocks (full parse - used for initial or reset)
const parseContentBlocks = (content: string): ContentBlock[] => {
  if (!content) return [];

  const blocks: ContentBlock[] = [];
  // Combined regex to match both mermaid and markmap blocks
  const diagramRegex = /```(mermaid|markmap)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = diagramRegex.exec(content)) !== null) {
    // Add markdown block before diagram
    if (match.index > lastIndex) {
      const mdContent = content.substring(lastIndex, match.index);
      if (mdContent.trim()) {
        blocks.push({
          type: "markdown",
          content: mdContent,
          key: `md-${blockKeyCounter++}`,
          startPos: lastIndex,
        });
      }
    }

    // Add diagram block (mermaid or markmap)
    const diagramType = match[1] as "mermaid" | "markmap";
    const diagramContent = match[2] || "";

    if (diagramType === "mermaid") {
      const cachedSvg = mermaidRenderCache.get(diagramContent);
      blocks.push({
        type: "mermaid",
        content: diagramContent,
        key: `mermaid-${blockKeyCounter++}`,
        startPos: match.index,
        rendered: cachedSvg || undefined,
      });
    } else {
      const cachedSvg = markmapRenderCache.get(diagramContent);
      blocks.push({
        type: "markmap",
        content: diagramContent,
        key: `markmap-${blockKeyCounter++}`,
        startPos: match.index,
        rendered: cachedSvg || undefined,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content
  if (lastIndex < content.length) {
    const mdContent = content.substring(lastIndex);
    if (mdContent.trim()) {
      blocks.push({
        type: "markdown",
        content: mdContent,
        key: `md-${blockKeyCounter++}`,
        startPos: lastIndex,
      });
    }
  }

  return blocks;
};

// Check if content has incomplete diagram block (has opening but no closing)
// 使用更精确的检测逻辑，避免与普通代码块混淆
const hasIncompleteDiagram = (content: string): boolean => {
  // 使用栈式解析来精确检测代码块状态
  let inCodeBlock = false;
  let inDiagramBlock = false;
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!inCodeBlock) {
      // 检查是否是 diagram 代码块开始
      if (/^```(mermaid|markmap)$/.test(trimmedLine)) {
        inCodeBlock = true;
        inDiagramBlock = true;
      }
      // 检查是否是普通代码块开始
      else if (/^```/.test(trimmedLine)) {
        inCodeBlock = true;
        inDiagramBlock = false;
      }
    } else {
      // 在代码块内，检查是否是结束标记
      if (/^```$/.test(trimmedLine)) {
        inCodeBlock = false;
        inDiagramBlock = false;
      }
    }
  }
  
  // 如果最后仍在 diagram 代码块内，说明未闭合
  return inDiagramBlock;
};

// Incremental parse - only parse new content and append to existing blocks
// 增量解析：只解析新增内容并追加到现有块
const parseContentBlocksIncremental = (
  content: string, // 完整内容
  existingBlocks: ContentBlock[], // 已解析的块列表
  lastLength: number // 上次解析的位置
): { blocks: ContentBlock[]; newLength: number } => {
  // Content got shorter (unlikely during streaming), do full parse
  // 内容变短（流式输出时不太可能），执行完整解析
  if (content.length < lastLength) {
    blockKeyCounter = 0; // Reset counter on full parse
    lastParsedLength.value = content.length;
    return {
      blocks: parseContentBlocks(content),
      newLength: content.length,
    };
  }

  // No new content - 无新内容，直接返回
  if (content.length === lastLength) {
    return { blocks: existingBlocks, newLength: lastLength };
  }

  // Get new content portion - 获取新增内容部分
  const newContent = content.substring(lastLength);

  // Check if last block was markdown and can be appended to
  // 检查最后一个块是否是 markdown，可以追加内容
  const lastBlock = existingBlocks[existingBlocks.length - 1];

  // If last block is markdown, try to append new content
  // 如果最后一块是 markdown，尝试追加新内容
  if (lastBlock && lastBlock.type === "markdown") {
    const combinedContent = lastBlock.content + newContent;
    const diagramRegex = /```(mermaid|markmap)\n([\s\S]*?)```/g;

    // Check if new content contains complete diagram blocks
    // 检查合并后的内容是否包含完整的 diagram 块
    const hasDiagram = diagramRegex.test(combinedContent);
    diagramRegex.lastIndex = 0; // Reset regex state

    if (!hasDiagram) {
      // No complete diagram in new portion, just append to last markdown block
      // 新增部分没有完整的 diagram，直接追加到最后一个 markdown 块
      const newBlocks = [...existingBlocks];
      newBlocks[newBlocks.length - 1] = {
        ...lastBlock,
        content: combinedContent,
      };
      return { blocks: newBlocks, newLength: content.length };
    }

    // Check for incomplete diagram (opening without closing)
    // 检查是否有不完整的 diagram（有开头无结尾）
    if (hasIncompleteDiagram(combinedContent)) {
      // Incomplete diagram found, append to last block without re-parsing
      // 发现不完整的 diagram，直接追加到最后一块，不重新解析
      const newBlocks = [...existingBlocks];
      newBlocks[newBlocks.length - 1] = {
        ...lastBlock,
        content: combinedContent,
      };
      return { blocks: newBlocks, newLength: content.length };
    }

    // Complete diagram found, need to re-parse from the startPos of the last markdown block
    // 发现完整的 diagram，需要从最后一个 markdown 块的起始位置重新解析
    const reparseFrom = content.substring(lastBlock.startPos);
    const newParsedBlocks = parseContentBlocks(reparseFrom);

    // Adjust start positions for new blocks
    // 调整新块的起始位置
    const adjustedBlocks = newParsedBlocks.map((b) => ({
      ...b,
      key: `block-${blockKeyCounter++}`, // Generate unique keys - 生成唯一键值
      startPos: b.startPos + lastBlock.startPos, // Adjust position - 调整位置
    }));

    // Replace last block with new parsed blocks
    // 用新解析的块替换最后一个块
    const newBlocks = [...existingBlocks.slice(0, -1), ...adjustedBlocks];
    return { blocks: newBlocks, newLength: content.length };
  }

  // Append new content as markdown block (will be split in next update if contains diagram)
  // 新增内容作为 markdown 块追加（如果包含 diagram，下次更新时会自动分割）
  const newBlocks = [...existingBlocks];
  newBlocks.push({
    type: "markdown",
    content: newContent,
    key: `block-${blockKeyCounter++}`,
    startPos: lastLength,
  });
  return { blocks: newBlocks, newLength: content.length };
};

// Render Mermaid blocks that haven't been rendered yet
const renderPendingMermaid = async () => {
  let hasNewRender = false;

  for (const block of contentBlocks.value) {
    if (block.type === "mermaid" && !block.rendered && block.content.trim()) {
      try {
        // Check syntax first
        await mermaid.parse(block.content);

        // Render
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, block.content);

        // Cache the result
        mermaidRenderCache.set(block.content, svg);
        block.rendered = svg;
        hasNewRender = true;
      } catch (error) {
        // Syntax error or incomplete - will retry later
        if (!store.isStreaming) {
          // If not streaming, mark as error
          block.rendered = `<div class="text-red-500 text-sm p-4">Mermaid syntax error</div>`;
        }
      }
    }
  }

  return hasNewRender;
};

// Render Markmap blocks that haven't been rendered yet
// Two-step approach: 1) Transform to JSON, 2) Render in DOM
const renderPendingMarkmap = async () => {
  let hasNewRender = false;

  for (const block of contentBlocks.value) {
    if (block.type === "markmap" && !block.rendered && block.content.trim()) {
      // Check if we have a cached version
      const cached = markmapRenderCache.get(block.content);
      if (cached) {
        block.rendered = cached;
        hasNewRender = true;
        continue;
      }

      try {
        // Step 1: Transform markdown to markmap data structure
        const { Transformer } = await import("markmap-lib");
        const transformer = new Transformer();
        const { root } = transformer.transform(block.content);

        // Step 2: Create SVG placeholder with data embedded
        const jsonData = JSON.stringify(root);
        const escapedJson = jsonData.replace(/'/g, "&#39;"); // Escape single quotes for HTML attribute
        
        // Generate SVG placeholder that will be rendered client-side
        const svgPlaceholder = `<svg class="markmap-svg" data-markmap-id="${block.key}" data-json='${escapedJson}' style="width: 100%; min-height: 300px;"></svg>`;

        // Cache and set result
        markmapRenderCache.set(block.content, svgPlaceholder);
        block.rendered = svgPlaceholder;
        hasNewRender = true;
      } catch (error) {
        console.error("Markmap transform error:", error);
        if (!store.isStreaming) {
          block.rendered = `<div class="text-red-500 text-sm p-4">Markmap transform error: ${error}</div>`;
        }
      }
    }
  }

  // Step 3: After DOM updates, find and render all markmap SVGs
  if (hasNewRender) {
    await nextTick();
    await renderMarkmapSVGs();
  }

  return hasNewRender;
};

// Find and render markmap SVGs in the DOM
const renderMarkmapSVGs = async () => {
  try {
    const { Markmap } = await import("markmap-view");
    
    // Find all markmap SVG elements that haven't been initialized
    const svgElements = document.querySelectorAll('svg.markmap-svg[data-json]:not([data-initialized])');
    
    for (const svgEl of Array.from(svgElements)) {
      const svg = svgEl as SVGSVGElement;
      const jsonData = svg.getAttribute('data-json');
      
      if (!jsonData) continue;
      
      try {
        const root = JSON.parse(jsonData);
        
        // Clear any existing content
        svg.innerHTML = '';
        
        // Create markmap instance
        Markmap.create(svg, {
          autoFit: true,
          duration: 0, // No animation for static feel
          embedGlobalCSS: true,
          zoom: false, // Disable zoom
          pan: false, // Disable pan
        }, root);
        
        // Mark as initialized to avoid re-rendering
        svg.setAttribute('data-initialized', 'true');
      } catch (error) {
        console.error('Error rendering markmap:', error);
      }
    }
  } catch (error) {
    console.error('Error loading markmap-view:', error);
  }
};


// Throttled update for streaming
const throttledUpdate = useThrottleFn(async (content: string) => {
  const { blocks, newLength } = parseContentBlocksIncremental(
    content,
    contentBlocks.value,
    lastParsedLength.value
  );
  contentBlocks.value = blocks;
  lastParsedLength.value = newLength;
  await nextTick();
  await renderPendingMermaid();
  await renderPendingMarkmap();
}, 100);

const updateContent = async (content: string) => {
  if (!content) {
    contentBlocks.value = [];
    lastParsedLength.value = 0;
    return;
  }
  await throttledUpdate(content);
};

// Watch content changes
watch(
  [() => props.message.content, () => store.isStreaming],
  async ([content, isStreaming]) => {
    if (isStreaming && props.message.role === "assistant") {
      await updateContent(content || "");
    } else {
      // Final render when streaming completes - do full parse
      blockKeyCounter = 0; // Reset counter on final render
      contentBlocks.value = parseContentBlocks(content || "");
      lastParsedLength.value = (content || "").length;
      await nextTick();
      await renderPendingMermaid();
      await renderPendingMarkmap();
    }
  },
  { immediate: true }
);
</script>

<template>
  <Card
    class="overflow-hidden w-fit"
    :class="
      props.message.role === 'user'
        ? 'bg-secondary text-secondary-foreground border-none rounded-2xl px-4 py-3 shadow-none'
        : 'bg-transparent border-none shadow-none w-full min-w-0'
    "
  >
    <!-- Main Content -->
    <div
      v-if="props.message.role === 'user'"
      class="whitespace-pre-wrap text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word"
    >
      {{ props.message.content }}
    </div>
    <div v-else class="relative">
      <TypingIndicator
        v-if="
          !props.message.content &&
          store.isStreaming &&
          store.messages[store.messages.length - 1]?.id === props.message.id
        "
        class="py-3"
      />
      <div
        v-else
        class="markdown-body text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word"
        :class="{
          'is-streaming':
            store.isStreaming &&
            store.messages[store.messages.length - 1]?.id === props.message.id,
          'is-complete': !(
            store.isStreaming &&
            store.messages[store.messages.length - 1]?.id === props.message.id
          ),
        }"
        @click="$emit('copyCode', $event)"
      >
        <!-- Render blocks separately -->
        <template v-for="block in contentBlocks" :key="block.key">
          <!-- Markdown block -->
          <div
            v-if="block.type === 'markdown'"
            v-html="render(block.content)"
          ></div>

          <!-- Mermaid block -->
          <div
            v-else-if="block.type === 'mermaid'"
            class="mermaid-container my-4"
          >
            <div
              v-if="block.rendered"
              class="mermaid-wrapper rendered"
              v-html="block.rendered"
            ></div>
            <div v-else class="mermaid-wrapper loading">
              <div
                class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm"
              >
                <div
                  class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5"
                >
                  <span
                    class="text-xs font-medium text-zinc-400 select-none font-mono lowercase"
                    >mermaid (rendering...)</span
                  >
                </div>
                <pre
                  class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"
                ><code class="font-mono! text-sm bg-transparent! p-0! border-none!">{{ block.content }}</code></pre>
              </div>
            </div>
          </div>

          <!-- Markmap block -->
          <div
            v-else-if="block.type === 'markmap'"
            class="markmap-container my-4"
          >
            <!-- Rendered markmap -->
            <div
              v-if="block.rendered"
              class="markmap-wrapper rendered"
              v-html="block.rendered"
            ></div>
            <!-- Loading state -->
            <div v-else class="markmap-wrapper loading">
              <div
                class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm"
              >
                <div
                  class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5"
                >
                  <span
                    class="text-xs font-medium text-zinc-400 select-none font-mono lowercase"
                    >markmap (rendering...)</span
                  >
                </div>
                <pre
                  class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"
                ><code class="font-mono! text-sm bg-transparent! p-0! border-none!">{{ block.content }}</code></pre>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Card>
</template>

<style>
/* Markdown Styles Scoped via deeply selection or global css */
.markdown-body {
  line-height: 1.75;
}

/* Only apply render optimization to completed messages to avoid jitter during streaming */
.markdown-body.is-complete {
  content-visibility: auto;
  contain-intrinsic-size: 1px 100px;
}

.markdown-body p {
  margin-bottom: 1.25em;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  color: var(--foreground);
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

.markdown-body h1 {
  font-size: 1.875rem;
}

.markdown-body h2 {
  font-size: 1.5rem;
}

.markdown-body h3 {
  font-size: 1.25rem;
}

.markdown-body h4 {
  font-size: 1.125rem;
}

.markdown-body h5 {
  font-size: 1rem;
}

.markdown-body h6 {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.markdown-body hr {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid var(--border);
  opacity: 0.6;
}

/* Remove margin from the first element */
.markdown-body > *:first-child {
  margin-top: 0 !important;
}

/* Remove margin from the last element to fix bubble spacing */
.markdown-body > *:last-child {
  margin-bottom: 0 !important;
}

/* Cursor effect for streaming */
.markdown-body.is-streaming > *:last-child::after {
  content: "";
  display: inline-block;
  width: 0.5em;
  height: 1em;
  background-color: var(--primary, currentColor);
  margin-left: 0.15em;
  vertical-align: middle;
  animation: blink 0.8s step-end infinite;
  line-height: 1;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.markdown-body ul,
.markdown-body ol {
  margin-left: 1.5em;
  margin-bottom: 1.25em;
  list-style: disc;
}

.markdown-body li {
  margin-bottom: 0.5em;
}

.markdown-body ol {
  list-style: decimal;
}

.markdown-body pre {
  margin-bottom: 1.25em;
  border-radius: 0.75rem;
  overflow-x: auto;
  background-color: #1e1e1e;
  /* Slightly darker for code blocks */
  color: #d4d4d4;
  padding: 1.25em;
}

.markdown-body code {
  background-color: var(--muted);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.markdown-body pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.9em;
  line-height: 1.6;
}

.markdown-body blockquote {
  padding-left: 1em;
  border-left: 4px solid var(--border);
  color: var(--muted-foreground);
  margin: 1.5em 0;
  font-style: italic;
}

.markdown-body table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 1.25em;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.markdown-body th,
.markdown-body td {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0.75em 1em;
  text-align: left;
}

.markdown-body th:last-child,
.markdown-body td:last-child {
  border-right: none;
}

.markdown-body tr:last-child td {
  border-bottom: none;
}

.markdown-body th {
  background-color: var(--muted);
  font-weight: 600;
}

/* User Bubble Specific Overrides */
.bg-secondary {
  min-width: 44px;
  /* Ensure small messages like emoji or 1-2 chars look good */
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .bg-secondary {
    min-width: 32px;
  }
}

/* Image styles */
.markdown-body img {
  max-width: 70%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.markdown-body p > img:only-child,
.markdown-body p > a:only-child > img:only-child {
  margin: 0;
}

/* Mermaid Styles */
.mermaid-container {
  margin: 1rem 0;
}

.mermaid-wrapper {
  background: rgba(255, 255, 255, 0.03);
  padding: 1.25rem;
  border-radius: 0.75rem;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.mermaid-wrapper.loading {
  transition: all 0.3s ease;
}

.mermaid-wrapper.rendered {
  /* Static wrapper for rendered diagrams - no transitions */
  background: rgba(255, 255, 255, 0.03);
}

.mermaid-wrapper.rendered svg {
  max-width: 100%;
  height: auto;
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  opacity: 1;
  animation: mermaidFadeIn 0.4s ease-in-out;
}

@keyframes mermaidFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 适配暗色模式 */
.dark .mermaid-wrapper.rendered svg {
  filter: invert(0.9) hue-rotate(180deg);
}

/* Markmap Styles */
.markmap-container {
  margin: 1rem 0;
}

.markmap-wrapper {
  background: rgba(255, 255, 255, 0.03);
  padding: 1.25rem;
  border-radius: 0.75rem;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.markmap-wrapper.loading {
  transition: all 0.3s ease;
  min-height: 100px;
}

.markmap-wrapper.rendered {
  /* Wrapper for rendered diagrams */
  background: rgba(255, 255, 255, 0.98);
  overflow-x: auto;
}

.markmap-wrapper.rendered svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  opacity: 1;
  animation: markmapFadeIn 0.4s ease-in-out;
  pointer-events: none; /* Disable all interactions */
}

@keyframes markmapFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode - use light background for markmap since it has colored elements */
.dark .markmap-wrapper.rendered {
  background: rgba(255, 255, 255, 0.95);
}
</style>
