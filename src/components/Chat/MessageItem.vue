<script setup lang="ts">
import { ref, watch } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { User, ChevronRight, Copy, RotateCcw, Check } from 'lucide-vue-next'
import { useClipboard } from '@vueuse/core'
import { useMarkdown } from '@/composables/useMarkdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
    const trimmed = content.trim()
    // Check for <think> block
    const thinkMatch = trimmed.match(/<think>([\s\S]*?)(?:<\/think>|$)/)

    if (thinkMatch) {
        hasThinking.value = true
        thinkingContent.value = render(thinkMatch[1] || '')
        // Render the rest of the content (after </think>)
        const rest = trimmed.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '')
        renderedContent.value = render(rest)
    } else {
        hasThinking.value = false
        renderedContent.value = render(trimmed)
    }
}, 100) // 100ms throttle

watch(() => props.message.content, (newVal) => {
    updateContent(newVal || '')
}, { immediate: true })
</script>

<template>
    <div class="flex gap-4 group" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <!-- Message Bubble -->
        <div class="flex flex-col gap-1 max-w-[85%]"
            :class="message.role === 'user' ? 'items-end' : 'items-start flex-1 min-w-0'">
            <Card class="overflow-hidden w-fit" @click="handleCopy"
                :class="message.role === 'user' ? 'bg-secondary text-secondary-foreground border-none rounded-2xl px-4 py-3 shadow-none' : 'bg-transparent border-none shadow-none w-full min-w-0'">
                <!-- Thinking Block -->
                <div v-if="hasThinking" class="mb-2 border-l-2 border-primary/30 pl-4">
                    <Collapsible v-model:open="isThinkingOpen">
                        <CollapsibleTrigger
                            class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium select-none group">
                            <ChevronRight class="w-4 h-4 transition-transform duration-200"
                                :class="{ 'rotate-90': isThinkingOpen }" />
                            <span class="opacity-70 group-hover:opacity-100">Thinking Process</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div class="mt-2 text-muted-foreground/80 markdown-body text-xs" v-html="thinkingContent">
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                <!-- Main Content -->
                <div v-if="message.role === 'user'"
                    class="whitespace-pre-wrap text-sm md:text-base leading-7 md:leading-8 text-left break-words">
                    {{ message.content }}
                </div>
                <div v-else v-html="renderedContent"
                    class="markdown-body text-sm md:text-base leading-7 md:leading-8 text-left break-words"></div>
            </Card>

            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

.markdown-body p {
    margin-bottom: 1.25em;
}

/* Remove margin from the last element to fix bubble spacing */
.markdown-body>*:last-child {
    margin-bottom: 0 !important;
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
    border-left: 4px solid var(--muted);
    color: var(--muted-foreground);
    margin-bottom: 1.25em;
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
