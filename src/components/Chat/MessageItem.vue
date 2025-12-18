<script setup lang="ts">
import { ref, watch } from 'vue'
import { User, Copy, RotateCcw, Check } from 'lucide-vue-next'
import { useClipboard, useThrottleFn } from '@vueuse/core'
import { useMarkdown } from '@/composables/useMarkdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-vue-next'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/lib/db'

import TypingIndicator from './TypingIndicator.vue'

const props = defineProps<{
    message: Message
}>()

const emit = defineEmits<{
    (e: 'regenerate', message: Message): void
}>()

const { render } = useMarkdown()
const { copy, copied } = useClipboard()
const store = useChatStore()

const isDeleteDialogOpen = ref(false)

const handleCopyMessage = () => {
    copy(props.message.content || '')
}

const handleRegenerate = () => {
    emit('regenerate', props.message)
}

const handleDeleteMessage = () => {
    if (props.message.id) {
        store.deleteMessage(props.message.id)
    }
    isDeleteDialogOpen.value = false
}

const renderedContent = ref('')

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

// Level 2: Use throttled rendering for better performance balance
// 80ms is roughly 12.5fps, which feels smooth for text while saving significant CPU
const throttledUpdate = useThrottleFn((content: string) => {
    renderedContent.value = render(content)
}, 80)

const updateRenderedContent = (content: string) => {
    if (!content) {
        renderedContent.value = ''
        return
    }
    throttledUpdate(content)
}

// Watch both content and streaming status
watch(
    [() => props.message.content, () => store.isStreaming],
    ([content, isStreaming]) => {
        if (isStreaming && props.message.role === 'assistant') {
            updateRenderedContent(content || '')
        } else {
            // When not streaming or just finished, perform an immediate final update
            renderedContent.value = content ? render(content) : ''
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="flex gap-4 group" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <!-- Message Bubble -->
        <div class="flex flex-col gap-1 max-w-[85%]"
            :class="message.role === 'user' ? 'items-end' : 'items-start flex-1 min-w-0'">
            <Card class="overflow-hidden w-fit" @click="handleCopy"
                :class="message.role === 'user' ? 'bg-secondary text-secondary-foreground border-none rounded-2xl px-4 py-3 shadow-none' : 'bg-transparent border-none shadow-none w-full min-w-0'">


                <!-- Main Content -->
                <div v-if="message.role === 'user'"
                    class="whitespace-pre-wrap text-sm md:text-base leading-7 md:leading-8 text-left break-words">
                    {{ message.content }}
                </div>
                <div v-else class="relative">
                    <TypingIndicator
                        v-if="!message.content && store.isStreaming && store.messages[store.messages.length - 1]?.id === message.id"
                        class="py-3" />
                    <div v-else v-html="renderedContent"
                        class="markdown-body text-sm md:text-base leading-7 md:leading-8 text-left break-words" :class="{
                            'is-streaming': store.isStreaming && store.messages[store.messages.length - 1]?.id === message.id,
                            'is-complete': !(store.isStreaming && store.messages[store.messages.length - 1]?.id === message.id)
                        }">
                    </div>
                </div>
            </Card>

            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                :class="{ 'pointer-events-none !opacity-0': store.isStreaming && store.messages[store.messages.length - 1]?.id === message.id }">
                <Button variant="ghost" size="icon" class="h-8 w-11 text-muted-foreground hover:text-foreground"
                    title="Copy" @click="handleCopyMessage">
                    <Check v-if="copied" class="h-4 w-4 text-green-500" />
                    <Copy v-else class="h-4 w-4" />
                </Button>
                <Button v-if="message.role === 'assistant'" variant="ghost" size="icon"
                    class="h-8 w-8 text-muted-foreground hover:text-foreground" title="Retry" @click="handleRegenerate">
                    <RotateCcw class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon"
                    class="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete Message" @click="isDeleteDialogOpen = true">
                    <Trash2 class="h-4 w-4" />
                </Button>
            </div>
        </div>

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

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认删除这条消息？</AlertDialogTitle>
                <AlertDialogDescription>
                    此操作无法撤销。该消息将从您的对话历史中永久移除。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction @click="handleDeleteMessage"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    确认删除
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
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
    content: '';
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
</style>
