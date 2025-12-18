<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
    Search,
    SquarePen,
    Trash2,
    Edit2,
    Check,
    X,
    User,
    Settings,
    LogOut,
    Sparkles,
    ChevronsUpDown,
} from 'lucide-vue-next'
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
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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

const store = useChatStore()
const { sessions, currentSessionId } = storeToRefs(store)
const router = useRouter()
const { } = useSidebar()

const editingSessionId = ref<string | null>(null)
const editTitle = ref('')
const editInputRef = ref<InstanceType<typeof Input> | null>(null)

const isDeleteDialogOpen = ref(false)
const sessionToDelete = ref<string | null>(null)

function handleNewChat() {
    store.createNewSession()
}

function handleSelectSession(id: string) {
    if (editingSessionId.value === id) return
    store.loadSession(id)
    router.push(`/c/${id}`)
}

function handleDeleteSession(id: string, e: Event) {
    e.stopPropagation()
    sessionToDelete.value = id
    isDeleteDialogOpen.value = true
}

async function confirmDelete() {
    if (sessionToDelete.value) {
        await store.deleteSession(sessionToDelete.value)
        sessionToDelete.value = null
        isDeleteDialogOpen.value = false
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
    <Sidebar collapsible="icon" variant="sidebar" class="border-r-0">
        <SidebarHeader class="p-3 group-data-[collapsible=icon]:px-0 transition-all group/header">
            <!-- Header Container -->
            <div class="flex items-center h-9 relative">
                <!-- Expanded: Logo(L) + Trigger(R) -->
                <div class="flex items-center gap-2 group-data-[collapsible=icon]:hidden w-full px-1">
                    <div
                        class="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shrink-0">
                        <Sparkles class="h-4 w-4" />
                    </div>
                    <SidebarTrigger class="ml-auto h-8 w-8 hover:bg-muted" />
                </div>

                <!-- Collapsed: Centered Logo / Hover to Trigger -->
                <div
                    class="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full relative h-full">
                    <div
                        class="absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover/header:opacity-0 group-hover/header:pointer-events-none">
                        <div
                            class="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shrink-0">
                            <Sparkles class="h-4 w-4" />
                        </div>
                    </div>
                    <SidebarTrigger
                        class="h-8 w-8 opacity-0 group-hover/header:opacity-100 transition-opacity duration-300 hover:bg-muted z-20" />
                </div>
            </div>

            <!-- New Chat & Search Actions -->
            <SidebarMenu class="mt-2">
                <SidebarMenuItem>
                    <SidebarMenuButton @click="handleNewChat" tooltip="New Chat"
                        class="h-10 px-3 hover:bg-muted transition-colors group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto justify-start group-data-[collapsible=icon]:justify-center">
                        <SquarePen class="h-4 w-4 shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden font-medium">新建对话</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Search"
                        class="h-10 px-3 hover:bg-muted transition-colors group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto justify-start group-data-[collapsible=icon]:justify-center">
                        <Search class="h-4 w-4 shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden text-muted-foreground">搜索</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        <!-- Session List -->
        <SidebarContent class="px-2">
            <SidebarGroup>
                <SidebarGroupLabel
                    class="px-2 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
                    最近对话
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem v-for="session in sessions" :key="session.id" class="group/menu-item">
                            <SidebarMenuButton :isActive="currentSessionId === session.id"
                                @click="handleSelectSession(session.id)" :tooltip="session.title"
                                class="h-9 px-3 rounded-lg transition-all aria-[current=page]:bg-muted hover:bg-muted group-has-data-[sidebar=menu-action]/menu-item:pr-14 group-data-[collapsible=icon]:invisible">

                                <!-- View Mode -->
                                <template v-if="editingSessionId !== session.id">
                                    <span class="truncate flex-1 py-1 group-data-[collapsible=icon]:hidden">{{
                                        session.title }}</span>
                                </template>

                                <!-- Edit Mode -->
                                <template v-else>
                                    <Input ref="editInputRef" v-model="editTitle" @click.stop
                                        @keydown.enter="confirmRename" @keydown.esc="cancelRename"
                                        class="h-7 px-1 text-xs focus-visible:ring-1 bg-background" />
                                </template>
                            </SidebarMenuButton>

                            <!-- Actions -->
                            <template v-if="editingSessionId !== session.id">
                                <SidebarMenuAction showOnHover @click="(e: Event) => startRename(session, e)"
                                    title="Rename"
                                    class="right-7 h-7 w-7 opacity-0 group-hover/menu-item:opacity-100 transition-opacity text-muted-foreground/60 hover:text-foreground">
                                    <Edit2 class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                                <SidebarMenuAction showOnHover @click="(e: Event) => handleDeleteSession(session.id, e)"
                                    title="Delete"
                                    class="right-1 h-7 w-7 opacity-0 group-hover/menu-item:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive">
                                    <Trash2 class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                            </template>
                            <template v-else>
                                <SidebarMenuAction @click="confirmRename"
                                    class="right-7 text-green-500 hover:text-green-600">
                                    <Check class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                                <SidebarMenuAction @click="cancelRename"
                                    class="right-1 text-destructive hover:text-red-600">
                                    <X class="h-3.5 w-3.5" />
                                </SidebarMenuAction>
                            </template>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <!-- Footer: User Profile Dropdown -->
        <SidebarFooter class="p-3 group-data-[collapsible=icon]:px-0 border-t-0 transition-all">
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <SidebarMenuButton size="lg"
                                class="w-full h-12 gap-3 px-2 rounded-xl transition-all hover:bg-muted data-[state=open]:bg-muted group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                                <Avatar class="h-9 w-9 rounded-xl shrink-0 border border-border/50 shadow-sm">
                                    <AvatarImage
                                        src="https://api.dicebear.com/7.x/notionists/svg?seed=User&backgroundColor=b6e3f4,c0aede,d1d4f9" />
                                    <AvatarFallback
                                        class="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white uppercase text-[10px] font-bold">
                                        {{ 'User'.substring(0, 2) }}
                                    </AvatarFallback>
                                </Avatar>
                                <div class="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                                    <span class="font-medium text-sm truncate w-full">游客用户</span>
                                    <span
                                        class="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">旗舰版</span>
                                </div>
                                <ChevronsUpDown
                                    class="ml-auto h-4 w-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-56" side="right" align="end" :side-offset="12">
                            <DropdownMenuLabel class="font-normal text-xs text-muted-foreground">我的账户
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem class="gap-2 focus:bg-muted cursor-pointer">
                                <User class="h-4 w-4 text-muted-foreground" />
                                <span>个人中心</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem class="gap-2 focus:bg-muted cursor-pointer">
                                <Settings class="h-4 w-4 text-muted-foreground" />
                                <span>设置</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                class="gap-2 focus:bg-muted cursor-pointer text-blue-500 focus:text-blue-600">
                                <Sparkles class="h-4 w-4" />
                                <span>升级专业版</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                class="gap-2 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                                <LogOut class="h-4 w-4" />
                                <span>退出登录</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认删除对话？</AlertDialogTitle>
                <AlertDialogDescription>
                    此操作无法撤销。该对话及其所有消息将被永久删除。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="sessionToDelete = null">取消</AlertDialogCancel>
                <AlertDialogAction @click="confirmDelete"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    确认删除
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
