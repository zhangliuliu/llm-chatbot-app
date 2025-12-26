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
  type: 'markdown' | 'mermaid';
  content: string;
  key: string;
  rendered?: string; // Pre-rendered SVG for mermaid blocks
}

const contentBlocks = ref<ContentBlock[]>([]);
const mermaidRenderCache = new Map<string, string>(); // content -> svg

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

// Parse content into blocks
const parseContentBlocks = (content: string): ContentBlock[] => {
  if (!content) return [];

  const blocks: ContentBlock[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let blockIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add markdown block before mermaid
    if (match.index > lastIndex) {
      const mdContent = content.substring(lastIndex, match.index);
      if (mdContent.trim()) {
        blocks.push({
          type: 'markdown',
          content: mdContent,
          key: `md-${blockIndex++}`,
        });
      }
    }

    // Add mermaid block
    const mermaidContent = match[1] || "";
    const cachedSvg = mermaidRenderCache.get(mermaidContent);
    blocks.push({
      type: 'mermaid',
      content: mermaidContent,
      key: `mermaid-${blockIndex++}`,
      rendered: cachedSvg || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content
  if (lastIndex < content.length) {
    const mdContent = content.substring(lastIndex);
    if (mdContent.trim()) {
      blocks.push({
        type: 'markdown',
        content: mdContent,
        key: `md-${blockIndex++}`,
      });
    }
  }

  return blocks;
};

// Render Mermaid blocks that haven't been rendered yet
const renderPendingMermaid = async () => {
  let hasNewRender = false;

  for (const block of contentBlocks.value) {
    if (block.type === 'mermaid' && !block.rendered && block.content.trim()) {
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

// Throttled update for streaming
const throttledUpdate = useThrottleFn(async (content: string) => {
  contentBlocks.value = parseContentBlocks(content);
  await nextTick();
  await renderPendingMermaid();
}, 80);

const updateContent = async (content: string) => {
  if (!content) {
    contentBlocks.value = [];
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
      // Final render when streaming completes
      contentBlocks.value = parseContentBlocks(content || "");
      await nextTick();
      await renderPendingMermaid();
    }
  },
  { immediate: true }
);
</script>

<template>
  <Card class="overflow-hidden w-fit" :class="props.message.role === 'user'
    ? 'bg-secondary text-secondary-foreground border-none rounded-2xl px-4 py-3 shadow-none'
    : 'bg-transparent border-none shadow-none w-full min-w-0'
    ">
    <!-- Main Content -->
    <div v-if="props.message.role === 'user'"
      class="whitespace-pre-wrap text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word">
      {{ props.message.content }}
    </div>
    <div v-else class="relative">
      <TypingIndicator v-if="
        !props.message.content &&
        store.isStreaming &&
        store.messages[store.messages.length - 1]?.id === props.message.id
      " class="py-3" />
      <div v-else class="markdown-body text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word" :class="{
        'is-streaming':
          store.isStreaming &&
          store.messages[store.messages.length - 1]?.id === props.message.id,
        'is-complete': !(
          store.isStreaming &&
          store.messages[store.messages.length - 1]?.id === props.message.id
        ),
      }" @click="$emit('copyCode', $event)">
        <!-- Render blocks separately -->
        <template v-for="block in contentBlocks" :key="block.key">
          <!-- Markdown block -->
          <div v-if="block.type === 'markdown'" v-html="render(block.content)"></div>

          <!-- Mermaid block -->
          <div v-else-if="block.type === 'mermaid'" class="mermaid-container my-4">
            <div v-if="block.rendered" class="mermaid-wrapper rendered" v-html="block.rendered">
            </div>
            <div v-else class="mermaid-wrapper loading">
              <div class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm">
                <div class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5">
                  <span class="text-xs font-medium text-zinc-400 select-none font-mono lowercase">mermaid
                    (rendering...)</span>
                </div>
                <pre
                  class="hljs my-0! p-3! bg-transparent! rounded-none! overflow-x-auto"><code class="!font-mono text-sm !bg-transparent !p-0 !border-none">{{ block.content }}</code></pre>
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
.markdown-body>*:first-child {
  margin-top: 0 !important;
}

/* Remove margin from the last element to fix bubble spacing */
.markdown-body>*:last-child {
  margin-bottom: 0 !important;
}

/* Cursor effect for streaming */
.markdown-body.is-streaming>*:last-child::after {
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

.markdown-body p>img:only-child,
.markdown-body p>a:only-child>img:only-child {
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
</style>
