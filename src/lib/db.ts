import { openDB, type DBSchema } from 'idb'

export interface Session {
  id: string
  title: string
  updatedAt: number
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  isError?: boolean
}

interface ChatDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { 'by-date': number }
  }
  messages: {
    key: string
    value: Message
    indexes: { 'by-session': string }
  }
}

const dbPromise = openDB<ChatDB>('llm-chatbot-db', 1, {
  upgrade(db) {
    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
    sessionStore.createIndex('by-date', 'updatedAt')

    const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
    messageStore.createIndex('by-session', 'sessionId')
  },
})

export const chatDB = {
  async getSessions() {
    const sessions = await (await dbPromise).getAllFromIndex('sessions', 'by-date')
    return sessions.reverse() // Newest first
  },
  
  async getMessages(sessionId: string) {
    const messages = await (await dbPromise).getAllFromIndex('messages', 'by-session', sessionId)
    return messages.sort((a, b) => a.createdAt - b.createdAt)
  },

  async createSession(session: Session) {
    return (await dbPromise).put('sessions', session)
  },

  async updateSession(session: Session) {
      return (await dbPromise).put('sessions', session)
  },

  async addMessage(message: Message) {
    return (await dbPromise).put('messages', message)
  },

  async deleteSession(sessionId: string) {
      const db = await dbPromise
      const tx = db.transaction(['sessions', 'messages'], 'readwrite')
      await tx.objectStore('sessions').delete(sessionId)
      
      const messageStore = tx.objectStore('messages')
      const index = messageStore.index('by-session')
      let cursor = await index.openCursor(IDBKeyRange.only(sessionId))
      
      while (cursor) {
          await cursor.delete()
          cursor = await cursor.continue()
      }
      
      await tx.done
  }
}
