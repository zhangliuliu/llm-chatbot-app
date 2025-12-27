<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useMarkdown } from "@/composables/useMarkdown";
import { useChatStore } from "@/stores/chat";
import { Card } from "@/components/ui/card";
import TypingIndicator from "./TypingIndicator.vue";
import type { Message } from "@/lib/db";
import { getSupportedLanguages, getRenderer } from "@/lib/renderers";
import { XCircle, Music, Video } from "lucide-vue-next";

const props = defineProps<{
  message: Message;
}>();

const store = useChatStore();
const { render } = useMarkdown();

interface ContentBlock {
  type: "markdown" | "custom" | "media";
  language?: string; // For custom blocks
  media?: { url: string; type: "audio" | "video" }; // For media blocks
  content: string;
  key: string;
  startPos: number; // Position of this block in original content
  rendered?: string; // Pre-rendered HTML
}

const contentBlocks = ref<ContentBlock[]>([]);
const lastParsedLength = ref(0);

// Block key counter for unique keys
let blockKeyCounter = 0;

// Media Player state for Interaction A
const activeMedia = ref<{ url: string; type: "audio" | "video" } | null>(null);

const emit = defineEmits<{
  (e: 'copyCode', event: MouseEvent): void
}>();

const handleContentClick = (event: MouseEvent) => {
  // Handle media link clicks
  const target = event.target as HTMLElement;
  const link = target.closest(".media-link-inline") as HTMLElement;
  if (link) {
    event.preventDefault();
    const url = link.getAttribute("data-href");
    const type = link.getAttribute("data-type") as "audio" | "video";
    if (url && type) {
      activeMedia.value = { url, type };
    }
    return;
  }
  
  // Emit copyCode event for other clicks (e.g., code block copy buttons)
  emit('copyCode', event);
};

// Media detection utilities
const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?.*)?$/i.test(url);

const getStandaloneMedia = (content: string) => {
  const trimmed = content.trim();
  // Match [text](url) 
  const mdLinkMatch = trimmed.match(/^\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:mp3|wav|ogg|m4a|aac|flac|opus|mp4|webm|ogv|mov|mkv)(?:\?[^\s)]+)?)\)$/i);
  if (mdLinkMatch && mdLinkMatch[2]) {
    const url = mdLinkMatch[2];
    return { url, type: isAudio(url) ? ("audio" as const) : ("video" as const) };
  }
  // Match plain URL
  const plainUrlMatch = trimmed.match(/^(https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a|aac|flac|opus|mp4|webm|ogv|mov|mkv)(?:\?[^\s)]+)?)$/i);
  if (plainUrlMatch && plainUrlMatch[1]) {
    const url = plainUrlMatch[1];
    return { url, type: isAudio(url) ? ("audio" as const) : ("video" as const) };
  }
  return null;
};

