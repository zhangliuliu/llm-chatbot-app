<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "confirm"): void;
}>();

const handleUpdateOpen = (value: boolean) => {
  emit("update:isOpen", value);
};

const handleConfirm = () => {
  emit("confirm");
};
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="handleUpdateOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除这条消息？</AlertDialogTitle>
        <AlertDialogDescription>
          此操作无法撤销。该消息将从您的对话历史中永久移除。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleUpdateOpen(false)"
          >取消</AlertDialogCancel
        >
        <AlertDialogAction
          @click="handleConfirm"
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          确认删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
