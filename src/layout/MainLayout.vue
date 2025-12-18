<script setup lang="ts">
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <!-- Shadcn Sidebar -->
      <AppSidebar />

      <!-- Main Content Area -->
      <SidebarInset class="flex flex-col h-full overflow-hidden relative">
        <div class="flex-1 overflow-hidden relative flex flex-col">
          <router-view />
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>
