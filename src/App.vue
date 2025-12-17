<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'

const store = useChatStore()

onMounted(() => {
  store.init()
})
</script>

<template>
  <router-view />
</template>

<style scoped></style>
