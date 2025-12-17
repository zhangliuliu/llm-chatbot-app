# LLM Chatbot App

## 技术栈

- Vue 3
- TypeScript
- Shadcn Vue
- Tailwind CSS
- Pinia
- Vite
- Markdown-it
- Highlight.js

## 需求

我需要开发一个 LLM 流式对话页面

1. 页面风格

- 仿 ChatGPT，左侧需要对话列表、多会话管理
- 使用 Shadcn Vue + Tailwind CSS

2. 聊天功能

- 流式输出，支持展示思考过程
- 中途停止按钮
- 保存聊天记录到本地，可考虑用 indexdb

3. 内容渲染

- Markdown：标题、列表、引用、链接
- 代码块：代码高亮
- 表格：markdown 表格和 HTML table
- 需要渲染图片 / 数学公式
- 需要考虑长文本渲染的性能问题

4. 模型与接口

- 暂时不真实调用接口，模拟 SSE 返回数据做测试，后续 使用 OpenAI 的 SDK，SSE
