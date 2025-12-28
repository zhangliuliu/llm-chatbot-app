<script setup lang="ts">
import { User } from "lucide-vue-next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClipboard } from "@vueuse/core";
import { useChatStore } from "@/stores/chat";
import MessageContent from "./MessageContent.vue";
import MessageActions from "./MessageActions.vue";
import MessageDeleteDialog from "./MessageDeleteDialog.vue";
import type { Message } from "@/lib/db";
import { computed, ref } from "vue";

const props = defineProps<{
  messages: Message[];
}>();

const emit = defineEmits<{
  (e: "regenerate", message: Message): void;
}>();

const store = useChatStore();
const { copy, copied } = useClipboard();
const isDeleteDialogOpen = ref(false);

const primaryMessage = computed(() => props.messages[0]);
const lastMessage = computed(() => props.messages[props.messages.length - 1]);

const handleCopyMessage = () => {
    // Copy combined content of all messages in group
    const combinedContent = props.messages
        .map(m => m.content)
        .filter(c => !!c && c.trim() !== "")
        .join('\n\n');
    copy(combinedContent || "");
};

const handleRegenerate = () => {
  // Regenerate from the last one
  emit("regenerate", lastMessage.value);
};

const openDeleteDialog = () => isDeleteDialogOpen.value = true;
const closeDeleteDialog = () => isDeleteDialogOpen.value = false;

const handleDeleteGroup = async () => {
    // Delete all messages in this group
    for (const msg of props.messages) {
        if (msg.id) {
            await store.deleteMessage(msg.id);
        }
    }
    isDeleteDialogOpen.value = false;
};

// handleCopyCode is standard for code blocks
const handleCopyCode = async (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest(".copy-btn") as HTMLButtonElement;
    if (!target) return;
    const codeBlock = target.closest(".code-block");
    if (!codeBlock) return;
    const codeElement = codeBlock.querySelector("code");
    if (!codeElement) return;
    try {
        await navigator.clipboard.writeText(codeElement.innerText);
        const label = target.querySelector("span:last-child");
        if (label) {
            const originalText = label.textContent;
            label.textContent = "Copied!";
            setTimeout(() => label.textContent = originalText, 2000);
        }
    } catch (err) { console.error(err); }
};
</script>

<template>
  <div
    class="flex gap-4 group"
    :class="primaryMessage.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- Message Bubble -->
    <div
      class="flex flex-col gap-1"
      :class="
        primaryMessage.role === 'user'
          ? 'items-end max-w-[85%]'
          : 'items-start flex-1 min-w-0 max-w-full'
      "
    >
      <MessageContent :messages="props.messages" @copy-code="handleCopyCode" />

      <MessageActions
        :message="lastMessage"
        :copied="copied"
        @copy="handleCopyMessage"
        @regenerate="handleRegenerate"
        @delete="openDeleteDialog"
      />
    </div>

    <!-- Avatar -->
    <Avatar
      v-if="primaryMessage.role === 'user'"
      class="h-9 w-9 mt-0.5 border-2 border-background shadow-sm shrink-0"
    >
      <AvatarImage
        src="https://api.dicebear.com/7.x/notionists/svg?seed=User&backgroundColor=b6e3f4,c0aede,d1d4f9"
        alt="User"
      />
      <AvatarFallback
        class="bg-linear-to-br from-indigo-500 to-purple-500 text-white"
      >
        <User class="w-5 h-5" />
      </AvatarFallback>
    </Avatar>
  </div>

  <MessageDeleteDialog
    :is-open="isDeleteDialogOpen"
    @update:is-open="closeDeleteDialog"
    @confirm="handleDeleteGroup"
  />
</template>
