export type InquiryType = "contact" | "booking"

export type InquiryStatus = "new" | "confirmed" | "completed" | "cancelled"

export type Inquiry = {
  id: string
  type: InquiryType
  name: string
  phone: string
  email: string | null
  service: string | null
  message: string | null
  source: string | null
  preferred_date: string | null
  preferred_time: string | null
  status: InquiryStatus
  created_at?: string
  updated_at?: string
}

export type InquiriesResponse = {
  inquiries: Inquiry[]
  count: number
  limit: number
  offset: number
}

export type InquiryResponse = {
  inquiry: Inquiry
}

export type InquiryStatsResponse = {
  new_count: number
}
