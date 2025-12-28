<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useMarkdown } from "@/composables/useMarkdown";
import { useChatStore } from "@/stores/chat";
import { Card } from "@/components/ui/card";
import ReasoningBlock from "./ReasoningBlock.vue"
import ToolCallBlock from "./ToolCallBlock.vue"
import TypingIndicator from "./TypingIndicator.vue";
import type { Message } from "@/lib/db";
import { getSupportedLanguages, getRenderer } from "@/lib/renderers";
import { XCircle, Music, Video } from "lucide-vue-next";

const props = defineProps<{
  messages: Message | Message[];
}>();

const store = useChatStore();
const { render } = useMarkdown();

interface ContentBlock {
  type: "markdown" | "custom" | "media" | "reasoning" | "tool-call";
  language?: string; // For custom blocks
  media?: { url: string; type: "audio" | "video" }; // For media blocks
  tool?: any; // For tool-call blocks
  content: string;
  key: string;
  startPos: number; 
  rendered?: string; 
  toolCount?: number; 
  isStreaming?: boolean;
}

const contentBlocks = ref<ContentBlock[]>([]);
const lastParsedLength = ref(0);

// Unified messages array
const messagesArray = computed(() => Array.isArray(props.messages) ? props.messages : [props.messages]);

// Media Player state for Interaction A
const activeMedia = ref<{ url: string; type: "audio" | "video" } | null>(null);

const emit = defineEmits<{
  (e: 'copyCode', event: MouseEvent): void
}>();

const handleContentClick = (event: MouseEvent) => {
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
  emit('copyCode', event);
};

// Media detection
const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?.*)?$/i.test(url);
const getStandaloneMedia = (content: string) => {
  const trimmed = content.trim();
  const mdLinkMatch = trimmed.match(/^\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:mp3|wav|ogg|m4a|aac|flac|opus|mp4|webm|ogv|mov|mkv)(?:\?[^\s)]+)?)\)$/i);
  if (mdLinkMatch && mdLinkMatch[2]) {
    const url = mdLinkMatch[2];
    return { url, type: isAudio(url) ? ("audio" as const) : ("video" as const) };
  }
  const plainUrlMatch = trimmed.match(/^(https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a|aac|flac|opus|mp4|webm|ogv|mov|mkv)(?:\?[^\s)]+)?)$/i);
  if (plainUrlMatch && plainUrlMatch[1]) {
    const url = plainUrlMatch[1];
    return { url, type: isAudio(url) ? ("audio" as const) : ("video" as const) };
  }
  return null;
};

// Parse content into blocks (full parse)
const parseAllContentBlocks = (messages: Message[]): ContentBlock[] => {
  const finalBlocks: ContentBlock[] = [];
  
  messages.forEach((message) => {
    const isThisMsgStreaming = store.isStreaming && store.messages[store.messages.length - 1]?.id === message.id;

    // 1. Add Reasoning block
    if (message.reasoning_content) {
      finalBlocks.push({
        type: "reasoning",
        content: message.reasoning_content,
        key: `${message.id}-reasoning`,
        startPos: -1,
        toolCount: message.tool_calls?.length || 0,
        isStreaming: isThisMsgStreaming
      });
    }

    // 2. Add Tool Call blocks
    if (message.tool_calls?.length) {
      message.tool_calls.forEach((tool, index) => {
        finalBlocks.push({
          type: "tool-call",
          tool: tool,
          content: tool.name,
          key: `${message.id}-tool-${index}`,
          startPos: -1,
        });
      });
    }

    // 3. Parse Markdown Content
    const content = message.content || "";
    if (content.trim()) {
      const supportedLangs = getSupportedLanguages();
      const pattern = `\`\`\`(${supportedLangs.join("|")})\\n([\\s\\S]*?)\`\`\``;
      const diagramRegex = new RegExp(pattern, "g");
      
      const rawBlocks: any[] = [];
      let lastIndex = 0;
      let match;

      while ((match = diagramRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          rawBlocks.push({
            type: "markdown",
            content: content.substring(lastIndex, match.index),
            startPos: lastIndex,
          });
        }
        rawBlocks.push({
          type: "custom",
          language: match[1] || "",
          content: match[2] || "",
          startPos: match.index,
        });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < content.length) {
        rawBlocks.push({
          type: "markdown",
          content: content.substring(lastIndex),
          startPos: lastIndex,
        });
      }

      for (const block of rawBlocks) {
        if (block.type !== "markdown") {
          block.key = `${message.id}-${block.language}-${block.startPos}`;
          finalBlocks.push(block);
          continue;
        }

        const lines = block.content.split('\n');
        let currentMd = "";
        let currentStart = block.startPos;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] || "";
          const media = getStandaloneMedia(line);

          if (media) {
            if (currentMd.trim()) {
              finalBlocks.push({
                type: "markdown",
                content: currentMd,
                key: `${message.id}-md-${currentStart}`,
                startPos: currentStart,
              });
            }
            const mediaStart = currentStart + currentMd.length;
            finalBlocks.push({
              type: "media",
              media: media,
              content: line,
              key: `${message.id}-media-${mediaStart}`,
              startPos: mediaStart,
            });
            currentMd = "";
            currentStart = mediaStart + line.length + 1;
          } else {
            currentMd += line + (i === lines.length - 1 ? "" : "\n");
          }
        }

        if (currentMd.trim()) {
          finalBlocks.push({
            type: "markdown",
            content: currentMd,
            key: `${message.id}-md-${currentStart}`,
            startPos: currentStart,
          });
        }
      }
    }
  });

  return finalBlocks;
};

