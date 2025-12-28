import OpenAI from "openai";

export interface StreamChunk {
  content?: string;
  reasoning_content?: string;
  tool_calls?: any[];
  done: boolean;
  error?: string;
}

/**
 * Executes a tool call and returns the result as a string.
 */
export async function executeTool(name: string, args: string): Promise<string> {
  console.log(`Executing tool: ${name} with args: ${args}`);
  try {
    const parsedArgs = JSON.parse(args || "{}");

    switch (name) {
      case "get_weather":
        return `The current weather in ${parsedArgs.location || 'unknown location'} is 22°C and sunny.`;

      case "web_search":
        return `Search results for "${parsedArgs.query}": \n1. DeepSeek LLM guide...\n2. OpenAI API documentation...\n3. Weather in ${parsedArgs.location || 'various cities'}...`;

      case "calculator":
        try {
          // Warning: Simple eval for demo. In production use a math library.
          const result = eval(parsedArgs.expression);
          return `Result: ${result}`;
        } catch (e) {
          return `Error evaluating expression: ${e}`;
        }

      default:
        return `Tool "${name}" executed successfully. (Mock result)`;
    }
  } catch (error) {
    return `Error parsing arguments: ${error}`;
  }
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Configuration
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const BASE_URL =
  import.meta.env.VITE_OPENAI_BASE_URL || "https://api.openai.com/v1";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || !API_KEY;

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
  dangerouslyAllowBrowser: true, // Since this is a client-side demo
});

/**
 * Unified interface for chat responses
 */
export async function* getChatResponse(
  messages: any[],
  options?: { signal?: AbortSignal }
): AsyncGenerator<StreamChunk> {
  if (USE_MOCK) {
    yield* mockStreamResponse(messages);
  } else {
    yield* openaiStreamResponse(messages, options);
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "The city and state, e.g. San Francisco, CA" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Evaluate a mathematical expression",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "The math expression to evaluate, e.g. '2 + 2'" },
        },
        required: ["expression"],
      },
    },
  }
];

/**
 * Real OpenAI Streaming Response
 */
async function* openaiStreamResponse(
  messages: any[],
  options?: { signal?: AbortSignal }
): AsyncGenerator<StreamChunk> {
  try {
    const response = await openai.chat.completions.create(
      {
        model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4.1-nano",
        messages: messages.map(m => {
          const msg: any = {
            role: m.role,
            content: m.content || "",
          };
          if (m.tool_calls && m.tool_calls.length > 0) {
            msg.tool_calls = m.tool_calls.map((tc: any) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments }
            }));
          }
          if (m.role === 'tool' && m.tool_call_id) {
            msg.tool_call_id = m.tool_call_id;
          }
          if (m.reasoning_content) {
            msg.reasoning_content = m.reasoning_content;
          }
          return msg;
        }),
        stream: true,
        tools: TOOLS as any,
        tool_choice: "auto",
        // DeepSeek specific: enable thinking if using deepseek-chat
        extra_body: (import.meta.env.VITE_OPENAI_MODEL?.includes('deepseek') && !import.meta.env.VITE_OPENAI_MODEL?.includes('reasoner'))
          ? { thinking: { type: "enabled" } }
          : undefined
      } as any,
      { signal: options?.signal }
    );

    const stream = response as unknown as AsyncIterable<any>;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      const content = delta.content || "";
      const reasoning_content = (delta as any).reasoning_content || "";
      const tool_calls = (delta as any).tool_calls || undefined;

      if (content || reasoning_content || tool_calls) {
        yield {
          content,
          reasoning_content,
          tool_calls,
          done: false
        };
      }
    }
    yield { done: true };
  } catch (error) {
    console.error("OpenAI Stream Error:", error);
    throw error;
  }
}

import { MOCK_RESPONSES } from "./mock-data";

/**
 * Simulates a streaming LLM response
 */
