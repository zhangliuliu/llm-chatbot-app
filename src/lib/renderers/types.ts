export interface DiagramRenderer {
    // 语言标识符，用于匹配 markdown 代码块，如 ```mermaid
    languages: string[];

    // 渲染为 HTML (服务端/静态渲染部分)
    // 返回的 HTML 应该包含 loading 状态或占位符
    render(content: string, key: string, isStreaming: boolean): Promise<string>;

    // 客户端激活 (Hydration)
    // 在 DOM 更新后调用，用于将静态 HTML 转换为交互式图表
    hydrate(element: HTMLElement, content: string, isStreaming: boolean): Promise<void>;
}

// 简单的 LRU 缓存，避免无限增长
export class RendererCache {
    private cache = new Map<string, string>();
    private readonly maxSize: number;

    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }

    get(content: string): string | undefined {
        const item = this.cache.get(content);
        if (item) {
            // 刷新访问顺序：删除后重新插入
            this.cache.delete(content);
            this.cache.set(content, item);
        }
        return item;
    }

    set(content: string, html: string): void {
        if (this.cache.has(content)) {
            // 这里的 delete 是为了下面重新 set 时将其移到末尾（最新）
            this.cache.delete(content);
        } else if (this.cache.size >= this.maxSize) {
            // 缓存已满，删除最久未使用的项（Map 的第一个键）
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(content, html);
    }
}
