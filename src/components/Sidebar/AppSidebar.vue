<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-vue-next'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const store = useChatStore()
const { sessions, currentSessionId } = storeToRefs(store)
const router = useRouter()

const editingSessionId = ref<string | null>(null)
const editTitle = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function handleNewChat() {
    store.createNewSession()
}

function handleSelectSession(id: string) {
    if (editingSessionId.value === id) return
    store.loadSession(id)
    router.push(`/c/${id}`)
}

async function handleDeleteSession(id: string, e: Event) {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this chat?')) {
        await store.deleteSession(id)
    }
}

function startRename(session: any, e: Event) {
    e.stopPropagation()
    editingSessionId.value = session.id
    editTitle.value = session.title
    nextTick(() => {
        editInputRef.value?.focus()
    })
}

async function confirmRename(e: Event) {
    e.stopPropagation()
    if (editingSessionId.value && editTitle.value.trim()) {
        await store.updateSessionTitle(editingSessionId.value, editTitle.value.trim())
    }
    cancelRename(e)
}

function cancelRename(e: Event) {
    e.stopPropagation()
    editingSessionId.value = null
    editTitle.value = ''
}
</script>

<template>
    <div class="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <!-- Header: New Chat -->
        <div class="p-4">
            <button @click="handleNewChat"
                class="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-4 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                <Plus class="h-4 w-4" />
                New Chat
            </button>
        </div>

        <!-- Session List -->
        <div class="flex-1 overflow-y-auto px-2">
            <div v-for="session in sessions" :key="session.id" @click="handleSelectSession(session.id)" :class="[
                'group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors min-h-[40px]',
                currentSessionId === session.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            ]">
                <MessageSquare class="h-4 w-4 shrink-0" />

                <!-- View Mode -->
                <template v-if="editingSessionId !== session.id">
                    <span class="truncate flex-1">{{ session.title }}</span>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <!-- Rename -->
                        <button @click="(e) => startRename(session, e)" class="hover:text-primary transition-colors p-1"
                            title="Rename">
                            <Edit2 class="h-3.5 w-3.5" />
                        </button>
                        <!-- Delete -->
                        <button @click="(e) => handleDeleteSession(session.id, e)"
                            class="hover:text-destructive transition-colors p-1" title="Delete">
                            <Trash2 class="h-3.5 w-3.5" />
                        </button>
                    </div>
                </template>

                <!-- Edit Mode -->
                <template v-else>
                    <input ref="editInputRef" v-model="editTitle" @click.stop @keydown.enter="confirmRename"
                        @keydown.esc="cancelRename"
                        class="flex-1 bg-transparent border border-input rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                    <button @click="confirmRename" class="text-green-500 p-1">
                        <Check class="h-3.5 w-3.5" />
                    </button>
                    <button @click="cancelRename" class="text-destructive p-1">
                        <X class="h-3.5 w-3.5" />
                    </button>
                </template>

            </div>
        </div>

        <!-- Footer: User Profile (Placeholder) -->
        <div class="p-4 border-t border-sidebar-border">
            <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div class="h-8 w-8 bg-muted rounded-full flex items-center justify-center">U</div>
                User
            </div>
        </div>
    </div>
</template>
