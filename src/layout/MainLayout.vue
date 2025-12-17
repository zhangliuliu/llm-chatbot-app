<script setup lang="ts">
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-[260px] flex-col overflow-hidden">
      <AppSidebar />
    </aside>

    <!-- Main Content -->
    <main class="flex flex-1 flex-col h-full overflow-hidden relative">
        <!-- Mobile Header (TODO: Add Sheet Trigger) -->
        <!-- <header class="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden"> -->
            <!-- Menu button here -->
        <!-- </header> -->

        <div class="flex-1 overflow-hidden relative flex flex-col">
            <router-view />
        </div>
    </main>
  </div>
</template>
