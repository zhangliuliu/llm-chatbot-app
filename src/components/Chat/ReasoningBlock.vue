<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Brain, ChevronDown, ChevronUp, Loader2, Wrench } from 'lucide-vue-next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const props = defineProps<{
  content: string
  isStreaming?: boolean
  toolCount?: number
}>()

const isOpen = ref(true)
const duration = ref(0)
let timer: any = null

const startTimer = () => {
    if (timer) return
    const startTime = Date.now()
    timer = setInterval(() => {
        duration.value = Math.floor((Date.now() - startTime) / 1000)
    }, 1000)
}

const stopTimer = () => {
    if (timer) {
        clearInterval(timer)
        timer = null
    }
}

onMounted(() => {
    if (props.isStreaming) {
        startTimer()
    }
})

onUnmounted(() => {
    stopTimer()
})

watch(() => props.isStreaming, (newVal) => {
  if (newVal) {
      startTimer()
  } else {
    stopTimer()
    // Small delay for better UX
    setTimeout(() => {
      isOpen.value = false
    }, 800)
  }
}, { immediate: true })

</script>

<template>
  <div class="reasoning-block mt-4 mb-2">
    <Collapsible v-model:open="isOpen" class="w-full space-y-1">
      <div class="flex items-center space-x-3 px-0">
        <CollapsibleTrigger as-child>
          <div class="flex items-center gap-1.5 cursor-pointer group select-none">
            <div class="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground/70 transition-colors leading-none">
              <div class="flex h-4 w-4 items-center justify-center">
                <Brain v-if="!isStreaming" class="h-3.5 w-3.5" />
                <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
              </div>
              <span class="tracking-tight">
                {{ isStreaming ? 'Thinking...' : `Thought for ${duration} seconds` }}
              </span>
              <ChevronDown v-if="!isOpen" class="h-3.5 w-3.5 opacity-40" />
              <ChevronUp v-else class="h-3.5 w-3.5 opacity-40" />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <!-- Tool counter if present -->
        <div v-if="toolCount && toolCount > 0" class="flex items-center gap-1 text-[13px] font-medium text-muted-foreground/60 border-b border-dotted border-muted-foreground/30 pb-0.5">
            <Wrench class="h-3 w-3" />
            <span>{{ toolCount }} tools</span>
        </div>
      </div>
      
      <CollapsibleContent class="space-y-2 overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div class="relative ml-2 pl-4 py-1.5 text-sm text-muted-foreground/80 border-l-2 border-border leading-relaxed whitespace-pre-wrap italic">
          {{ content }}
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
