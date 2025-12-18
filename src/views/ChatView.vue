<script setup lang="ts">
import { watch, ref, nextTick, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useChatStore } from "@/stores/chat";
import { storeToRefs } from "pinia";
import ChatInput from "@/components/Chat/ChatInput.vue";
import MessageItem from "@/components/Chat/MessageItem.vue";
import { ArrowDown } from "lucide-vue-next";

const route = useRoute();
const store = useChatStore();
const { messages, isLoading } = storeToRefs(store);
const messagesContainerRef = ref<HTMLDivElement | null>(null);
const userScrolled = ref(false);
const showScrollButton = ref(false);
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
const isAutoScrolling = ref(false);

// Check if user is at bottom
function checkIfAtBottom() {
  if (!messagesContainerRef.value) return true;

  const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.value;
  // Consider "at bottom" if within 50px of bottom
  const threshold = 50;
  const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

  return atBottom;
}

// Scroll to bottom
function scrollToBottom(smooth = false) {
  if (messagesContainerRef.value) {
    isAutoScrolling.value = true;
    messagesContainerRef.value.scrollTo({
      top: messagesContainerRef.value.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    // After auto-scroll, update state
    setTimeout(() => {
      isAutoScrolling.value = false;
      userScrolled.value = false;
      showScrollButton.value = false;
    }, 50);
  }
}

// Detect user scroll intent immediately (wheel or touch)
function handleUserScrollIntent() {
  // User is trying to scroll, mark it immediately
  if (!isAutoScrolling.value) {
    userScrolled.value = true;
  }
}

// Handle scroll event - update button visibility
function handleScroll() {
  // Ignore scroll events caused by auto-scrolling
  if (isAutoScrolling.value) {
    return;
  }

  // Clear existing timeout
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }

  // Debounce scroll events to prevent flickering
  scrollTimeout = setTimeout(() => {
    requestAnimationFrame(() => {
      const atBottom = checkIfAtBottom();

      if (!atBottom && messages.value.length > 0) {
        // User has scrolled up and there are messages
        if (!showScrollButton.value) {
          showScrollButton.value = true;
        }
        userScrolled.value = true;
      } else if (atBottom) {
        // User is at bottom
        if (showScrollButton.value) {
          showScrollButton.value = false;
        }
        userScrolled.value = false;
      }
    });
  }, 50);
}

// Watch messages to scroll (only if user hasn't scrolled up)
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (!userScrolled.value) {
        scrollToBottom();
      }
    });
  },
  { flush: "post" }
);

// Watch message content changes (streaming) - only if user hasn't scrolled up
watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => {
    if (!userScrolled.value) {
      nextTick(() => {
        // Double RAF to ensure it happens after MessageItem's throttled update
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }
);

// Load session on mount or route change
watch(
  () => route.params.id,
  async (newId) => {
    if (newId && typeof newId === "string") {
      await store.loadSession(newId);
    } else {
      // New Chat view (no ID)
      store.$patch({ currentSessionId: null, messages: [] });
    }
    // Always scroll to bottom when loading a new session
    nextTick(() => {
      scrollToBottom();
      userScrolled.value = false;
      showScrollButton.value = false;
    });
  },
  { immediate: true }
);

// Setup scroll listener
onMounted(() => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.addEventListener("scroll", handleScroll);
    // Listen for wheel events (mouse scroll) to detect user intent immediately
    messagesContainerRef.value.addEventListener(
      "wheel",
      handleUserScrollIntent,
      { passive: true }
    );
    // Listen for touch events (mobile scroll) to detect user intent immediately
    messagesContainerRef.value.addEventListener(
      "touchstart",
      handleUserScrollIntent,
      { passive: true }
    );
  }
});

onUnmounted(() => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.removeEventListener("scroll", handleScroll);
    messagesContainerRef.value.removeEventListener(
      "wheel",
      handleUserScrollIntent
    );
    messagesContainerRef.value.removeEventListener(
      "touchstart",
      handleUserScrollIntent
    );
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});

function handleSend(content: string) {
  store.sendMessage(content);
  // Scroll to bottom when sending a message
  nextTick(() => {
    scrollToBottom();
    userScrolled.value = false;
    showScrollButton.value = false;
  });
}

function handleStop() {
  store.stopGeneration();
}

function handleScrollToBottom() {
  scrollToBottom(true);
  userScrolled.value = false;
  showScrollButton.value = false;
}
</script>

<template>
  <div class="flex h-full flex-col items-center relative">
    <!-- Messages Area -->
    <div ref="messagesContainerRef" class="flex-1 w-full overflow-y-auto p-4 md:p-10 scroll-smooth">
      <div class="max-w-3xl mx-auto space-y-6">
        <!-- Introduction / Empty State -->
        <div v-if="messages.length === 0"
          class="flex flex-col items-center justify-center h-full text-center space-y-4 mt-20">
          <h1
            class="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Hello, I'm Moss</h1>
          <p class="text-muted-foreground text-lg">有什么我可以帮您的吗？</p>
        </div>

        <!-- Message List -->
        <div v-for="msg in store.messages" :key="msg.id">
          <MessageItem :message="msg" />
        </div>
      </div>
    </div>

    <!-- Scroll to Bottom Button Container -->
    <div class="absolute bottom-[200px] w-full px-4 pointer-events-none z-20">
      <div class="max-w-3xl mx-auto relative">
        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <button v-if="showScrollButton" @click="handleScrollToBottom"
            class="absolute right-0 top-0 p-3 bg-background border border-border rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 hover:scale-105 active:scale-95 pointer-events-auto"
            aria-label="Scroll to bottom">
            <ArrowDown :size="20" class="text-foreground" />
          </button>
        </Transition>
      </div>
    </div>

    <!-- Input Area -->
    <ChatInput :is-loading="isLoading" @send="handleSend" @stop="handleStop" />
  </div>
</template>
