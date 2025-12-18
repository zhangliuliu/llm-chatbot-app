import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import markdownItKatex from 'markdown-it-katex'
import DOMPurify from 'dompurify'

export function useMarkdown() {
  const md: MarkdownIt = new MarkdownIt({
    html: true, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />).
    breaks: true, // Convert '\n' in paragraphs to <br>
    linkify: true, // Autoconvert URL-like text to links
    typographer: true,
    highlight: null // We handle highlighting in custom fence rule
  })

  // Plugins
  md.use(markdownItKatex)

  // Custom renderer rules
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    if (!token) return ''

    const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
    let lang = ''
    if (info) {
      lang = info.split(/\s+/g)[0] || ''
    }

    let highlighted = ''
    const language = lang || 'text'

    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(token.content, { language: lang, ignoreIllegals: true }).value
      } catch (__) { }
    }

    if (!highlighted) {
      highlighted = md.utils.escapeHtml(token.content)
    }

    return `<div class="code-block my-2 rounded-lg overflow-hidden bg-[#282c34] border border-border/10 shadow-sm">
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-white/5">
        <span class="text-xs font-medium text-zinc-400 select-none font-mono lowercase">${language}</span>
        <button class="copy-btn flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors focus:outline-none">
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" /></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre class="hljs !my-0 !p-3 !bg-transparent !rounded-none overflow-x-auto"><code class="language-${language} !font-mono text-sm !bg-transparent !p-0 !border-none">${highlighted}</code></pre>
    </div>`
  }

  function render(content: string) {
    if (!content) return ''
    try {
      const rawHtml = md.render(content)
      return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['button', 'svg', 'path', 'use'],
        ADD_ATTR: ['xmlns', 'fill', 'viewBox', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd']
      })
    } catch (err) {
      console.error('Markdown render error:', err)
      // Return a safer version if rendering fails during streaming
      return DOMPurify.sanitize(content)
    }
  }

  return {
    render
  }
}
