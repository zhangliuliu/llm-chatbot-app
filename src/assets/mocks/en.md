## Markdown Features Demo

### 1. Typography & Styles
We can support **bold text**, *italicized emphasis*, ~~strikethrough~~, and `inline code snippets`. 

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
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
```

**TypeScript (Interface):**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

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
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$

**Quadratic Formula:**
The solution is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

### 6. Mermaid 图表渲染
展示各种类型的 Mermaid 图表。

**流程图 (Flowchart):**
```mermaid
graph TD
    A[开始] --> B{是否完成?}
    B -- 是 --> C[结束]
    B -- 否 --> D[继续处理]
    D --> B
    style A fill:#f9f,stroke:#333,stroke-width:2px;
    style C fill:#bbf,stroke:#333,stroke-width:2px;
```

**时序图 (Sequence Diagram):**
```mermaid
sequenceDiagram
    participant User as 用户
    participant App as 应用
    participant API as API服务
    User->>App: 发送请求
    App->>API: 调用接口
    API-->>App: 返回数据
    App-->>User: 显示结果
```

**甘特图 (Gantt Chart):**
```mermaid
gantt
    title 项目开发进度
    dateFormat  YYYY-MM-DD
    section 前端
    需求分析       :a1, 2024-01-01, 5d
    UI设计        :a2, after a1, 7d
    开发实现       :a3, after a2, 14d
    section 后端
    架构设计       :b1, 2024-01-01, 5d
    API开发        :b2, after b1, 14d
    测试          :b3, after b2, 7d
```

**类图 (Class Diagram):**
```mermaid
classDiagram
    class Animal {
        +String name
        +eat()
        +sleep()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

**状态图 (State Diagram):**
```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中
    处理中 --> 已完成
    处理中 --> 已取消
    已完成 --> [*]
    已取消 --> [*]
```

**ER 图 (Entity Relationship):**
```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ITEM : contains
    USER {
        int id
        string name
        string email
    }
    ORDER {
        int id
        date created
        float total
    }
    ITEM {
        int id
        string name
        float price
    }
```

**用户旅程图 (User Journey):**
```mermaid
journey
    title 用户购物旅程
    section 浏览商品
      浏览列表: 5: 用户
      查看详情: 3: 用户
    section 下单
      加入购物车: 4: 用户
      填写地址: 2: 用户
      支付: 3: 用户
    section 收货
      等待发货: 2: 用户
      确认收货: 5: 用户
```

**饼图 (Pie Chart):**
```mermaid
pie
    title 技术栈分布
    "Vue" : 35
    "React" : 30
    "Angular" : 15
    "Svelte" : 20
```

### 7. 图片渲染
测试 Markdown 图片的渲染效果。

![Vue Logo](https://vuejs.org/images/logo.png)

![代码示例图](https://placehold.co/600x400/transparent/F00)

带有描述文字的图片：
![这是一个示例图片，展示 Markdown 图片渲染功能](https://placehold.co/600x400?text=Hello+World)


### 7. Long Content Testing
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
