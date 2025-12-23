<script setup lang="ts">
import { computed } from "vue";
import { useChatStore } from "@/stores/chat";
import { Check, Copy, RotateCcw, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/db";

const props = defineProps<{
  message: Message;
  copied: boolean;
}>();

const emit = defineEmits<{
  (e: "copy"): void;
  (e: "regenerate", message: Message): void;
  (e: "delete"): void;
}>();

const store = useChatStore();

// Check if this is the last message and currently streaming
const isLastStreamingMessage = computed(() => {
  return (
    store.isStreaming &&
    store.messages[store.messages.length - 1]?.id === props.message.id
  );
});
</script>

<template>
  <div
    class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
    :class="{
      'pointer-events-none opacity-0!': isLastStreamingMessage,
    }"
  >
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-11 text-muted-foreground hover:text-foreground"
      title="Copy"
      @click="$emit('copy')"
    >
      <Check v-if="copied" class="h-4 w-4 text-green-500" />
      <Copy v-else class="h-4 w-4" />
    </Button>

    <Button
      v-if="message.role === 'assistant'"
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-foreground"
      title="Retry"
      @click="$emit('regenerate', message)"
    >
      <RotateCcw class="h-4 w-4" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
      title="Delete Message"
      @click="$emit('delete')"
    >
      <Trash2 class="h-4 w-4" />
    </Button>
  </div>
</template>
