import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import markdownItKatex from 'markdown-it-katex'
import DOMPurify from 'dompurify'

export function useMarkdown() {
  const md: MarkdownIt = new MarkdownIt({
    html: false, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />).
    breaks: true, // Convert '\n' in paragraphs to <br>
    linkify: true, // Autoconvert URL-like text to links
    typographer: true,
    highlight: function (str: string, lang: string): string {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
          }</code></pre>`
        } catch (__) {}
      }

      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
    }
  })

  // Plugins
  md.use(markdownItKatex)

  // Custom renderer rules if needed
  // md.renderer.rules.table_open = ...

  function render(content: string) {
    if (!content) return ''
    const rawHtml = md.render(content)
    return DOMPurify.sanitize(rawHtml)
  }

  return {
    render
  }
}
