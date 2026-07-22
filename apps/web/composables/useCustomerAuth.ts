import { parseApiError } from '~/utils/storefront'

export interface CustomerProfile {
  id: string
  name: string
  phone: string
  email: string | null
}

export interface CustomerAppointment {
  id: string
  service: string | null
  status: string
  scheduled_at: string | null
  notes: string | null
  created_at: string
}

export interface CustomerOrder {
  number: string
  status: string
  payment_status?: string
  total_price: number
  created_at: string
}

interface MedusaCustomer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Customer accounts on Medusa's auth (emailpass provider). The site signs
 * users in by PHONE + password: a deterministic auth email is derived from
 * the phone digits, the real (optional) email is kept in customer metadata.
 */
const authEmailFor = (phone: string) =>
  `kh${phone.replace(/\D/g, '')}@customer.thanglongcheviet.vn`

export function useCustomerAuth() {
  const { fetchMedusa, customerToken: token, authBaseUrl } = useMedusaApi()
  const { t } = useAppI18n()

  const customer = useState<CustomerProfile | null>('customer_profile', () => null)

  const isLoggedIn = computed(() => Boolean(token.value))

  const mapCustomer = (c: MedusaCustomer): CustomerProfile => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' '),
    phone: c.phone ?? '',
    email: (c.metadata?.real_email as string | undefined) || null,
  })

  const register = async (data: { name: string, phone: string, password: string, email?: string }) => {
    try {
      const authEmail = authEmailFor(data.phone)
      const { token: registrationToken } = await $fetch<{ token: string }>(
        `${authBaseUrl}/auth/customer/emailpass/register`,
        { method: 'POST', body: { email: authEmail, password: data.password } },
      )

      const [firstName, ...rest] = data.name.trim().split(/\s+/)
      const res = await fetchMedusa<{ customer: MedusaCustomer }>('/store/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${registrationToken}` },
        body: {
          email: authEmail,
          first_name: firstName || data.name,
          last_name: rest.join(' ') || '',
          phone: data.phone,
          metadata: data.email ? { real_email: data.email } : undefined,
        },
      })

      // Exchange the registration token for a login session token.
      const { token: loginToken } = await $fetch<{ token: string }>(
        `${authBaseUrl}/auth/customer/emailpass`,
        { method: 'POST', body: { email: authEmail, password: data.password } },
      )

      token.value = loginToken
      customer.value = mapCustomer(res.customer)
      try {
        await useCart().transferCartToCustomer()
      } catch { /* non-fatal */ }
      return { success: true }
    } catch (err) {
      return { success: false, message: parseApiError(err, t('account.registerError')) }
    }
  }

  const login = async (phone: string, password: string) => {
    try {
      const { token: loginToken } = await $fetch<{ token: string }>(
        `${authBaseUrl}/auth/customer/emailpass`,
        { method: 'POST', body: { email: authEmailFor(phone), password } },
      )
      token.value = loginToken
      await fetchProfile()
      try {
        await useCart().transferCartToCustomer()
      } catch { /* non-fatal */ }
      return { success: true }
    } catch (err) {
      return { success: false, message: parseApiError(err, t('account.loginError')) }
    }
  }

  const logout = async () => {
    token.value = null
    customer.value = null
  }

  const fetchProfile = async () => {
    if (!token.value) return
    try {
      const res = await fetchMedusa<{ customer: MedusaCustomer }>('/store/customers/me')
      customer.value = mapCustomer(res.customer)
    } catch {
      token.value = null
      customer.value = null
    }
  }

  const fetchAppointments = async (): Promise<CustomerAppointment[]> => {
    try {
      const res = await fetchMedusa<{
        bookings: {
          id: string
          service: string | null
          status: string
          preferred_date: string | null
          preferred_time: string | null
          note: string | null
          created_at: string
        }[]
      }>('/store/my-bookings')
      return (res.bookings ?? []).map(b => ({
        id: b.id,
        service: b.service,
        status: b.status,
        scheduled_at: b.preferred_date
          ? `${b.preferred_date}${b.preferred_time ? `T${b.preferred_time}:00` : ''}`
          : null,
        notes: b.note,
        created_at: b.created_at,
      }))
    } catch {
      return []
    }
  }

  const cancelAppointment = async (id: string) => {
    try {
      const res = await fetchMedusa<{ success: boolean }>(`/store/my-bookings/${id}`, {
        method: 'DELETE',
      })
      return { success: res.success, message: t('account.cancelled') }
    } catch (err) {
      return { success: false, message: parseApiError(err, t('account.cancelError')) }
    }
  }

  const fetchOrders = async (): Promise<CustomerOrder[]> => {
    try {
      const res = await fetchMedusa<{
        orders: { display_id: number, status: string, total: number, created_at: string }[]
      }>('/store/orders?order=-created_at&limit=50')
      return (res.orders ?? []).map(o => ({
        number: String(o.display_id),
        status: o.status,
        total_price: o.total,
        created_at: o.created_at,
      }))
    } catch {
      return []
    }
  }

  return {
    customer,
    isLoggedIn,
    register,
    login,
    logout,
    fetchProfile,
    fetchAppointments,
    cancelAppointment,
    fetchOrders,
  }
}
