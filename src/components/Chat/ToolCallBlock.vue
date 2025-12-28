<script setup lang="ts">
import { ref } from 'vue'
import { Wrench, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { ToolCall } from '@/lib/db'

const props = defineProps<{
  tool: ToolCall
}>()

const isOpen = ref(false)

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500/5 text-green-600 border-green-500/20'
    case 'error': return 'bg-red-500/5 text-red-600 border-red-500/20'
    case 'running': return 'bg-blue-500/5 text-blue-600 border-blue-500/20'
    default: return 'bg-muted text-muted-foreground border-muted-foreground/20'
  }
}
</script>

<template>
  <div class="tool-call-block my-3">
    <Collapsible v-model:open="isOpen" class="w-full border border-border/60 rounded-xl overflow-hidden bg-muted/20">
      <CollapsibleTrigger as-child>
        <div class="flex items-center justify-between py-2 px-4 cursor-pointer transition-colors select-none group">
          <div class="flex items-center gap-4">
            <!-- Tool Type Icon -->
            <div class="flex items-center gap-2 text-foreground/70 font-medium transition-colors">
              <Wrench class="h-4 w-4 text-muted-foreground/50" />
              <span class="text-[13px] tracking-tight">{{ tool.name === 'bash' ? 'Bash' : tool.name }}</span>
            </div>

            <!-- Status Badge (Same line) -->
            <Badge 
              variant="secondary" 
              class="text-[11px] h-5 px-2 py-0 font-bold border-transparent shadow-none"
              :class="getStatusColor(tool.status)"
            >
              <Loader2 v-if="tool.status === 'running'" class="mr-1 h-2.5 w-2.5 animate-spin" />
              <CheckCircle2 v-else-if="tool.status === 'completed'" class="mr-1 h-3 w-3" />
              <AlertCircle v-else-if="tool.status === 'error'" class="mr-1 h-3 w-3" />
              {{ tool.status === 'completed' ? 'Completed' : (tool.status || 'Pending') }}
            </Badge>

          </div>
          <div class="flex items-center gap-2 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
            <ChevronDown v-if="!isOpen" class="h-4 w-4" />
            <ChevronUp v-else class="h-4 w-4" />
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent class="border-t border-border/40 bg-muted/5">
        <div class="p-4 space-y-4">
          <!-- Arguments -->
          <div class="space-y-1.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Arguments</div>
            <div class="p-3 rounded-lg bg-black/5 dark:bg-black/20 border border-border/40 text-xs font-mono overflow-x-auto whitespace-pre">
              {{ tool.arguments }}
            </div>
          </div>
          
          <!-- Result -->
          <div v-if="tool.result || tool.status === 'running' || tool.status === 'completed'" class="space-y-1.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Result</div>
            <ScrollArea class="h-fit max-h-[300px] w-full rounded-lg border border-border/40 bg-black/5 dark:bg-black/20">
              <div class="p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                <template v-if="tool.status === 'running' && !tool.result">
                  <div class="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Loader2 class="h-3 w-3 animate-spin" />
                    Executing tool...
                  </div>
                </template>
                <template v-else-if="tool.result">
                  {{ tool.result }}
                </template>
                <template v-else-if="tool.status === 'completed' && !tool.result">
                  <span class="text-muted-foreground italic">No output returned.</span>
                </template>
              </div>
            </ScrollArea>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
