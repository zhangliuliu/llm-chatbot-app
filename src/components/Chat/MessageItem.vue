<script setup lang="ts">
import { ref, watch } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { useMarkdown } from '@/composables/useMarkdown'
import type { Message } from '@/lib/db'

const props = defineProps<{
    message: Message
}>()

const { render } = useMarkdown()

const renderedContent = ref('')
const thinkingContent = ref('')
const hasThinking = ref(false)

// Throttled update to avoid main thread blocking on large info
const updateContent = useThrottleFn((content: string) => {
    // Check for <think> block
    const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/)

    if (thinkMatch) {
        hasThinking.value = true
        thinkingContent.value = render(thinkMatch[1] || '')
        // Render the rest of the content (after </think>)
        const rest = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '')
        renderedContent.value = render(rest)
    } else {
        hasThinking.value = false
        renderedContent.value = render(content)
    }
}, 100) // 100ms throttle

watch(() => props.message.content, (newVal) => {
    updateContent(newVal || '')
}, { immediate: true })
</script>

<template>
    <div class="flex gap-4" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <!-- Avatar (Assistant) -->
        <div v-if="message.role === 'assistant'"
            class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-primary">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"
                    fill="currentColor" />
                <path
                    d="M12 6a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm0 8a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1z"
                    fill="currentColor" />
            </svg>
        </div>

        <!-- Message Bubble -->
        <div class="message-content rounded-2xl px-4 py-3 max-w-[85%] overflow-hidden"
            :class="message.role === 'user' ? 'bg-muted text-foreground' : 'text-foreground w-full'">
            <!-- Thinking Block -->
            <div v-if="hasThinking" class="mb-4 border-l-2 border-primary/30 pl-4">
                <details class="text-sm text-muted-foreground group cursor-pointer">
                    <summary
                        class="list-none flex items-center gap-2 hover:text-foreground transition-colors font-medium select-none">
                        <span class="opacity-70 group-open:hidden">Show Thinking Process...</span>
                        <span class="opacity-70 hidden group-open:inline">Thinking Process</span>
                    </summary>
                    <div class="mt-2 text-muted-foreground/80 markdown-body text-xs" v-html="thinkingContent"></div>
                </details>
            </div>

            <!-- Main Content -->
            <div v-html="renderedContent" class="markdown-body text-sm md:text-base leading-relaxed break-words"></div>
        </div>

        <!-- Avatar (User) -->
        <div v-if="message.role === 'user'"
            class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
            U
        </div>
    </div>
</template>

<style>
/* Markdown Styles Scoped via deeply selection or global css */
.markdown-body p {
    margin-bottom: 0.75em;
}

.markdown-body ul,
.markdown-body ol {
    margin-left: 1.5em;
    margin-bottom: 0.75em;
    list-style: disc;
}

.markdown-body ol {
    list-style: decimal;
}

.markdown-body pre {
    margin-bottom: 1em;
    border-radius: 0.5rem;
    overflow-x: auto;
    background-color: #282c34;
    /* Dark for code blocks */
    color: #abb2bf;
    padding: 1em;
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
}
</style>
