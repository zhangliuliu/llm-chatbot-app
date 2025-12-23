<script setup lang="ts">
import { User } from "lucide-vue-next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessageActions } from "@/composables/useMessageActions";
import MessageContent from "./MessageContent.vue";
import MessageActions from "./MessageActions.vue";
import MessageDeleteDialog from "./MessageDeleteDialog.vue";
import type { Message } from "@/lib/db";

const props = defineProps<{
  message: Message;
}>();

const emit = defineEmits<{
  (e: "regenerate", message: Message): void;
}>();

// Use message actions composable
const {
  copied,
  isDeleteDialogOpen,
  handleCopyMessage,
  handleCopyCode,
  handleDeleteMessage,
  openDeleteDialog,
  closeDeleteDialog,
} = useMessageActions(props.message);

const handleRegenerate = () => {
  emit("regenerate", props.message);
};
</script>

<template>
  <div
    class="flex gap-4 group"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- Message Bubble -->
    <div
      class="flex flex-col gap-1"
      :class="
        message.role === 'user'
          ? 'items-end max-w-[85%]'
          : 'items-start flex-1 min-w-0 max-w-full'
      "
    >
      <!-- Message Content -->
      <MessageContent :message="message" @copy-code="handleCopyCode" />

      <!-- Message Actions -->
      <MessageActions
        :message="message"
        :copied="copied"
        @copy="handleCopyMessage"
        @regenerate="handleRegenerate"
        @delete="openDeleteDialog"
      />
    </div>

    <!-- Avatar (User) -->
    <Avatar
      v-if="message.role === 'user'"
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

  <!-- Delete Confirmation Dialog -->
  <MessageDeleteDialog
    :is-open="isDeleteDialogOpen"
    @update:is-open="closeDeleteDialog"
    @confirm="handleDeleteMessage"
  />
</template>
