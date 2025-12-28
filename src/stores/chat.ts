import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatDB, type Session, type Message, type ToolCall } from '@/lib/db'
import { getChatResponse, generateId, executeTool } from '@/lib/llm-service'
import router from '@/router'

export const useChatStore = defineStore('chat', () => {

    const sessions = ref<Session[]>([])
    const currentSessionId = ref<string | null>(null)
    const messages = ref<Message[]>([])

    // Status
    const isLoading = ref(false)
    const isStreaming = ref(false)
    let abortController: AbortController | null = null

    let sessionLoadToken = 0

    // Actions
    async function init() {
        sessions.value = await chatDB.getSessions()
    }

    async function loadSession(id: string) {
        const token = ++sessionLoadToken
        currentSessionId.value = id
        messages.value = []

        const loaded = await chatDB.getMessages(id)
        if (token !== sessionLoadToken) return
        messages.value = loaded
    }

    async function createNewSession() {
        const newSession: Session = {
            id: generateId(),
            title: 'New Chat',
            updatedAt: Date.now()
        }
        await chatDB.createSession(newSession)
        sessions.value.unshift(newSession)
        await loadSession(newSession.id)
        await router.push(`/c/${newSession.id}`)
        return newSession.id
    }

    async function deleteSession(id: string) {
        await chatDB.deleteSession(id)
        sessions.value = sessions.value.filter(s => s.id !== id)
        if (currentSessionId.value === id) {
            currentSessionId.value = null
            messages.value = []
            router.push('/')
        }
    }

    async function sendMessage(content: string) {
        if (!currentSessionId.value) {
            await createNewSession()
        }

        const sessionId = currentSessionId.value!

        // 1. Add User Message
        const userMsg: Message = {
            id: generateId(),
            sessionId,
            role: 'user',
            content,
            createdAt: Date.now()
        }
        messages.value.push(userMsg)
        await chatDB.addMessage(userMsg)

        // 2. Prepare status
        isLoading.value = true
        isStreaming.value = true
        abortController = new AbortController()

        try {
            // Update session title if it's the first message
            const session = sessions.value.find(s => s.id === sessionId)
            if (session && session.title === 'New Chat') {
                const newTitle = content.slice(0, 30)
                session.title = newTitle
                await chatDB.updateSession(JSON.parse(JSON.stringify(session)))
            }

            // [DeepSeek] Clear reasoning_content from historical messages for a new turn
            messages.value.forEach(m => {
                if (m.role === 'assistant' && (m as any).reasoning_content) {
                    (m as any).reasoning_content = undefined;
                }
            });

            let shouldContinue = true;
            while (shouldContinue) {
                shouldContinue = false;

                // Prepare history for API
                const apiHistory = messages.value.map(m => ({
                    role: m.role,
                    content: m.content || "",
                    tool_calls: m.tool_calls,
                    tool_call_id: m.tool_call_id,
                    reasoning_content: m.reasoning_content
                }));

                // Create a NEW assistant message for THIS sub-turn
                const assistantMsgId = generateId()
                const assistantMsg: Message = {
                    id: assistantMsgId,
                    sessionId,
                    role: 'assistant',
                    content: '',
                    createdAt: Date.now()
                }
                messages.value.push(assistantMsg)
                const reactiveTurnMsg = messages.value[messages.value.length - 1];
                if (!reactiveTurnMsg) break;

                // Stream current sub-turn
                for await (const chunk of getChatResponse(apiHistory, { signal: abortController.signal })) {
                    if (abortController.signal.aborted) break
                    if (chunk.done) break

                    if (chunk.reasoning_content) {
                        reactiveTurnMsg.reasoning_content = (reactiveTurnMsg.reasoning_content || "") + chunk.reasoning_content
                    }
                    if (chunk.content) {
                        reactiveTurnMsg.content += chunk.content
                    }
                    if (chunk.tool_calls) {
                        if (!reactiveTurnMsg.tool_calls) reactiveTurnMsg.tool_calls = []
                        for (const toolCallDelta of chunk.tool_calls) {
                            const index = toolCallDelta.index
                            if (index === undefined) continue
                            if (!reactiveTurnMsg.tool_calls[index]) {
                                reactiveTurnMsg.tool_calls[index] = {
                                    id: toolCallDelta.id || generateId(),
                                    name: toolCallDelta.function?.name || "",
                                    arguments: toolCallDelta.function?.arguments || "",
                                    status: 'running'
                                }
                            } else {
                                const existing = reactiveTurnMsg.tool_calls[index];
                                if (!existing) continue;
                                if (toolCallDelta.function?.name) existing.name += toolCallDelta.function.name;
                                if (toolCallDelta.function?.arguments) existing.arguments += toolCallDelta.function.arguments;
                            }
                        }
                    }
                }

                if (abortController.signal.aborted) break;

                // Save current turn
                await chatDB.addMessage(JSON.parse(JSON.stringify(reactiveTurnMsg)));

                const pendingTools = reactiveTurnMsg.tool_calls?.filter(t => t.status === 'running') || [];
                if (pendingTools.length > 0) {
                    shouldContinue = true;

                    for (const tool of pendingTools) {
                        try {
                            const result = await executeTool(tool.name, tool.arguments);
                            tool.result = result;
                            tool.status = 'completed';

                            const toolMsg: Message = {
                                id: generateId(),
                                sessionId,
                                role: 'tool',
                                content: result,
                                tool_call_id: tool.id,
                                createdAt: Date.now()
                            };
                            messages.value.push(toolMsg);
                            await chatDB.addMessage(JSON.parse(JSON.stringify(toolMsg)));
                        } catch (e) {
                            tool.status = 'error';
                            tool.result = `Execution Error: ${e}`;
                        }
                    }
                    // Update assistant message with completed tools
                    await chatDB.addMessage(JSON.parse(JSON.stringify(reactiveTurnMsg)));
                }
            }

        } catch (error) {
            console.error('Chat Error:', error)
            const lastMsg = messages.value[messages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content += `\n[Error Generating Response: ${error instanceof Error ? error.message : String(error)}]`
                lastMsg.isError = true
                await chatDB.addMessage(JSON.parse(JSON.stringify(lastMsg)))
            }
        } finally {
            isLoading.value = false
            isStreaming.value = false
            abortController = null
        }
    }

    async function updateSessionTitle(id: string, title: string) {
        const session = sessions.value.find(s => s.id === id)
        if (session) {
            session.title = title
            await chatDB.updateSession(JSON.parse(JSON.stringify(session)))
        }
    }

    function stopGeneration() {
        if (abortController) {
            abortController.abort()
            abortController = null
            isStreaming.value = false
            isLoading.value = false
        }
    }

    async function deleteMessage(id: string) {
        messages.value = messages.value.filter(m => m.id !== id)
        await chatDB.deleteMessage(id)
    }

    return {
        sessions,
        currentSessionId,
        messages,
        isLoading,
        isStreaming,
        init,
        loadSession,
        createNewSession,
        deleteSession,
        updateSessionTitle,
        sendMessage,
        stopGeneration,
        deleteMessage
    }
})
