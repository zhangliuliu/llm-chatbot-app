/**
 * Mock responses for testing purposes.
 * Content is now loaded from external markdown files for easier editing.
 */

// @ts-ignore - Vite handled raw imports
import markmapDemo from '@/assets/mocks/markmap-demo.md?raw';
// @ts-ignore
import mermaidDemo from '@/assets/mocks/mermaid-demo.md?raw';
// @ts-ignore
import enMock from '@/assets/mocks/en.md?raw';
// @ts-ignore
import cnMock from '@/assets/mocks/cn.md?raw';
// @ts-ignore
import ultraLongMock from '@/assets/mocks/ultra-long.md?raw';
// @ts-ignore
import mediaDemo from '@/assets/mocks/media-demo.md?raw';

export const MOCK_RESPONSES = {
  MARKMAP_DEMO: markmapDemo,
  MERMAID_DEMO: mermaidDemo,
  EN: enMock,
  CN: cnMock,
  ULTRA_LONG: ultraLongMock,
  MEDIA_DEMO: mediaDemo,
};
