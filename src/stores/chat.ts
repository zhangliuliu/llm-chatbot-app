import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatDB, type Session, type Message } from '@/lib/db'
import { getChatResponse, generateId } from '@/lib/llm-service'
import router from '@/router'

export const useChatStore = defineStore('chat', () => {
    
    const sessions = ref<Session[]>([])
    const currentSessionId = ref<string | null>(null)
    const messages = ref<Message[]>([])
    
    // Status
    const isLoading = ref(false)
    const isStreaming = ref(false)
    let abortController: AbortController | null = null

    // Getters

    // Actions
    async function init() {
        sessions.value = await chatDB.getSessions()
        // If no sessions, maybe create one? Or wait for user.
    }

    async function loadSession(id: string) {
        currentSessionId.value = id
        messages.value = await chatDB.getMessages(id)
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
        router.push(`/c/${newSession.id}`)
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

        // 2. Prepare Assistant Message
        const assistantMsgId = generateId()
        const assistantMsg: Message = {
            id: assistantMsgId,
            sessionId,
            role: 'assistant',
            content: '', // Start empty
            createdAt: Date.now()
        }
        messages.value.push(assistantMsg)
        const reactiveAssistantMsg = messages.value[messages.value.length - 1]
        
        if (!reactiveAssistantMsg) throw new Error('Failed to initialize message reference')

        // 3. Stream content
        isLoading.value = true
        isStreaming.value = true
        abortController = new AbortController()

        try {
            // Update session title if it's the first message
            const session = sessions.value.find(s => s.id === sessionId)
            if (session && session.title === 'New Chat') {
               const newTitle = content.slice(0, 30)
               session.title = newTitle
               // Clone proxy for safety
               await chatDB.updateSession(JSON.parse(JSON.stringify(session)))
            }
            
            // Prepare history for API (exclude the last empty assistant message)
            const history = messages.value.slice(0, -1).map(m => ({
                role: m.role,
                content: m.content
            }))

            // Start Stream
            for await (const chunk of getChatResponse(history, { signal: abortController.signal })) {
                if (abortController?.signal.aborted) break
                
                if (chunk.done) break
                
                // Update in memory
                reactiveAssistantMsg.content += chunk.content
            }
            
            // Save final message to DB
            await chatDB.addMessage({ ...reactiveAssistantMsg }) // save complete message
            
        } catch (error) {
            console.error('Chat Error:', error)
            reactiveAssistantMsg.content += `\n[Error Generating Response: ${error instanceof Error ? error.message : String(error)}]`
            reactiveAssistantMsg.isError = true
            await chatDB.addMessage({ ...reactiveAssistantMsg })
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
             // Clone proxy to plain object for IndexedDB
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
