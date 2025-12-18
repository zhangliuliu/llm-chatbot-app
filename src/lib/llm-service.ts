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
            model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-nano',
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

import { MOCK_RESPONSES } from './mock-data'

/**
 * Simulates a streaming LLM response
 */
export async function* mockStreamResponse(messages: { role: string, content: string }[]): AsyncGenerator<StreamChunk> {
    const prompt = messages[messages.length - 1]?.content || ''
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    await delay(1500) // Initial latency

    // Select response based on prompt or random
    let responseText = ''
    console.error('Prompt:', prompt)
    if (prompt.includes('长文本') || prompt.length > 100) {
        responseText = MOCK_RESPONSES.ULTRA_LONG
    } else {
        responseText = Math.random() > 0.5 ? MOCK_RESPONSES.CN : MOCK_RESPONSES.EN
    }

    const fullResponse = `Here is a simulated response for: "${prompt}"\n\n${responseText}\n\n--- \n*Generated at ${new Date().toLocaleString()}*`
    
    const chunkSize = 15 // Increased chunk size for better feel
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
        await delay(15) // Typing effect
        yield {
            content: fullResponse.slice(i, i + chunkSize),
            done: false
        }
    }
    
    yield { content: '', done: true }
}


