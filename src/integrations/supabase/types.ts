export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      book_purchases: {
        Row: {
          amount: number
          book_id: string
          currency: string
          id: string
          purchased_at: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          book_id: string
          currency?: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          book_id?: string
          currency?: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          category: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          downloads_count: number
          education_level: string
          file_size_mb: number
          id: string
          is_free: boolean
          is_published: boolean
          language: string
          pages_count: number
          pdf_path: string | null
          pdf_url: string | null
          price: number
          sort_order: number
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          downloads_count?: number
          education_level?: string
          file_size_mb?: number
          id?: string
          is_free?: boolean
          is_published?: boolean
          language?: string
          pages_count?: number
          pdf_path?: string | null
          pdf_url?: string | null
          price?: number
          sort_order?: number
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          downloads_count?: number
          education_level?: string
          file_size_mb?: number
          id?: string
          is_free?: boolean
          is_published?: boolean
          language?: string
          pages_count?: number
          pdf_path?: string | null
          pdf_url?: string | null
          price?: number
          sort_order?: number
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          quiz_score: number | null
          user_id: string
          verification_code: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          quiz_score?: number | null
          user_id: string
          verification_code?: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          quiz_score?: number | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          category_id: string
          course_id: string
        }
        Insert: {
          category_id: string
          course_id: string
        }
        Update: {
          category_id?: string
          course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          certificate_requirement: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          instructor: string
          is_free: boolean
          is_published: boolean
          lessons_count: number
          level: string
          preview_video_url: string | null
          price: number
          rating_avg: number
          rating_count: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          students_count: number
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          category?: string
          certificate_requirement?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string
          is_free?: boolean
          is_published?: boolean
          lessons_count?: number
          level?: string
          preview_video_url?: string | null
          price?: number
          rating_avg?: number
          rating_count?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          students_count?: number
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          category?: string
          certificate_requirement?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string
          is_free?: boolean
          is_published?: boolean
          lessons_count?: number
          level?: string
          preview_video_url?: string | null
          price?: number
          rating_avg?: number
          rating_count?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          students_count?: number
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      daily_game_challenges: {
        Row: {
          bonus_coins: number
          bonus_xp: number
          challenge_date: string
          created_at: string
          description: string | null
          game_id: string | null
          id: string
          title: string
        }
        Insert: {
          bonus_coins?: number
          bonus_xp?: number
          challenge_date: string
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          title: string
        }
        Update: {
          bonus_coins?: number
          bonus_xp?: number
          challenge_date?: string
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_game_challenges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "play_games"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_games: {
        Row: {
          category: string
          course_id: string | null
          created_at: string
          description: string | null
          game_type: string
          game_url: string | null
          html_file_path: string | null
          id: string
          image_url: string | null
          is_published: boolean
          plays_count: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          game_type?: string
          game_url?: string | null
          html_file_path?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          plays_count?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          game_type?: string
          game_url?: string | null
          html_file_path?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          plays_count?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_games_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed: boolean
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          progress: number
          progress_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          progress?: number
          progress_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          progress?: number
          progress_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      game_achievements: {
        Row: {
          code: string
          created_at: string
          criteria: Json
          description: string | null
          icon: string
          id: string
          name_ar: string
          name_en: string | null
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string
          id?: string
          name_ar: string
          name_en?: string | null
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string
          id?: string
          name_ar?: string
          name_en?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      game_attempts: {
        Row: {
          coins_earned: number
          completed: boolean
          game_id: string
          id: string
          played_at: string
          score: number
          stars: number
          time_seconds: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          coins_earned?: number
          completed?: boolean
          game_id: string
          id?: string
          played_at?: string
          score?: number
          stars?: number
          time_seconds?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          coins_earned?: number
          completed?: boolean
          game_id?: string
          id?: string
          played_at?: string
          score?: number
          stars?: number
          time_seconds?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_attempts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "play_games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_badges: {
        Row: {
          code: string
          color: string
          created_at: string
          criteria: Json
          description: string | null
          icon: string
          id: string
          name_ar: string
          name_en: string | null
          xp_reward: number
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string
          id?: string
          name_ar: string
          name_en?: string | null
          xp_reward?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string
          id?: string
          name_ar?: string
          name_en?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      game_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      game_levels: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          level_number: number
          min_xp: number
          name_ar: string
          name_en: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          level_number: number
          min_xp: number
          name_ar: string
          name_en?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          level_number?: number
          min_xp?: number
          name_ar?: string
          name_en?: string | null
        }
        Relationships: []
      }
      html_quizzes: {
        Row: {
          access_type: string
          attempts_count: number
          category: string
          course_id: string | null
          created_at: string
          description: string | null
          difficulty: string
          estimated_minutes: number | null
          external_url: string | null
          html_content: string | null
          html_file_path: string | null
          id: string
          image_url: string | null
          is_published: boolean
          sort_order: number
          source_type: string
          title: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          attempts_count?: number
          category?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_minutes?: number | null
          external_url?: string | null
          html_content?: string | null
          html_file_path?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          sort_order?: number
          source_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          attempts_count?: number
          category?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_minutes?: number | null
          external_url?: string | null
          html_content?: string | null
          html_file_path?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          sort_order?: number
          source_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          is_instructor_reply: boolean
          lesson_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_instructor_reply?: boolean
          lesson_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_instructor_reply?: boolean
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          course_id: string
          created_at: string
          id: string
          last_watched_at: string
          lesson_id: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          course_id: string
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          course_id?: string
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          education_level: string | null
          id: string
          notes: string | null
          phone: string
          preferred_time: string | null
          sessions_per_week: number | null
          specialty_id: string
          status: string
          student_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          education_level?: string | null
          id?: string
          notes?: string | null
          phone: string
          preferred_time?: string | null
          sessions_per_week?: number | null
          specialty_id: string
          status?: string
          student_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          education_level?: string | null
          id?: string
          notes?: string | null
          phone?: string
          preferred_time?: string | null
          sessions_per_week?: number | null
          specialty_id?: string
          status?: string
          student_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_requests_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "tutoring_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string | null
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean
          is_published: boolean
          lesson_type: string
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_published?: boolean
          lesson_type?: string
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_published?: boolean
          lesson_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_bookings: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          joined_at: string | null
          payment_id: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          joined_at?: string | null
          payment_id?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          joined_at?: string | null
          payment_id?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          bookings_count: number
          course_id: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          instructor_id: string | null
          instructor_name: string | null
          is_free: boolean
          join_window_minutes: number
          max_seats: number | null
          meeting_link: string | null
          platform: string
          price: number
          recording_url: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          bookings_count?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          is_free?: boolean
          join_window_minutes?: number
          max_seats?: number | null
          meeting_link?: string | null
          platform?: string
          price?: number
          recording_url?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          bookings_count?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          is_free?: boolean
          join_window_minutes?: number
          max_seats?: number | null
          meeting_link?: string | null
          platform?: string
          price?: number
          recording_url?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          book_id: string | null
          coupon_id: string | null
          course_id: string | null
          created_at: string
          currency: string
          id: string
          live_session_id: string | null
          payment_provider: string | null
          provider_payment_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          book_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          live_session_id?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          book_id?: string | null
          coupon_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          live_session_id?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      play_games: {
        Row: {
          age_max: number | null
          age_min: number | null
          category_id: string | null
          coins_reward: number
          content: Json
          cover_url: string | null
          created_at: string
          description: string | null
          difficulty: string
          id: string
          is_featured: boolean
          is_new: boolean
          is_published: boolean
          plays_count: number
          slug: string | null
          sort_order: number
          time_limit_seconds: number | null
          title: string
          type: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category_id?: string | null
          coins_reward?: number
          content?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          plays_count?: number
          slug?: string | null
          sort_order?: number
          time_limit_seconds?: number | null
          title: string
          type: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category_id?: string | null
          coins_reward?: number
          content?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          plays_count?: number
          slug?: string | null
          sort_order?: number
          time_limit_seconds?: number | null
          title?: string
          type?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "play_games_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          country: string | null
          created_at: string
          education_level: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          education_level?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          education_level?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option: number
          created_at: string
          id: string
          options: Json
          question_text: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_option?: number
          created_at?: string
          id?: string
          options?: Json
          question_text: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_option?: number
          created_at?: string
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_published: boolean
          passing_score: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          passing_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          passing_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_specialties: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          price_per_hour: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_per_hour?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_per_hour?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_daily_challenges: {
        Row: {
          challenge_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_game_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "game_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "game_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_progress: {
        Row: {
          coins: number
          created_at: string
          current_level: number
          last_played_at: string | null
          stars: number
          streak_days: number
          trophies: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          current_level?: number
          last_played_at?: string | null
          stars?: number
          streak_days?: number
          trophies?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          current_level?: number
          last_played_at?: string | null
          stars?: number
          streak_days?: number
          trophies?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_review_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_eligible_for_certificate: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "instructor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "instructor"],
    },
  },
} as const
