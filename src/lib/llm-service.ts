export interface StreamChunk {
    content: string
    done: boolean
}

export function generateId() {
    return Math.random().toString(36).substring(2, 9)
}

/**
 * Simulates a streaming LLM response
 */
export async function* mockStreamResponse(prompt: string): AsyncGenerator<StreamChunk> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    await delay(500) // Initial latency

    const response = `Here is a simulated response for: "${prompt}"\n\nThis is a **markdown** response with some *styled* text.\n\n- Point 1\n- Point 2\n\n\`\`\`typescript\nconsole.log("Hello World");\n\`\`\`\n\nSimulation complete.`
    
    const chunkSize = 5
    for (let i = 0; i < response.length; i += chunkSize) {
        await delay(30) // Typing effect
        yield {
            content: response.slice(i, i + chunkSize),
            done: false
        }
    }
    
    yield { content: '', done: true }
}
