<script setup lang="ts">
import { cn } from "@/lib/utils";

interface Props {
  class?: string;
}

defineProps<Props>();
</script>

<template>
  <div :class="cn('flex gap-1.5 items-center py-2 px-1', $props.class)">
    <div class="w-1.5 h-1.5 bg-foreground rounded-full animate-typing"></div>
    <div
      class="w-1.5 h-1.5 bg-foreground rounded-full animate-typing [animation-delay:0.2s]"
    ></div>
    <div
      class="w-1.5 h-1.5 bg-foreground rounded-full animate-typing [animation-delay:0.4s]"
    ></div>
  </div>
</template>

<style scoped>
@keyframes typing {
  0%,
  100% {
    opacity: 0.2;
  }

  50% {
    opacity: 1;
  }
}

.animate-typing {
  animation: typing 0.8s ease-in-out infinite;
}
</style>