// Incremental parse reuse
const parseContentBlocksIncremental = (
  messages: Message[],
  existingBlocks: ContentBlock[]
): { blocks: ContentBlock[]; newLength: number } => {
  const newBlocks = parseAllContentBlocks(messages);
  const mergedBlocks = newBlocks.map(nb => {
    const matched = existingBlocks.find(eb => eb.key === nb.key);
    if (matched) nb.rendered = matched.rendered;
    return nb;
  });
  
  const totalLength = messages.reduce((acc, m) => acc + (m.content || "").length, 0);
  return { blocks: mergedBlocks, newLength: totalLength };
};

// Render custom
const renderCustomBlocks = async (isStreaming: boolean) => {
  let hasNewRender = false;
  for (const block of contentBlocks.value) {
    if (block.type === "custom" && block.language && block.content.trim()) {
      const renderer = getRenderer(block.language);
      if (renderer) {
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

// Hydrate
const hydrateCustomBlocks = async (isStreaming: boolean) => {
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

const throttledUpdate = useThrottleFn(async () => {
  const { blocks, newLength } = parseContentBlocksIncremental(
    messagesArray.value,
    contentBlocks.value
  );
  contentBlocks.value = blocks;
  lastParsedLength.value = newLength;
  await renderCustomBlocks(true);
  await nextTick();
  await hydrateCustomBlocks(true);
}, 100);

const updateContent = async () => {
  await throttledUpdate();
};

watch(
  [
    () => messagesArray.value,
    () => store.isStreaming
  ],
  async () => {
    const lastMsg = messagesArray.value[messagesArray.value.length - 1];
    const isStreaming = store.isStreaming && store.messages[store.messages.length - 1]?.id === lastMsg?.id;
    
    if (isStreaming && lastMsg?.role === "assistant") {
      await updateContent();
    } else {
      contentBlocks.value = parseAllContentBlocks(messagesArray.value);
      await renderCustomBlocks(false);
      await nextTick();
      await hydrateCustomBlocks(false);
    }
  },
  { immediate: true, deep: true }
);

// Helper for template
const isAnyStreaming = computed(() => {
    const lastMsg = messagesArray.value[messagesArray.value.length - 1];
    return store.isStreaming && store.messages[store.messages.length - 1]?.id === lastMsg?.id;
});
</script>

<template>
  <div class="message-content w-full">
    <Card
      class="overflow-hidden w-full border-none shadow-none"
      :class="
        messagesArray[0]?.role === 'user'
          ? 'bg-secondary text-secondary-foreground rounded-2xl px-4 py-3'
          : 'bg-transparent px-0 py-0'
      "
    >
      <!-- User Message -->
      <div
        v-if="messagesArray[0]?.role === 'user'"
        class="whitespace-pre-wrap text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word"
      >
        {{ messagesArray[0].content }}
      </div>

      <!-- Assistant Message(s) -->
      <div v-else class="relative">
        <TypingIndicator
          v-if="contentBlocks.length === 0 && isAnyStreaming"
          class="py-3"
        />
        <div
          v-else
          class="markdown-body text-sm md:text-base leading-7 md:leading-8 text-left wrap-break-word"
          :class="{ 'is-streaming': isAnyStreaming, 'is-complete': !isAnyStreaming }"
          @click="handleContentClick"
        >
          <template v-for="block in contentBlocks" :key="block.key">
            <ReasoningBlock 
               v-if="block.type === 'reasoning'" 
               :content="block.content" 
               :is-streaming="block.isStreaming"
               :tool-count="block.toolCount"
            />
            <ToolCallBlock 
              v-else-if="block.type === 'tool-call'" 
              :tool="block.tool" 
            />
            <div
              v-else-if="block.type === 'markdown'"
              v-html="render(block.content)"
            ></div>
            <div
              v-else-if="block.type === 'custom'"
              :id="block.key" 
              class="custom-block-wrapper my-4"
            >
               <div v-if="block.rendered" v-html="block.rendered"></div>
               <div v-else class="loading-fallback">Rendering {{ block.language }}...</div>
            </div>
            <div
              v-else-if="block.type === 'media' && block.media"
              class="media-standalone-wrapper my-4 flex justify-start w-full"
            >
              <div v-if="block.media.type === 'audio'" class="w-full max-w-md">
                <audio controls preload="metadata" class="w-full h-10 block">
                  <source :src="block.media.url" />
                </audio>
              </div>
              <div v-else class="w-full max-w-2xl bg-black/5 rounded-xl overflow-hidden border border-border/50">
                <video controls preload="metadata" playsinline :src="block.media.url" class="w-full block"></video>
              </div>
            </div>
          </template>
        </div>

        <!-- Media Player Drawer -->
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
              <div class="flex items-center gap-2 text-primary">
                <span class="p-1.5 bg-primary/10 rounded-lg">
                  <Music v-if="activeMedia.type === 'audio'" class="w-4 h-4" />
                  <Video v-else class="w-4 h-4" />
                </span>
                <span class="text-xs font-semibold tracking-wide uppercase">
                  Now Playing
                </span>
              </div>
              <button 
                @click="activeMedia = null"
                class="p-1.5 hover:bg-black/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <XCircle class="w-5 h-5" />
              </button>
            </div>
            
            <div class="rounded-xl overflow-hidden bg-black/5">
              <audio v-if="activeMedia.type === 'audio'" controls class="w-full h-12" autoplay :src="activeMedia.url"></audio>
              <video v-else controls class="w-full aspect-video block" autoplay :src="activeMedia.url"></video>
            </div>
          </div>
        </Transition>
      </div>
    </Card>
  </div>
</template>
