<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Plus, MessageSquare, Trash2, Edit2, Check, X, User } from 'lucide-vue-next'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuAction,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const store = useChatStore()
const { sessions, currentSessionId } = storeToRefs(store)
const router = useRouter()

const editingSessionId = ref<string | null>(null)
const editTitle = ref('')
const editInputRef = ref<InstanceType<typeof Input> | null>(null)

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
        const inputEl = editInputRef.value?.$el as HTMLInputElement | undefined
        inputEl?.focus()
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
    <Sidebar collapsible="icon" variant="sidebar">
        <!-- Header: New Chat -->
        <SidebarHeader class="p-4">
            <Button @click="handleNewChat" variant="outline" class="w-full justify-start gap-2 h-10 px-4">
                <Plus class="h-4 w-4" />
                <span class="group-data-[collapsible=icon]:hidden">New Chat</span>
            </Button>
        </SidebarHeader>

        <!-- Session List -->
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem v-for="session in sessions" :key="session.id">
                            <SidebarMenuButton :isActive="currentSessionId === session.id"
                                @click="handleSelectSession(session.id)" :tooltip="session.title">
                                <MessageSquare class="h-4 w-4 shrink-0" />

                                <!-- View Mode -->
                                <template v-if="editingSessionId !== session.id">
                                    <span class="truncate flex-1">{{ session.title }}</span>
                                </template>

                                <!-- Edit Mode -->
                                <template v-else>
                                    <Input ref="editInputRef" v-model="editTitle" @click.stop
                                        @keydown.enter="confirmRename" @keydown.esc="cancelRename"
                                        class="h-7 px-1 text-xs focus-visible:ring-1" />
                                </template>
                            </SidebarMenuButton>

                            <!-- Actions -->
                            <template v-if="editingSessionId !== session.id">
                                <SidebarMenuAction showOnHover @click="(e: Event) => startRename(session, e)"
                                    title="Rename" class="right-8">
                                    <Edit2 class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                                <SidebarMenuAction showOnHover @click="(e: Event) => handleDeleteSession(session.id, e)"
                                    title="Delete">
                                    <Trash2 class="h-3.5 w-3.5 hover:text-destructive" />
                                </SidebarMenuAction>
                            </template>
                            <template v-else>
                                <SidebarMenuAction @click="confirmRename" class="right-8 text-green-500">
                                    <Check class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                                <SidebarMenuAction @click="cancelRename" class="text-destructive">
                                    <X class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                            </template>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <!-- Footer: User Profile -->
        <SidebarFooter class="p-4 border-t border-sidebar-border">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" class="w-full justify-start gap-3">
                        <div class="h-8 w-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                            <User class="h-4 w-4" />
                        </div>
                        <div class="flex flex-col items-start leading-tight group-data-[collapsible=icon]:hidden">
                            <span class="font-medium">User</span>
                            <span class="text-xs text-muted-foreground">Free Plan</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
</template>
