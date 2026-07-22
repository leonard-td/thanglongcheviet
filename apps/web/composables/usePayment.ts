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

  /** Online gateways need a redirect URL we don't generate yet — keep COD only. */
  const isSupportedCheckoutProvider = (providerId: string) =>
    providerId === 'pp_system_default'
    || providerId.startsWith('pp_system_default')

  const fetchPaymentMethods = async () => {
    if (loaded.value) return methods.value
    try {
      const res = await fetchMedusa<{ payment_providers: { id: string, is_enabled?: boolean }[] }>(
        `/store/payment-providers?region_id=${regionId}`,
      )
      methods.value = (res.payment_providers ?? [])
        .filter(p => p.is_enabled !== false && isSupportedCheckoutProvider(p.id))
        .map(p => ({ id: p.id, label: labelFor(p.id) }))
      loaded.value = true
    } catch {
      methods.value = [{ id: 'pp_system_default', label: t('paymentMethod.cod') }]
    }
    if (!methods.value.length) {
      methods.value = [{ id: 'pp_system_default', label: t('paymentMethod.cod') }]
    }
    return methods.value
  }

  return { methods, fetchPaymentMethods }
}
