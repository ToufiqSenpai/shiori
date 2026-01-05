import { listen } from '@tauri-apps/api/event'
import { create } from 'zustand'

import { command } from '../utils/tauri'

export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

interface SummaryState {
  summaries: Summary[]
  chats: Chat[]
}

interface SummaryActions {
  addSummaries(...summaries: Summary[]): void
  sendMessage(summaryId: string, message: string): Promise<void>
  getSummaryById(id: string): Summary | undefined
  deleteSummary(id: string): Promise<void>
}

export interface Summary {
  id: string
  title: string
  language: string
  summary: string
  filePath: string
  createdAt: Date
}

export interface Chat {
  id: string
  summaryId: string
  message: string
  role: Role
  createdAt: string
  updatedAt: string
}

interface MessageChunk {
  text: string
  chatId: string
}

const [summaries, chats] = await Promise.all([
  command<Summary[]>('get_summaries'),
  command<Chat[]>('get_chats'),
])

export const useSummaryStore = create<SummaryState & SummaryActions>((set, get) => {
  // Set up listener for streaming message chunks
  listen<MessageChunk>('chat_message_chunk', event => {
    const chunk = event.payload
    set(state => {
      const chatIndex = state.chats.findIndex(c => c.id === chunk.chatId)
      if (chatIndex === -1) {
        console.warn('Chat not found for chunk:', chunk.chatId)
        return state
      }

      const updatedChats = [...state.chats]
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        message: updatedChats[chatIndex].message + chunk.text,
        updatedAt: new Date().toISOString(),
      }

      return { chats: updatedChats }
    })
  }).catch(err => {
    console.error('Failed to set up message chunk listener:', err)
  })

  return {
    summaries,
    chats,
    addSummaries(...summaries: Summary[]) {
      set({
        summaries: [...get().summaries, ...summaries],
      })
    },
    async sendMessage(summaryId: string, message: string) {
      const newChats = await command<Chat[]>('send_message', { message, summaryId })
      set(state => ({
        chats: [...state.chats, ...newChats],
      }))
    },
    getSummaryById(id: string) {
      return get().summaries.find(c => c.id === id)
    },
    async deleteSummary(summaryId: string) {
      await command('delete_summary', { summaryId })
      set(state => ({
        summaries: state.summaries.filter(s => s.id !== summaryId),
        chats: state.chats.filter(c => c.summaryId !== summaryId),
      }))
    },
  }
})
