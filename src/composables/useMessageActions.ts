import { ref } from "vue";
import { useClipboard } from "@vueuse/core";
import { useChatStore } from "@/stores/chat";
import type { Message } from "@/lib/db";

export function useMessageActions(message: Message) {
  const { copy, copied } = useClipboard();
  const store = useChatStore();
  const isDeleteDialogOpen = ref(false);

  // Copy message content
  const handleCopyMessage = () => {
    copy(message.content || "");
  };

  // Copy code block content
  const handleCopyCode = async (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      ".copy-btn"
    ) as HTMLButtonElement;
    if (!target) return;

    const codeBlock = target.closest(".code-block");
    if (!codeBlock) return;

    const codeElement = codeBlock.querySelector("code");
    if (!codeElement) return;

    const code = codeElement.innerText;

    try {
      await navigator.clipboard.writeText(code);

      const label = target.querySelector("span:last-child");
      const icon = target.querySelector("svg");

      if (label) {
        const originalText = label.textContent;
        label.textContent = "Copied!";
        target.classList.add("text-green-500");
        if (icon) icon.style.display = "none";

        setTimeout(() => {
          label.textContent = originalText;
          target.classList.remove("text-green-500");
          if (icon) icon.style.display = "";
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy logic", err);
    }
  };

  // Delete message
  const handleDeleteMessage = () => {
    if (message.id) {
      store.deleteMessage(message.id);
    }
    isDeleteDialogOpen.value = false;
  };

  // Open delete dialog
  const openDeleteDialog = () => {
    isDeleteDialogOpen.value = true;
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    isDeleteDialogOpen.value = false;
  };

  return {
    copied,
    isDeleteDialogOpen,
    handleCopyMessage,
    handleCopyCode,
    handleDeleteMessage,
    openDeleteDialog,
    closeDeleteDialog,
  };
}
