<script setup lang="ts">
import { watch, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import ChatInput from '@/components/Chat/ChatInput.vue'
import MessageItem from '@/components/Chat/MessageItem.vue'

const route = useRoute()
const store = useChatStore()
const { messages, isLoading } = storeToRefs(store)
const messagesContainerRef = ref<HTMLDivElement | null>(null)

// Auto-scroll to bottom
function scrollToBottom() {
    if (messagesContainerRef.value) {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
}

// Watch messages to scroll
watch(() => messages.value.length, () => {
    nextTick(() => scrollToBottom())
}, { flush: 'post' })

watch(() => messages.value[messages.value.length - 1]?.content, () => {
    // If streaming, maybe throttle this? For now standard scroll.
    // If user scrolled up, don't force scroll down? (TODO enhancement)
    scrollToBottom()
})

// Load session on mount or route change
watch(() => route.params.id, async (newId) => {
    if (newId && typeof newId === 'string') {
        await store.loadSession(newId)
    } else {
        // New Chat view (no ID)
        store.$patch({ currentSessionId: null, messages: [] })
    }
}, { immediate: true })

function handleSend(content: string) {
    store.sendMessage(content)
}

function handleStop() {
    store.stopGeneration()
}
</script>

<template>
    <div class="flex h-full flex-col items-center">
        <!-- Messages Area -->
        <div ref="messagesContainerRef" class="flex-1 w-full overflow-y-auto p-4 md:p-10 scroll-smooth">
            <div class="max-w-3xl mx-auto space-y-6">
                <!-- Introduction / Empty State -->
                <div v-if="messages.length === 0"
                    class="flex flex-col items-center justify-center h-full text-center space-y-4 mt-20">
                    <h1 class="text-4xl font-semibold">LLM Chatbot</h1>
                    <p class="text-muted-foreground text-lg">How can I help you today?</p>
                </div>

                <!-- Message List -->
                <div v-for="msg in messages" :key="msg.id">
                    <MessageItem :message="msg" />
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <ChatInput :is-loading="isLoading" @send="handleSend" @stop="handleStop" />
    </div>
</template>
