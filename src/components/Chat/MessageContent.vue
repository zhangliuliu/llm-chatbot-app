<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useMarkdown } from "@/composables/useMarkdown";
import { useChatStore } from "@/stores/chat";
import { Card } from "@/components/ui/card";
import TypingIndicator from "./TypingIndicator.vue";
import type { Message } from "@/lib/db";
import { getSupportedLanguages, getRenderer } from "@/lib/renderers";

const props = defineProps<{
  message: Message;
}>();

const store = useChatStore();
const { render } = useMarkdown();

interface ContentBlock {
  type: "markdown" | "custom";
  language?: string; // For custom blocks
  content: string;
  key: string;
  startPos: number; // Position of this block in original content
  rendered?: string; // Pre-rendered HTML
}

const contentBlocks = ref<ContentBlock[]>([]);
const lastParsedLength = ref(0);

// Block key counter for unique keys
let blockKeyCounter = 0;

// Parse content into blocks (full parse)
const parseContentBlocks = (content: string): ContentBlock[] => {
  if (!content) return [];

  const blocks: ContentBlock[] = [];
  const supportedLangs = getSupportedLanguages();
  
  // Construct regex dynamically: /```(mermaid|markmap)\n([\s\S]*?)```/g
  const pattern = `\`\`\`(${supportedLangs.join("|")})\\n([\\s\\S]*?)\`\`\``;
  const diagramRegex = new RegExp(pattern, "g");
  
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
          key: `${props.message.id}-md-${blockKeyCounter++}`,
          startPos: lastIndex,
        });
      }
    }

    // Add custom diagram block
    const lang = match[1] || "";
    const itemContent = match[2] || "";
    const renderer = getRenderer(lang);

    if (renderer) {
      blocks.push({
        type: "custom",
        language: lang,
        content: itemContent,
        key: `${props.message.id}-${lang}-${blockKeyCounter++}`,
        startPos: match.index,
        rendered: undefined, 
      });
    } else {
        // Fallback to markdown if renderer not found (shouldn't happen due to regex)
        blocks.push({
          type: "markdown",
          content: match[0],
          key: `${props.message.id}-md-${blockKeyCounter++}`,
          startPos: match.index,
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
        key: `${props.message.id}-md-${blockKeyCounter++}`,
        startPos: lastIndex,
      });
    }
  }

  return blocks;
};

// Check if content has incomplete diagram block
const hasIncompleteDiagram = (content: string): boolean => {
  let inCodeBlock = false;
  let inDiagramBlock = false;
  const lines = content.split('\n');
  const supportedLangs = getSupportedLanguages();
  const startRegex = new RegExp(`^\`\`\`(${supportedLangs.join("|")})$`);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!inCodeBlock) {
      if (startRegex.test(trimmedLine)) {
        inCodeBlock = true;
        inDiagramBlock = true;
      } else if (/^```/.test(trimmedLine)) {
        inCodeBlock = true;
        inDiagramBlock = false;
      }
    } else {
      if (/^```$/.test(trimmedLine)) {
        inCodeBlock = false;
        inDiagramBlock = false;
      }
    }
  }
  
  return inDiagramBlock;
};

// Incremental parse
const parseContentBlocksIncremental = (
  content: string,
  existingBlocks: ContentBlock[],
  lastLength: number
): { blocks: ContentBlock[]; newLength: number } => {
  if (content.length < lastLength) {
    blockKeyCounter = 0;
    lastParsedLength.value = content.length;
    return {
      blocks: parseContentBlocks(content),
      newLength: content.length,
    };
  }

  if (content.length === lastLength) {
    return { blocks: existingBlocks, newLength: lastLength };
  }

  const newContent = content.substring(lastLength);
  const lastBlock = existingBlocks[existingBlocks.length - 1];

  if (lastBlock && lastBlock.type === "markdown") {
    const combinedContent = lastBlock.content + newContent;
    
    const supportedLangs = getSupportedLanguages();
    const pattern = `\`\`\`(${supportedLangs.join("|")})\\n([\\s\\S]*?)\`\`\``;
    const diagramRegex = new RegExp(pattern, "g");

    const hasDiagram = diagramRegex.test(combinedContent);
    diagramRegex.lastIndex = 0;

    if (!hasDiagram) {
      const newBlocks = [...existingBlocks];
      newBlocks[newBlocks.length - 1] = {
        ...lastBlock,
        content: combinedContent,
      };
      return { blocks: newBlocks, newLength: content.length };
    }

    if (hasIncompleteDiagram(combinedContent)) {
      const newBlocks = [...existingBlocks];
      newBlocks[newBlocks.length - 1] = {
        ...lastBlock,
        content: combinedContent,
      };
      return { blocks: newBlocks, newLength: content.length };
    }

    const reparseFrom = content.substring(lastBlock.startPos);
    const newParsedBlocks = parseContentBlocks(reparseFrom);

    const adjustedBlocks = newParsedBlocks.map((b) => ({
      ...b,
      key: `${props.message.id}-block-${blockKeyCounter++}`,
      startPos: b.startPos + lastBlock.startPos,
    }));

    const newBlocks = [...existingBlocks.slice(0, -1), ...adjustedBlocks];
    return { blocks: newBlocks, newLength: content.length };
  }

  const newBlocks = [...existingBlocks];
  newBlocks.push({
    type: "markdown",
    content: newContent,
    key: `${props.message.id}-block-${blockKeyCounter++}`,
    startPos: lastLength,
  });
  return { blocks: newBlocks, newLength: content.length };
};

