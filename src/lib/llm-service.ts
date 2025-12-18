import OpenAI from 'openai'

export interface StreamChunk {
    content: string
    done: boolean
}

export function generateId() {
    return Math.random().toString(36).substring(2, 9)
}

// Configuration
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !API_KEY

const openai = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    dangerouslyAllowBrowser: true // Since this is a client-side demo
})

/**
 * Unified interface for chat responses
 */
export async function* getChatResponse(messages: { role: string, content: string }[], options?: { signal?: AbortSignal }): AsyncGenerator<StreamChunk> {
    if (USE_MOCK) {
        yield* mockStreamResponse(messages)
    } else {
        yield* openaiStreamResponse(messages, options)
    }
}

/**
 * Real OpenAI Streaming Response
 */
async function* openaiStreamResponse(messages: { role: string, content: string }[], options?: { signal?: AbortSignal }): AsyncGenerator<StreamChunk> {
    try {
        const stream = await openai.chat.completions.create({
            model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: messages as any,
            stream: true,
        }, { signal: options?.signal })

        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || ''
            if (content) {
                yield { content, done: false }
            }
        }
        yield { content: '', done: true }
    } catch (error) {
        console.error('OpenAI Stream Error:', error)
        throw error
    }
}

/**
 * Simulates a streaming LLM response
 */
export async function* mockStreamResponse(messages: { role: string, content: string }[]): AsyncGenerator<StreamChunk> {
    const prompt = messages[messages.length - 1]?.content || ''
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    await delay(500) // Initial latency

    const englishResponse = `Here is a comprehensive simulated response for: "${prompt}"

## Markdown Features Demo

### 1. Typography & Styles
We can support **bold text**, *italicized emphasis*, ~~strikethrough~~, and \`inline code snippets\`. 

> "Innovation distinguishes between a leader and a follower."
>
> — *Steve Jobs*

### 2. Structured Lists
Here is a nested list example:
- **Frontend Technologies**
  - Vue 3 / Nuxt
  - React / Next.js
  - Svelte
- **Backend Technologies**
  1. Node.js
  2. Python (FastAPI/Django)
  3. Go

**Task List:**
- [x] Implement Streaming
- [x] Support Markdown
- [ ] Optimize Performance
- [ ] Add Voice Input

### 3. Code Blocks
We need to ensure syntax highlighting works correctly for different languages.

**Python:**
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
\`\`\`

**TypeScript (Interface):**
\`\`\`typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
\`\`\`

### 4. Tables
Data representation needs to be clear.

| Feature | Status | Priority |
| :--- | :---: | :---: |
| **Streaming** | ✅ Ready | High |
| **History** | 🚧 In Progress | Medium |
| **Plugins** | ❌ Pending | Low |

### 5. Mathematical Formulas (LaTeX)
Advanced chatbots simulate reasoning with math.

**Maxwell's Equations:**
$$
\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}
$$

**Quadratic Formula:**
The solution is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

### 6. Long Content Testing
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 

---
*Simulation complete. Generated at ${new Date().toLocaleTimeString()}.*`

    const chineseResponse = `这是一个针对问题："${prompt}" 的中文模拟回复。

## Markdown 功能完整演示

### 1. 排版与样式 (Typography)
我们支持 **加粗文本**、*斜体强调*、~~删除线~~ 以及 \`行内代码\` 的混合排版。

> "海内存知己，天涯若比邻。"
>
> — *王勃《送杜少府之任蜀州》*

### 2. 列表系统 (Lists)
多级列表演示：
- **前端技术栈**
  - Vue 3 / Nuxt.js (推荐)
  - React / Next.js
  - SolidJS
- **后端技术栈**
  1. Spring Boot (Java)
  2. Gin (Go)
  3. FastAPI (Python)

**待办事项列表:**
- [x] 完成流式传输模块
- [x] 支持中文 Markdown 渲染
- [ ] 优化长文本渲染性能
- [ ] 增加多模态支持

### 3. 代码高亮 (Code Blocks)
测试不同语言的代码高亮显示效果。

**Go 语言示例:**
\`\`\`go
package main

import "fmt"

func main() {
    messages := []string{"你好", "世界", "LLM"}
    for i, msg := range messages {
        fmt.Printf("索引: %d, 内容: %s\\n", i, msg)
    }
}
\`\`\`

**Vue 组件示例:**
\`\`\`vue
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">点击次数: {{ count }}</button>
</template>
\`\`\`

### 4. 表格数据 (Tables)
展示复杂数据的对齐与展示。

| 模块名称 | 开发状态 | 负责人 | 优先级 |
| :--- | :---: | :---: | :---: |
| **核心引擎** | ✅ 已上线 | 张三 | P0 |
| **用户系统** | 🚧 开发中 | 李四 | P1 |
| **支付网关** | ❌ 待排期 | 王五 | P2 |

### 5. 数学公式 (LaTeX)
测试数学公式渲染能力。

**由于** $e^{i\\pi} + 1 = 0$，我们知道这是数学中最优美的公式。

**高斯积分:**
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### 6. 长文本与古诗词
**《将进酒》 - 李白**

君不见黄河之水天上来，奔流到海不复回。
君不见高堂明镜悲白发，朝如青丝暮成雪。
人生得意须尽欢，莫使金樽空对月。
天生我材必有用，千金散尽还复来。

---
*模拟生成结束。时间：${new Date().toLocaleTimeString('zh-CN')}*`

    // Randomly select one response
    const response = Math.random() > 0.5 ? englishResponse : chineseResponse
    
    const chunkSize = 5
    for (let i = 0; i < response.length; i += chunkSize) {
        await delay(10) // Typing effect
        yield {
            content: response.slice(i, i + chunkSize),
            done: false
        }
    }
    
    yield { content: '', done: true }
}

