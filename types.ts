// Database Types - Generated from Supabase Schema
// Auto-generated on: 2026-10-16

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
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string
          role: 'admin' | 'staff'
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          full_name: string
          role?: 'admin' | 'staff'
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string
          role?: 'admin' | 'staff'
          is_active?: boolean
          last_login?: string | null
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          barcode: string
          name: string
          brand: string | null
          category_id: string
          shelf_location: string | null
          system_stock: number
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barcode: string
          name: string
          brand?: string | null
          category_id: string
          shelf_location?: string | null
          system_stock?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barcode?: string
          name?: string
          brand?: string | null
          category_id?: string
          shelf_location?: string | null
          system_stock?: number
          last_updated?: string
          updated_at?: string
        }
      }
      so_sessions: {
        Row: {
          id: string
          session_code: string
          category_id: string
          user_id: string
          status: 'active' | 'completed' | 'cancelled'
          start_time: string
          end_time: string | null
          total_items: number
          counted_items: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_code: string
          category_id: string
          user_id: string
          status?: 'active' | 'completed' | 'cancelled'
          start_time?: string
          end_time?: string | null
          total_items?: number
          counted_items?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_code?: string
          category_id?: string
          user_id?: string
          status?: 'active' | 'completed' | 'cancelled'
          end_time?: string | null
          total_items?: number
          counted_items?: number
          notes?: string | null
          updated_at?: string
        }
      }
      so_items: {
        Row: {
          id: string
          session_id: string
          product_id: string
          system_stock: number
          physical_stock: number | null
          variance: number | null
          is_counted: boolean
          counted_at: string | null
          counted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          product_id: string
          system_stock: number
          physical_stock?: number | null
          is_counted?: boolean
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          product_id?: string
          system_stock?: number
          physical_stock?: number | null
          is_counted?: boolean
          counted_at?: string | null
          counted_by?: string | null
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before_value: Json | null
          after_value: Json | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before_value?: Json | null
          after_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before_value?: Json | null
          after_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_session_progress: {
        Args: {
          session_id: string
        }
        Returns: {
          total_items: number
          counted_items: number
          progress_percentage: number
        }[]
      }
      generate_session_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper Types for Queries with Relations
export type UserWithRelations = Database['public']['Tables']['users']['Row']

export type CategoryWithRelations = Database['public']['Tables']['categories']['Row']

export type ProductWithCategory = Database['public']['Tables']['products']['Row'] & {
  categories: Database['public']['Tables']['categories']['Row']
}

export type SessionWithRelations = Database['public']['Tables']['so_sessions']['Row'] & {
  users: Pick<Database['public']['Tables']['users']['Row'], 'full_name' | 'username'>
  categories: Pick<Database['public']['Tables']['categories']['Row'], 'name'>
}

export type SOItemWithRelations = Database['public']['Tables']['so_items']['Row'] & {
  products: Pick<Database['public']['Tables']['products']['Row'], 'barcode' | 'name'>
  counted_by_user?: Pick<Database['public']['Tables']['users']['Row'], 'full_name'>
}

export type AuditLogWithUser = Database['public']['Tables']['audit_logs']['Row'] & {
  users: Pick<Database['public']['Tables']['users']['Row'], 'full_name' | 'username'> | null
}

// Application Types
export type User = Database['public']['Tables']['users']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type SOSession = Database['public']['Tables']['so_sessions']['Row']
export type SOItem = Database['public']['Tables']['so_items']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type UserRole = 'admin' | 'staff'
export type SessionStatus = 'active' | 'completed' | 'cancelled'

// DTO Types for API requests/responses
export interface LoginCredentials {
  email: string
  password: string
}

export interface CreateSessionDTO {
  category_id: string
  user_id: string
  notes?: string
}

export interface UpdateSOItemDTO {
  physical_stock: number
  is_counted: boolean
  counted_at: string
  counted_by: string
}

export interface SessionProgressResponse {
  total_items: number
  counted_items: number
  progress_percentage: number
}

export interface ImportProductDTO {
  barcode: string
  name: string
  brand?: string
  category_name: string
  shelf_location?: string
  system_stock: number
}

export interface ExportReportRow {
  barcode: string
  product_name: string
  category_name: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  variance_percentage: number | null
  session_code: string
  counted_by: string
  counted_at: string | null
  status: 'Match' | 'Variance' | 'Not Counted'
}

// Realtime Payload Types
export type RealtimePostgresChangesPayload<T> = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: string[]
}

// Filter/Search Types
export interface ProductFilters {
  category_id?: string
  search?: string
  min_stock?: number
  max_stock?: number
}

export interface SessionFilters {
  status?: SessionStatus
  category_id?: string
  user_id?: string
  date_from?: string
  date_to?: string
}

export interface AuditLogFilters {
  user_id?: string
  entity_type?: string
  action?: string
  date_from?: string
  date_to?: string
}

// Pagination Types
export interface PaginationParams {
  page: number
  limit: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Error Types
export interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}
