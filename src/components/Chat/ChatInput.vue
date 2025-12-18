<script setup lang="ts">
import { ref, nextTick, type ComponentPublicInstance } from 'vue'
import { Send, Square } from 'lucide-vue-next'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

const props = defineProps<{
    isLoading: boolean
}>()

const emit = defineEmits<{
    (e: 'send', content: string): void
    (e: 'stop'): void
}>()

const input = ref('')
const textareaRef = ref<ComponentPublicInstance | null>(null)

function adjustHeight() {
    const el = textareaRef.value?.$el as HTMLTextAreaElement | undefined
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
    <div class="w-full px-4 pb-4 bg-background">
        <div class="max-w-3xl mx-auto w-full relative">
            <div
                class="flex items-end gap-2 bg-muted/30 border-input border rounded-xl p-2 focus-within:ring-1 focus-within:ring-ring transition-all shadow-sm">
                <Textarea ref="textareaRef" v-model="input" @input="handleInput" @keydown="handleKeydown"
                    placeholder="Message LLM..."
                    class="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none resize-none min-h-[40px] py-2 px-2 outline-none text-base"
                    rows="1" />

                <TooltipProvider>
                    <Tooltip :delay-duration="0">
                        <TooltipTrigger as-child>
                            <div class="mb-0.5 shrink-0">
                                <Button v-if="isLoading" @click="$emit('stop')" variant="destructive" size="icon"
                                    class="h-8 w-8 rounded-lg">
                                    <Square class="w-4 h-4 fill-current" />
                                </Button>
                                <Button v-else @click="handleSend" :disabled="!input.trim()" size="icon"
                                    class="h-8 w-8 rounded-lg transition-all">
                                    <Send class="w-4 h-4" />
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>{{ isLoading ? 'Stop generating' : 'Send message' }}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div class="text-center text-[10px] md:text-xs text-muted-foreground mt-2">
                Ai can make mistakes. Please verify important information.
            </div>
        </div>
    </div>
</template>