// Render custom blocks (HTML)
const renderCustomBlocks = async (isStreaming: boolean) => {
  let hasNewRender = false;

  for (const block of contentBlocks.value) {
    if (block.type === "custom" && block.language && block.content.trim()) {
      const renderer = getRenderer(block.language);
      if (renderer) {
         // If rendered content is already set (and cached inside renderer), this is fast
         // But we need to check if existing rendered content is just "loading" state vs "final" state?
         // Our cache mechanism in renderers handles this.
         const newHtml = await renderer.render(block.content, block.key, isStreaming);
         if (newHtml !== block.rendered) {
           block.rendered = newHtml;
           hasNewRender = true;
         }
      }
    }
  }

  return hasNewRender;
};

// Hydrate blocks (Client-side JS)
const hydrateCustomBlocks = async (isStreaming: boolean) => {
    // Find all custom block containers in the DOM
    // We can't easily find them by selector unless we wrap them consistently.
    // But contentBlocks tells us what to hydrate.
    
    // Better approach: Query by key?
    // In template, we can add id/ref. But simpler is just to let renderer query its own elements? 
    // Markmap renderer queried `svg.markmap-svg`.
    
    // Let's iterate blocks and let renderer handle finding its element within the container
    // To make this robust, we should wrap custom blocks with a known ID or class in the template.
    
    // In this refactor, let's look at the DOM.
    // The renderer.hydrate method takes an `element` or we need to find it.
    // MarkmapRenderer logic was: find all `svg[data-json]`.
    
    // Let's stick to the current pattern: Renderers are responsible for finding their elements or we pass a container conformant.
    // But `hydrate` signature is `hydrate(element: HTMLElement...)`.
    
    // Let's change the strategy slightly:
    // We iterate contentBlocks. If it's custom, we try to find its container in DOM.
    // We can add `id="block.key"` to the wrapper in template.
    
    for (const block of contentBlocks.value) {
        if (block.type === "custom" && block.language) {
            const renderer = getRenderer(block.language);
            if (renderer && renderer.hydrate) {
                const el = document.getElementById(block.key);
                if (el) {
                    await renderer.hydrate(el, block.content, isStreaming);
                }
            }
        }
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
  
  await renderCustomBlocks(true); // Streaming render
  
  await nextTick();
  await hydrateCustomBlocks(true); // Streaming hydration
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
      // Final render
      blockKeyCounter = 0;
      contentBlocks.value = parseContentBlocks(content || "");
      lastParsedLength.value = (content || "").length;
      
      await renderCustomBlocks(false); // Final render
      
      await nextTick();
      await hydrateCustomBlocks(false); // Final hydration
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

          <!-- Custom Block (Mermaid, Markmap, etc.) -->
          <div
            v-else-if="block.type === 'custom'"
            :id="block.key" 
            class="custom-block-wrapper my-4"
          >
             <div
               v-if="block.rendered"
               v-html="block.rendered"
             ></div>
             <!-- Fallback Loading (if renderer returns null initially) -->
             <div v-else class="loading-fallback">
                Rendering {{ block.language }}...
             </div>
          </div>
        </template>
      </div>
    </div>
  </Card>
</template>

<style>
@reference "@/style.css";

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
  /* border: 1px solid var(--border); */ /* Removed as per user request */
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

/* Mermaid Actions Bar Styling */
.mermaid-block-group:hover .mermaid-actions-bar {
  opacity: 1;
  transform: translateY(0);
}

.mermaid-wrapper.rendered svg {
  max-width: none;
  height: auto;
  background: white;
  padding: 0;
  border-radius: 0.75rem;
  opacity: 1;
  animation: mermaidFadeIn 0.4s ease-in-out;
}

/* 适配暗色模式 */
.dark .mermaid-wrapper.rendered svg {
  filter: invert(0.9) hue-rotate(180deg);
  background: #eee; /* Light background for the inverted SVG to look good */
}

.dark .mermaid-block-container {
  background: rgba(255, 255, 255, 0.02);
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
