import type { DiagramRenderer } from "./types";
import { MermaidRenderer } from "./mermaid";
import { MarkmapRenderer } from "./markmap";

// 注册所有可用的渲染器
const renderers: DiagramRenderer[] = [
    new MermaidRenderer(),
    new MarkmapRenderer(),
];

// 辅助函数：获取支持的语言列表，用于构建正则
export const getSupportedLanguages = () => {
    return renderers.flatMap(r => r.languages);
};

// 辅助函数：根据语言获取渲染器
export const getRenderer = (lang: string): DiagramRenderer | undefined => {
    return renderers.find(r => r.languages.includes(lang));
};

export * from "./types";