export async function* mockStreamResponse(
  messages: { role: string; content: string }[]
): AsyncGenerator<StreamChunk> {
  const prompt = messages[messages.length - 1]?.content || "";
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  await delay(1500); // Initial latency

  // Determine if this is a "full demo" request
  const isFullDemo = prompt.includes("全家桶") || prompt.includes("full demo") || prompt.includes("all");

  // 1. Simulate Reasoning
  if (isFullDemo || prompt.includes("思考") || prompt.includes("thinking") || prompt.includes("why")) {
    const thoughts = isFullDemo
      ? "正在分析您的全家桶需求...\n1. 准备 Mermaid 流程图\n2. 构建 Markmap 思维导图\n3. 准备多媒体素材\n4. 模拟工具调用...\n\n"
      : "Thinking process:\n1. Analyze user request...\n2. Consider context...\n3. Formulate response...\n\n";
    for (const char of thoughts) {
      await delay(20);
      yield { reasoning_content: char, done: false };
    }
  }

  // 2. Simulate Tool Call (Only for Full Demo)
  if (isFullDemo) {
    // Start tool call
    yield {
      tool_calls: [{
        index: 0,
        id: "call_" + generateId(),
        function: { name: "get_weather", arguments: "" }
      }],
      done: false
    };
    await delay(200);
    // Stream arguments
    const args = '{"location": "Beijing"}';
    for (const char of args) {
      await delay(10);
      yield {
        tool_calls: [{
          index: 0,
          function: { arguments: char }
        }],
        done: false
      };
    }
    await delay(500);
  }

  // 3. Select response based on prompt or random
  let responseText = "";
  if (isFullDemo) {
    responseText = `好的，为您准备了组件全家桶展示：

### 1. Mermaid 流程图
\`\`\`mermaid
graph TD
    A[开始] --> B{是否通过?}
    B -- 是 --> C[结束]
    B -- 否 --> D[重试]
    D --> B
\`\`\`

### 2. Markmap 思维导图
\`\`\`markmap
# 核心技术栈
## 前端
- Vue 3
- Tailwind CSS
- Shadcn Vue
## 后端
- OpenAI API
- IndexedDB
\`\`\`

### 3. 多媒体展示
**音频示例：**
https://www.w3schools.com/html/horse.mp3

**视频示例：**
https://www.w3schools.com/html/mov_bbb.mp4

**图片展示：**
![Vite Logo](https://vitejs.dev/logo.svg)

---
以上就是所有组件的组合展示。`;
  } else if (prompt.includes("长文本") || prompt.length > 100) {
    responseText = MOCK_RESPONSES.ULTRA_LONG;
  } else if (prompt.includes("mermaid")) {
    responseText = MOCK_RESPONSES.MERMAID_DEMO;
  } else if (prompt.includes("markmap")) {
    responseText = MOCK_RESPONSES.MARKMAP_DEMO;
  } else if (prompt.toLowerCase().includes("media") || prompt.includes("音视频") || prompt.includes("视频") || prompt.includes("音频")) {
    responseText = MOCK_RESPONSES.MEDIA_DEMO;
  } else {
    responseText = Math.random() > 0.5 ? MOCK_RESPONSES.CN : MOCK_RESPONSES.EN;
  }

  const fullResponse = isFullDemo ? responseText : `Here is a simulated response for: "${prompt}"\n\n${responseText}\n\n--- \n*Generated at ${new Date().toLocaleString()}*`;

  // 4. Simulate realistic typing speed
  let i = 0;
  while (i < fullResponse.length) {
    const remaining = fullResponse.length - i;
    const chunkSize = Math.min(Math.floor(Math.random() * 5) + 5, remaining);
    const chunk = fullResponse.slice(i, i + chunkSize);

    await delay(Math.random() * 20 + 10);
    yield { content: chunk, done: false };
    i += chunkSize;
  }

  yield { content: "", done: true };
}
