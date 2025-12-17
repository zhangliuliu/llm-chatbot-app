<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Send, Square } from 'lucide-vue-next'

const props = defineProps<{
    isLoading: boolean
}>()

const emit = defineEmits<{
    (e: 'send', content: string): void
    (e: 'stop'): void
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function adjustHeight() {
    const el = textareaRef.value
    if (el) {
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
}

function handleInput() {
    adjustHeight()
}

function handleSend() {
    if (!input.value.trim() || props.isLoading) return
    emit('send', input.value)
    input.value = ''
    nextTick(() => adjustHeight())
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
    }
}
</script>

<template>
    <div class="w-full p-4 bg-background border-t">
        <div class="max-w-3xl mx-auto w-full relative">
            <div
                class="flex items-end gap-2 bg-muted/50 border border-input rounded-xl p-2 focus-within:ring-1 focus-within:ring-ring transition-all shadow-sm">
                <textarea ref="textareaRef" v-model="input" @input="handleInput" @keydown="handleKeydown"
                    placeholder="Message LLM..."
                    class="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-48 min-h-[24px] py-2 px-2 outline-none text-base"
                    rows="1"></textarea>

                <button v-if="isLoading" @click="$emit('stop')"
                    class="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors mb-0.5"
                    title="Stop generating">
                    <Square class="w-4 h-4 fill-current" />
                </button>
                <button v-else @click="handleSend" :disabled="!input.trim()"
                    class="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send class="w-4 h-4" />
                </button>
            </div>
            <div class="text-center text-xs text-muted-foreground mt-2">
                Ai can make mistakes. Please verify important information.
            </div>
        </div>
    </div>
</template>
