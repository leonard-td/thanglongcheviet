export interface PaymentMethod {
  id: string
  label: string
}

/**
 * Payment methods = Medusa payment providers enabled for the region.
 * pp_system_default is the manual provider — surfaced to customers as COD.
 */
export function usePayment() {
  const { fetchMedusa, regionId } = useMedusaApi()
  const { t } = useAppI18n()

  const methods = useState<PaymentMethod[]>('payment_methods', () => [])
  const loaded = useState('payment_methods_loaded', () => false)

  const labelFor = (providerId: string) => {
    if (providerId === 'pp_system_default') return t('paymentMethod.cod')
    if (providerId.includes('vnpay')) return t('paymentMethod.vnpay')
    if (providerId.includes('stripe')) return t('paymentMethod.credit_card')
    return providerId.replace(/^pp_/, '')
  }

  /**
   * Only providers the region actually reports are offered — an empty list
   * means the region has none enabled, which the checkout form surfaces as an
   * error rather than papering over with an assumed provider id.
   */
  const fetchPaymentMethods = async () => {
    if (loaded.value) return methods.value
    try {
      const res = await fetchMedusa<{ payment_providers: { id: string, is_enabled?: boolean }[] }>(
        `/store/payment-providers?region_id=${regionId}`,
      )
      methods.value = (res.payment_providers ?? [])
        .filter(p => p.is_enabled !== false)
        .map(p => ({ id: p.id, label: labelFor(p.id) }))
      loaded.value = true
    } catch (e) {
      console.warn('Payment providers API unavailable', e)
      methods.value = []
    }
    return methods.value
  }

  return { methods, fetchPaymentMethods }
}
