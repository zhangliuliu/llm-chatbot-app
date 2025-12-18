<script setup lang="ts">
import { ref, watch } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { User, ChevronRight } from 'lucide-vue-next'
import { useMarkdown } from '@/composables/useMarkdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { Message } from '@/lib/db'

const props = defineProps<{
    message: Message
}>()

const { render } = useMarkdown()

const renderedContent = ref('')
const thinkingContent = ref('')
const hasThinking = ref(false)
const isThinkingOpen = ref(false)

const handleCopy = async (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.copy-btn') as HTMLButtonElement
    if (!target) return

    const codeBlock = target.closest('.code-block')
    if (!codeBlock) return

    const codeElement = codeBlock.querySelector('code')
    if (!codeElement) return

    const code = codeElement.innerText

    try {
        await navigator.clipboard.writeText(code)

        const label = target.querySelector('span:last-child')
        const icon = target.querySelector('svg')

        if (label) {
            const originalText = label.textContent
            label.textContent = 'Copied!'
            target.classList.add('text-green-500')
            if (icon) icon.style.display = 'none'

            setTimeout(() => {
                label.textContent = originalText
                target.classList.remove('text-green-500')
                if (icon) icon.style.display = ''
            }, 2000)
        }
    } catch (err) {
        console.error('Failed to copy logic', err)
    }
}

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

        <!-- Message Bubble -->
        <Card class="overflow-hidden" @click="handleCopy"
            :class="message.role === 'user' ? 'bg-primary text-primary-foreground border-none rounded-2xl px-4 py-3 shadow-sm max-w-[85%]' : 'bg-transparent border-none shadow-none w-full min-w-0'">
            <!-- Thinking Block -->
            <div v-if="hasThinking" class="mb-2 border-l-2 border-primary/30 pl-4">
                <Collapsible v-model:open="isThinkingOpen">
                    <CollapsibleTrigger
                        class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium select-none group">
                        <ChevronRight class="w-4 h-4 transition-transform duration-200"
                            :class="{ 'rotate-90': isThinkingOpen }" />
                        <span class="opacity-70 group-hover:opacity-100">Thinking Process</span>
                    </CollapsibleTrigger>
                    <!-- Force text color for thinking content in user bubble? No, thinking usually only for AI -->
                    <CollapsibleContent>
                        <div class="mt-2 text-muted-foreground/80 markdown-body text-xs" v-html="thinkingContent"></div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <!-- Main Content -->
            <div v-html="renderedContent" class="markdown-body text-sm md:text-base leading-relaxed break-words"
                :class="{ 'text-primary-foreground': message.role === 'user' }"></div>
        </Card>

        <!-- Avatar (User) -->
        <Avatar v-if="message.role === 'user'" class="h-9 w-9 mt-0.5 border-2 border-background shadow-sm shrink-0">
            <AvatarImage
                src="https://api.dicebear.com/7.x/notionists/svg?seed=User&backgroundColor=b6e3f4,c0aede,d1d4f9"
                alt="User" />
            <AvatarFallback class="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <User class="w-5 h-5" />
            </AvatarFallback>
        </Avatar>
    </div>
</template>

<style>
/* Markdown Styles Scoped via deeply selection or global css */
.markdown-body p {
    margin-bottom: 0.75em;
}

/* Remove margin from the last element to fix bubble spacing */
.markdown-body>*:last-child {
    margin-bottom: 0;
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

/* User Bubble Specific Overrides */
.bg-primary .markdown-body code {
    background-color: rgba(255, 255, 255, 0.2);
    color: inherit;
}
</style>
