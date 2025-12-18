<script setup lang="ts">
import { ref, nextTick, type ComponentPublicInstance } from 'vue'
import { Send, Square, Paperclip, Mic } from 'lucide-vue-next'
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
    <div class="w-full px-4 pb-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div class="max-w-3xl mx-auto w-full relative">
            <div
                class="group flex flex-col bg-background/50 backdrop-blur-xl border border-input/50 rounded-2xl transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)] shadow-lg overflow-hidden">

                <Textarea ref="textareaRef" v-model="input" @input="handleInput" @keydown="handleKeydown"
                    placeholder="输入消息，或者使用 / 触发指令..."
                    class="w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none resize-none min-h-[56px] py-4 px-4 outline-none text-base leading-relaxed"
                    rows="1" />

                <div class="flex items-center justify-between px-3 pb-3">
                    <div class="flex items-center gap-1">
                        <Button variant="ghost" size="icon"
                            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                            <Paperclip class="w-4.5 h-4.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                            class="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                            <Mic class="w-4.5 h-4.5" />
                        </Button>
                    </div>

                    <div class="flex items-center gap-3">
                        <span class="text-[10px] text-muted-foreground/50 font-medium hidden sm:inline-block">
                            使用 Shift + Enter 换行
                        </span>

                        <TooltipProvider>
                            <Tooltip :delay-duration="0">
                                <TooltipTrigger as-child>
                                    <div>
                                        <Button v-if="isLoading" @click="$emit('stop')" variant="destructive"
                                            size="icon"
                                            class="h-9 w-9 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
                                            <Square class="w-4 h-4 fill-current" />
                                        </Button>
                                        <Button v-else @click="handleSend" :disabled="!input.trim()" size="icon"
                                            class="h-9 w-9 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-30">
                                            <Send class="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" class="bg-foreground text-background font-medium">
                                    <p>{{ isLoading ? '停止生成' : '发送消息 (Enter)' }}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
            <div class="text-center text-[10px] md:text-xs text-muted-foreground/60 mt-1.5 font-medium tracking-wide">
                <span>Moss 可能会产生错误信息，请核实重要内容。</span>
            </div>
        </div>
    </div>
</template>
