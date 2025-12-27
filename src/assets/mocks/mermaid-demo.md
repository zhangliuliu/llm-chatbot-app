# Mermaid 图表完整展示

以下是各种类型的 Mermaid 图表示例：

## 1. 流程图 (Flowchart)
展示流程和控制逻辑。

```mermaid
graph TD;
    A[起床] --> B{是否周末?};
    B -->|是| C[睡懒觉];
    B -->|否| D[去上班];
    C --> E[吃早午餐];
    D --> F[开会];
    F --> G[写代码];
    E --> H[享受一天];
    G --> H;
```

## 2. 时序图 (Sequence Diagram)
展示对象之间的交互过程。

```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库

    用户->>前端: 点击登录
    前端->>后端: 发送登录请求
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回数据
    后端-->>前端: 返回令牌
    前端-->>用户: 显示主页
```

## 3. 甘特图 (Gantt Chart)
展示项目进度和时间规划。

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计
    需求分析    :a1, 2024-01-01, 7d
    原型设计    :a2, after a1, 5d
    section 开发
    前端开发    :b1, after a2, 10d
    后端开发    :b2, after a2, 14d
    section 测试
    集成测试    :2024-02-01, 7d
    用户测试    :2024-02-10, 5d
```

## 4. 类图 (Class Diagram)
展示类的结构 and 关系。

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +eat()
        +sleep()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## 5. 状态图 (State Diagram)
展示状态转换逻辑。

```mermaid
stateDiagram-v2
    [*] --> 待机
    待机 --> 运行中 : 启动
    运行中 --> 暂停 : 暂停按钮
    暂停 --> 运行中 : 继续按钮
    运行中 --> 完成 : 任务结束
    完成 --> [*]
```

## 6. ER 图 (Entity Relationship)
展示实体关系模型。

```mermaid
erDiagram
    DEPARTMENT {
        string dept_id PK
        string dept_name
        string location
    }
    
    EMPLOYEE {
        string emp_id PK
        string name
        string email
        string dept_id FK
    }
    
    PROJECT {
        string project_id PK
        string project_name
        date start_date
    }
    
    DEPARTMENT ||--|{ EMPLOYEE : has
    EMPLOYEE ||--o{ PROJECT : works_on
```

## 7. 用户旅程图 (User Journey)
展示用户体验流程。

```mermaid
journey
    title 用户购物旅程
    section 浏览
      查看商品详情: 5: 用户
      加入购物车: 3: 用户
    section 购买
      结算: 4: 用户
      支付: 5: 用户
    section 收货
      等待快递: 2: 用户
      确认收货: 4: 用户
```

## 8. 饼图 (Pie Chart)
展示数据占比分布。

```mermaid
pie
    title 编程语言使用占比
    "JavaScript" : 35
    "Python" : 25
    "Java" : 20
    "Go" : 12
    "Rust" : 8
```

## 9. Git 图表 (Git Graph)
展示 Git 分支历史。

```mermaid
gitGraph
    commit
    branch feature
    checkout feature
    commit
    commit
    checkout main
    commit
    merge feature
    commit
```
