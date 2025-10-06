export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      queues: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          amount: number | null
          category: string
          status: string
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          amount?: number | null
          category?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          amount?: number | null
          category?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
        }
      }
      todos: {
        Row: {
          id: string
          user_id: string
          title: string
          completed: boolean
          priority: string
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          completed?: boolean
          priority?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          completed?: boolean
          priority?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
