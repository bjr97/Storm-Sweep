export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'sweeper' | 'admin'

export type MembershipStatus = 'none' | 'active' | 'cancelled' | 'past_due'

export type MembershipPlan = 'annual' | 'monthly'

export type PartnerType =
  | 'roofing'
  | 'realtor'
  | 'lawn'
  | 'hoa'
  | 'inspector'
  | 'other'

export type JobStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'complete'
  | 'cancelled'

export type ShelterSize = 'small' | 'standard' | 'large' | 'xlarge'

export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded'

export type PhotoType =
  | 'before'
  | 'after'
  | 'upgrade'
  | 'signature'
  | 'booking_screen'

export type SweeperAvailability = 'weekdays' | 'weekends' | 'both'

export type SweeperApplicantStatus = 'pending' | 'approved' | 'rejected'

export type SocialPlatform = 'tiktok' | 'instagram' | 'facebook'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          phone: string | null
          address: string | null
          membership_status: MembershipStatus
          membership_plan: MembershipPlan | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          membership_renews_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          address?: string | null
          membership_status?: MembershipStatus
          membership_plan?: MembershipPlan | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          membership_renews_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          address?: string | null
          membership_status?: MembershipStatus
          membership_plan?: MembershipPlan | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          membership_renews_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          name: string
          type: PartnerType
          referral_code: string
          contact_name: string | null
          contact_phone: string | null
          payout_per_referral: number
          total_referrals: number
          total_payout_owed: number
          total_paid_out: number
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: PartnerType
          referral_code: string
          contact_name?: string | null
          contact_phone?: string | null
          payout_per_referral?: number
          total_referrals?: number
          total_payout_owed?: number
          total_paid_out?: number
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: PartnerType
          referral_code?: string
          contact_name?: string | null
          contact_phone?: string | null
          payout_per_referral?: number
          total_referrals?: number
          total_payout_owed?: number
          total_paid_out?: number
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          customer_id: string
          sweeper_id: string | null
          status: JobStatus
          service_type: string[]
          scheduled_at: string | null
          address: string
          shelter_size: ShelterSize
          notes: string | null
          checklist_progress: Json
          upgrade_flags: Json
          total_amount: number
          deposit_amount: number
          payment_status: PaymentStatus
          stripe_payment_intent_id: string | null
          paypal_order_id: string | null
          photo_urls: string[]
          photo_grade: string | null
          photo_flags: string[]
          photo_approved: boolean
          photo_surcharge: number
          photo_admin_note: string | null
          admin_reviewed_at: string | null
          customer_signed_at: string | null
          referral_source: string | null
          partner_id: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          sweeper_id?: string | null
          status?: JobStatus
          service_type?: string[]
          scheduled_at?: string | null
          address: string
          shelter_size?: ShelterSize
          notes?: string | null
          checklist_progress?: Json
          upgrade_flags?: Json
          total_amount: number
          deposit_amount?: number
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          paypal_order_id?: string | null
          photo_urls?: string[]
          photo_grade?: string | null
          photo_flags?: string[]
          photo_approved?: boolean
          photo_surcharge?: number
          photo_admin_note?: string | null
          admin_reviewed_at?: string | null
          customer_signed_at?: string | null
          referral_source?: string | null
          partner_id?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          sweeper_id?: string | null
          status?: JobStatus
          service_type?: string[]
          scheduled_at?: string | null
          address?: string
          shelter_size?: ShelterSize
          notes?: string | null
          checklist_progress?: Json
          upgrade_flags?: Json
          total_amount?: number
          deposit_amount?: number
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          paypal_order_id?: string | null
          photo_urls?: string[]
          photo_grade?: string | null
          photo_flags?: string[]
          photo_approved?: boolean
          photo_surcharge?: number
          photo_admin_note?: string | null
          admin_reviewed_at?: string | null
          customer_signed_at?: string | null
          referral_source?: string | null
          partner_id?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'jobs_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'jobs_sweeper_id_fkey'
            columns: ['sweeper_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'jobs_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
        ]
      }
      job_photos: {
        Row: {
          id: string
          job_id: string
          photo_type: PhotoType
          storage_path: string
          uploaded_by: string | null
          customer_consent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          photo_type: PhotoType
          storage_path: string
          uploaded_by?: string | null
          customer_consent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          photo_type?: PhotoType
          storage_path?: string
          uploaded_by?: string | null
          customer_consent?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'job_photos_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_photos_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sweeper_applicants: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string
          availability: SweeperAvailability
          has_vehicle: boolean
          heard_about: string | null
          experience_notes: string | null
          tool_photos: Json
          all_tools_verified: boolean
          agreement_signed: boolean
          agreement_pdf_path: string | null
          status: SweeperApplicantStatus
          admin_notes: string | null
          profile_id: string | null
          applied_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone: string
          availability: SweeperAvailability
          has_vehicle?: boolean
          heard_about?: string | null
          experience_notes?: string | null
          tool_photos?: Json
          all_tools_verified?: boolean
          agreement_signed?: boolean
          agreement_pdf_path?: string | null
          status?: SweeperApplicantStatus
          admin_notes?: string | null
          profile_id?: string | null
          applied_at?: string
          approved_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string
          availability?: SweeperAvailability
          has_vehicle?: boolean
          heard_about?: string | null
          experience_notes?: string | null
          tool_photos?: Json
          all_tools_verified?: boolean
          agreement_signed?: boolean
          agreement_pdf_path?: string | null
          status?: SweeperApplicantStatus
          admin_notes?: string | null
          profile_id?: string | null
          applied_at?: string
          approved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sweeper_applicants_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sms_log: {
        Row: {
          id: string
          profile_id: string | null
          job_id: string | null
          trigger: string
          body: string
          twilio_sid: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          job_id?: string | null
          trigger: string
          body: string
          twilio_sid?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          job_id?: string | null
          trigger?: string
          body?: string
          twilio_sid?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sms_log_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sms_log_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          job_id: string
          customer_id: string
          rating: number
          body: string | null
          photo_consent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          customer_id: string
          rating: number
          body?: string | null
          photo_consent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          customer_id?: string
          rating?: number
          body?: string | null
          photo_consent?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_job_id_fkey'
            columns: ['job_id']
            isOneToOne: true
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      social_posts: {
        Row: {
          id: string
          job_id: string | null
          platform: SocialPlatform
          publish_id: string | null
          caption: string | null
          video_path: string | null
          customer_consent: boolean
          views: number
          likes: number
          shares: number
          published_at: string | null
          analytics_synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          platform: SocialPlatform
          publish_id?: string | null
          caption?: string | null
          video_path?: string | null
          customer_consent?: boolean
          views?: number
          likes?: number
          shares?: number
          published_at?: string | null
          analytics_synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          platform?: SocialPlatform
          publish_id?: string | null
          caption?: string | null
          video_path?: string | null
          customer_consent?: boolean
          views?: number
          likes?: number
          shares?: number
          published_at?: string | null
          analytics_synced_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_posts_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Partner = Database['public']['Tables']['partners']['Row']
export type PartnerInsert = Database['public']['Tables']['partners']['Insert']
export type PartnerUpdate = Database['public']['Tables']['partners']['Update']

export type Job = Database['public']['Tables']['jobs']['Row']
export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']

export type JobPhoto = Database['public']['Tables']['job_photos']['Row']
export type JobPhotoInsert = Database['public']['Tables']['job_photos']['Insert']
export type JobPhotoUpdate = Database['public']['Tables']['job_photos']['Update']

export type SweeperApplicant =
  Database['public']['Tables']['sweeper_applicants']['Row']
export type SweeperApplicantInsert =
  Database['public']['Tables']['sweeper_applicants']['Insert']
export type SweeperApplicantUpdate =
  Database['public']['Tables']['sweeper_applicants']['Update']

export type SmsLog = Database['public']['Tables']['sms_log']['Row']
export type SmsLogInsert = Database['public']['Tables']['sms_log']['Insert']
export type SmsLogUpdate = Database['public']['Tables']['sms_log']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type SocialPost = Database['public']['Tables']['social_posts']['Row']
export type SocialPostInsert =
  Database['public']['Tables']['social_posts']['Insert']
export type SocialPostUpdate =
  Database['public']['Tables']['social_posts']['Update']
