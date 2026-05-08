import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EmailHistory } from './emailService'

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  category: 'general' | 'market_s' | 'order' | 'technical' | 'business' | 'complaint'
  status: 'new' | 'read' | 'replied' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  readAt?: Date
  repliedAt?: Date
  adminNotes?: string
  emailHistory?: EmailHistory[]
}

interface MessageStore {
  messages: ContactMessage[]
  unreadCount: number
  
  // Actions
  addMessage: (message: Omit<ContactMessage, 'id' | 'status' | 'priority' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAsReplied: (id: string) => void
  updateStatus: (id: string, status: ContactMessage['status']) => void
  updatePriority: (id: string, priority: ContactMessage['priority']) => void
  addAdminNote: (id: string, note: string) => void
  addEmailToHistory: (messageId: string, emailData: EmailHistory) => void
  getEmailHistory: (messageId: string) => EmailHistory[]
  deleteMessage: (id: string) => void
  getMessagesByStatus: (status: ContactMessage['status']) => ContactMessage[]
  getMessagesByCategory: (category: ContactMessage['category']) => ContactMessage[]
  getUnreadMessages: () => ContactMessage[]
  searchMessages: (query: string) => ContactMessage[]
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: [],
      unreadCount: 0,

      addMessage: (messageData) => {
        const newMessage: ContactMessage = {
          ...messageData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'new',
          priority: 'medium',
          createdAt: new Date(),
        }

        set((state) => ({
          messages: [newMessage, ...state.messages],
          unreadCount: state.unreadCount + 1
        }))
      },

      markAsRead: (id) => {
        set((state) => {
          const updatedMessages = state.messages.map(msg => 
            msg.id === id 
              ? { ...msg, status: 'read' as const, readAt: new Date() }
              : msg
          )
          
          const wasUnread = state.messages.find(msg => msg.id === id)?.status === 'new'
          
          return {
            messages: updatedMessages,
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          }
        })
      },

      markAsReplied: (id) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === id 
              ? { ...msg, status: 'replied' as const, repliedAt: new Date() }
              : msg
          )
        }))
      },

      updateStatus: (id, status) => {
        set((state) => {
          const updatedMessages = state.messages.map(msg => 
            msg.id === id ? { ...msg, status } : msg
          )
          
          const message = state.messages.find(msg => msg.id === id)
          const wasUnread = message?.status === 'new'
          const nowRead = status === 'read' || status === 'replied' || status === 'closed'
          
          let newUnreadCount = state.unreadCount
          if (wasUnread && nowRead) {
            newUnreadCount = Math.max(0, state.unreadCount - 1)
          } else if (!wasUnread && status === 'new') {
            newUnreadCount = state.unreadCount + 1
          }
          
          return {
            messages: updatedMessages,
            unreadCount: newUnreadCount
          }
        })
      },

      updatePriority: (id, priority) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, priority } : msg
          )
        }))
      },

      addAdminNote: (id, note) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, adminNotes: note } : msg
          )
        }))
      },

      addEmailToHistory: (messageId, emailData) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === messageId 
              ? { 
                  ...msg, 
                  emailHistory: [...(msg.emailHistory || []), emailData]
                }
              : msg
          )
        }))
      },

      getEmailHistory: (messageId) => {
        const message = get().messages.find(msg => msg.id === messageId)
        return message?.emailHistory || []
      },

      deleteMessage: (id) => {
        set((state) => {
          const messageToDelete = state.messages.find(msg => msg.id === id)
          const wasUnread = messageToDelete?.status === 'new'
          
          return {
            messages: state.messages.filter(msg => msg.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          }
        })
      },

      getMessagesByStatus: (status) => {
        return get().messages.filter(msg => msg.status === status)
      },

      getMessagesByCategory: (category) => {
        return get().messages.filter(msg => msg.category === category)
      },

      getUnreadMessages: () => {
        return get().messages.filter(msg => msg.status === 'new')
      },

      searchMessages: (query) => {
        const messages = get().messages
        const lowercaseQuery = query.toLowerCase()
        
        return messages.filter(msg => 
          msg.name.toLowerCase().includes(lowercaseQuery) ||
          msg.email.toLowerCase().includes(lowercaseQuery) ||
          msg.subject.toLowerCase().includes(lowercaseQuery) ||
          msg.message.toLowerCase().includes(lowercaseQuery) ||
          msg.category.toLowerCase().includes(lowercaseQuery)
        )
      }
    }),
    {
      name: 'message-store',
      partialize: (state) => ({
        messages: state.messages,
        unreadCount: state.unreadCount
      })
    }
  )
)