// Parse content into blocks (full parse)
const parseContentBlocks = (content: string): ContentBlock[] => {
  if (!content) return [];

  const rawBlocks: ContentBlock[] = [];
  const supportedLangs = getSupportedLanguages();
  
  // 1. First split by code blocks
  const pattern = `\`\`\`(${supportedLangs.join("|")})\\n([\\s\\S]*?)\`\`\``;
  const diagramRegex = new RegExp(pattern, "g");
  
  let lastIndex = 0;
  let match;

  while ((match = diagramRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      rawBlocks.push({
        type: "markdown",
        content: content.substring(lastIndex, match.index),
        key: "",
        startPos: lastIndex,
      });
    }

    const lang = match[1] || "";
    const itemContent = match[2] || "";
    rawBlocks.push({
      type: "custom",
      language: lang,
      content: itemContent,
      key: "",
      startPos: match.index,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    rawBlocks.push({
      type: "markdown",
      content: content.substring(lastIndex),
      key: "",
      startPos: lastIndex,
    });
  }

  // 2. Further split markdown blocks by standalone media links
  const finalBlocks: ContentBlock[] = [];
  for (const block of rawBlocks) {
    if (block.type !== "markdown") {
      block.key = `${props.message.id}-${block.language}-${blockKeyCounter++}`;
      finalBlocks.push(block);
      continue;
    }

    // Split markdown by lines to find standalone media
    const lines = block.content.split('\n');
    let currentMd = "";
    let currentStart = block.startPos;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      const media = getStandaloneMedia(line);

      if (media) {
        // 1. 先推送累积的 Markdown
        if (currentMd.trim()) {
           finalBlocks.push({
             type: "markdown",
             content: currentMd,
             key: `${props.message.id}-md-${blockKeyCounter++}`,
             startPos: currentStart,
           });
        }
        
        // 更新起始位置到当前媒体行
        const mediaStart = currentStart + currentMd.length;
        
        // 2. 推送媒体块
        finalBlocks.push({
          type: "media",
          media: media,
          content: line,
          key: `${props.message.id}-media-${blockKeyCounter++}`,
          startPos: mediaStart,
        });

        // 3. 重置缓存并跳过该行
        currentMd = "";
        // +1 是为了跳过换行符
        currentStart = mediaStart + line.length + 1;
      } else {
        currentMd += line + (i === lines.length - 1 ? "" : "\n");
      }
    }

    if (currentMd.trim()) {
      finalBlocks.push({
        type: "markdown",
        content: currentMd,
        key: `${props.message.id}-md-${blockKeyCounter++}`,
        startPos: currentStart,
      });
    }
  }

  return finalBlocks;
};

// Parsing ends here

// Incremental parse
const parseContentBlocksIncremental = (
  content: string,
  _existingBlocks: ContentBlock[],
  _lastLength: number
): { blocks: ContentBlock[]; newLength: number } => {
  // Always do a full parse during streaming for simplicity and correctness with media splitting
  // Because standalone media detection depends on line boundaries which change during streaming
  blockKeyCounter = 0;
  const blocks = parseContentBlocks(content);
  return { blocks, newLength: content.length };
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
        @click="handleContentClick"
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
          <!-- Minimal Media Block -->
          <div
            v-else-if="block.type === 'media' && block.media"
            class="media-standalone-wrapper my-4 flex justify-start w-full"
          >
            <!-- Minimal Audio -->
            <div 
              v-if="block.media.type === 'audio'" 
              class="w-full max-w-md"
            >
              <audio controls preload="metadata" class="w-full h-10 block">
                <source :src="block.media.url" />
              </audio>
            </div>

            <!-- Minimal Video -->
            <div 
              v-else 
              class="w-full max-w-2xl bg-black/5 rounded-xl overflow-hidden border border-border/50"
            >
              <video controls preload="metadata" class="w-full block">
                <source :src="block.media.url" />
              </video>
            </div>
          </div>
        </template>

        <!-- Media Player Drawer (Interaction A) -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform -translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform -translate-y-2 opacity-0"
        >
          <div
            v-if="activeMedia"
            class="media-player-drawer mt-4 p-4 rounded-2xl border border-border/40 relative group/player"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                <Music v-if="activeMedia.type === 'audio'" class="w-3.5 h-3.5" />
                <Video v-else class="w-3.5 h-3.5" />
                <span>Now Playing</span>
              </div>
              <button
                @click="activeMedia = null"
                class="p-1 hover:bg-muted/50 rounded-full transition-colors group"
                title="Close Player"
              >
                <XCircle class="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground" />
              </button>
            </div>

            <div v-if="activeMedia.type === 'audio'" class="audio-player-container">
              <audio
                :src="activeMedia.url"
                controls
                autoplay
                class="w-full h-10 custom-audio-player"
              ></audio>
            </div>
            <div v-else class="video-player-container">
              <video
                :src="activeMedia.url"
                controls
                autoplay
                class="w-full rounded-xl border border-white/10 shadow-lg"
              ></video>
            </div>
          </div>
        </Transition>
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

.markdown-body a {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 4px;
  transition: all 0.2s ease;
}

.markdown-body a:hover {
  opacity: 0.8;
  text-decoration-style: solid;
}

/* Minimal Player Styling */
/* Removed redundant media-player-drawer rule */

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

/* Diagram Actions Bar Styling (Shared) */
.mermaid-block-group:hover .mermaid-actions-bar,
.markmap-block-group:hover .mermaid-actions-bar {
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
  pointer-events: auto; /* Enable interactions */
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

/* Media Player Styles */
.media-player-drawer {
  background: var(--muted);
  opacity: 0.8;
  backdrop-filter: blur(8px);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-audio-player::-webkit-media-controls-enclosure {
  background-color: var(--muted);
  border-radius: 12px;
}

.media-link-inline {
  transition: all 0.2s ease;
}

.media-link-inline:hover {
  background-color: var(--primary/10);
  border-radius: 4px;
}

.media-standalone {
  width: 100%;
  display: flex;
  justify-content: center;
}

.media-standalone audio {
  max-width: 500px;
}
</style>
