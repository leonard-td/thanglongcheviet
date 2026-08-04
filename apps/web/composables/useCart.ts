import type { Product } from '~/utils/storefront'
import { parseApiError } from '~/utils/storefront'

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Cart {
  id: string
  region_id: string
}

export interface CartTotals {
  subtotal: number
  discount: number
  shipping: number
  total: number
}

interface MedusaLineItem {
  id: string
  product_id: string
  product_title: string
  product_handle: string
  thumbnail: string | null
  quantity: number
  unit_price: number
}

interface MedusaCart {
  id: string
  region_id: string
  email: string | null
  item_subtotal: number
  discount_total: number
  shipping_total: number
  total: number
  items: MedusaLineItem[]
  promotions?: { id: string, code: string }[]
}

const CART_FIELDS = 'region_id,*items,*promotions,discount_total,item_subtotal,shipping_total,total'

function mapLineItem(item: MedusaLineItem): CartItem {
  return {
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    product: {
      id: item.product_id,
      variantId: '',
      slug: item.product_handle,
      price: item.unit_price,
      currencyCode: 'vnd',
      image: item.thumbnail ?? '',
      gallery: item.thumbnail ? [item.thumbnail] : [],
      title: item.product_title,
      shortDesc: '',
      description: '',
      categoryId: null,
      categoryName: '',
      categoryIds: [],
      collectionId: null,
      collectionName: '',
      inStock: true,
      quickAddInStock: true,
      variants: [],
      options: [],
      material: null,
      weight: null,
    },
  }
}

export function useCart() {
  const { fetchMedusa, regionId } = useMedusaApi()
  const { t } = useAppI18n()

  const cartId = useCookie<string | null>('medusa_cart_id', { maxAge: 60 * 60 * 24 * 30 })
  const cart = useState<Cart | null>('cart', () => null)
  const items = useState<CartItem[]>('cart_items', () => [])
  const totals = useState<CartTotals>('cart_totals', () => ({ subtotal: 0, discount: 0, shipping: 0, total: 0 }))
  const promoCodes = useState<string[]>('cart_promo_codes', () => [])
  const loading = ref(false)
  const toast = useState<string | null>('cart_toast', () => null)

  const applyCart = (medusaCart: MedusaCart) => {
    cart.value = {
      id: medusaCart.id,
      region_id: medusaCart.region_id ?? cart.value?.region_id ?? regionId,
    }
    items.value = (medusaCart.items ?? []).map(mapLineItem)
    totals.value = {
      subtotal: medusaCart.item_subtotal ?? 0,
      discount: medusaCart.discount_total ?? 0,
      shipping: medusaCart.shipping_total ?? 0,
      total: medusaCart.total ?? 0,
    }
    promoCodes.value = (medusaCart.promotions ?? []).map(p => p.code).filter(Boolean)
    cartId.value = medusaCart.id
  }

  const createCart = async () => {
    const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts?fields=${CART_FIELDS}`, {
      method: 'POST',
      body: { region_id: regionId },
    })
    applyCart(res.cart)
    return res.cart
  }

  const fetchCart = async () => {
    loading.value = true
    try {
      if (!cartId.value) {
        await createCart()
        return
      }
      try {
        const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cartId.value}?fields=${CART_FIELDS}`)
        applyCart(res.cart)
      } catch {
        // Cart likely completed/expired — start a fresh one.
        await createCart()
      }
    } catch (err) {
      console.error('Failed to fetch cart', err)
    } finally {
      loading.value = false
    }
  }

  const ensureCart = async () => {
    if (!cart.value) await fetchCart()
    return cart.value!
  }

  const addToCart = async (variantId: string, quantity = 1) => {
    loading.value = true
    try {
      const current = await ensureCart()
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${current.id}/line-items?fields=${CART_FIELDS}`, {
        method: 'POST',
        body: { variant_id: variantId, quantity },
      })
      applyCart(res.cart)
      const message = t('cart.added')
      toast.value = message
      return { success: true, message }
    } catch (err) {
      console.error('Failed to add to cart', err)
      return { success: false, message: parseApiError(err, t('cart.addError')) }
    } finally {
      loading.value = false
    }
  }

  const updateCart = async (itemId: string, quantity: number) => {
    if (!cart.value) return
    loading.value = true
    try {
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cart.value.id}/line-items/${itemId}?fields=${CART_FIELDS}`, {
        method: 'POST',
        body: { quantity },
      })
      applyCart(res.cart)
    } catch (err) {
      console.error('Failed to update cart', err)
    } finally {
      loading.value = false
    }
  }

  const removeFromCart = async (itemId: string) => {
    if (!cart.value) return
    loading.value = true
    try {
      await fetchMedusa(`/store/carts/${cart.value.id}/line-items/${itemId}`, {
        method: 'DELETE',
      })
      // DELETE returns the parent cart without computed totals — refetch to
      // keep totals/promotions consistent.
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cart.value.id}?fields=${CART_FIELDS}`)
      applyCart(res.cart)
    } catch (err) {
      console.error('Failed to remove from cart', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Applies a Medusa promotion code to the cart. Totals/discount come back on
   * the cart itself, so the discount automatically carries into checkout.
   */
  const applyPromoCode = async (code: string) => {
    loading.value = true
    try {
      const current = await ensureCart()
      const normalized = code.trim()
      const beforeDiscount = totals.value.discount

      const tryApply = (promoCode: string) =>
        fetchMedusa<{ cart: MedusaCart }>(
          `/store/carts/${current.id}/promotions?fields=${CART_FIELDS}`,
          {
            method: 'POST',
            body: { promo_codes: [promoCode] },
          },
        )

      let res: { cart: MedusaCart }
      try {
        res = await tryApply(normalized)
      } catch (firstErr) {
        // Medusa codes are often lowercase (e.g. "ssss"); retry once if casing differs.
        const lower = normalized.toLowerCase()
        if (lower !== normalized) {
          res = await tryApply(lower)
        } else {
          throw firstErr
        }
      }

      applyCart(res.cart)
      const codeApplied = promoCodes.value.some(
        c => c.toLowerCase() === normalized.toLowerCase(),
      )
      const discountIncreased = totals.value.discount > beforeDiscount
      if (codeApplied || discountIncreased) {
        return { success: true as const, discount: totals.value.discount }
      }
      return { success: false as const, message: t('cart.couponInvalid') }
    } catch (err) {
      return { success: false as const, message: parseApiError(err, t('cart.couponInvalid')) }
    } finally {
      loading.value = false
    }
  }

  const removePromoCode = async (code: string) => {
    if (!cart.value) return
    loading.value = true
    try {
      const res = await fetchMedusa<{ cart: MedusaCart }>(
        `/store/carts/${cart.value.id}/promotions?fields=${CART_FIELDS}`,
        {
          method: 'DELETE',
          body: { promo_codes: [code] },
        },
      )
      applyCart(res.cart)
    } catch (err) {
      console.error('Failed to remove promo code', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Runs Medusa's full guest checkout sequence: set contact/shipping info,
   * pick the (single) shipping option, open a payment session with the chosen
   * provider, then complete the cart into an order. Any promotion applied via
   * applyPromoCode is already on the cart and discounts the final order.
   */
  const checkout = async (data: {
    name: string
    phone: string
    address: string
    email?: string
    payment_provider_id?: string
  }) => {
    loading.value = true
    try {
      const current = await ensureCart()
      const [firstName, ...rest] = data.name.trim().split(/\s+/)

      // Use a country that actually belongs to the cart's region ('vn' once
      // the Vietnam region is seeded; the demo seed only has EU countries).
      const checkoutRegionId = current.region_id || regionId
      if (!checkoutRegionId) {
        throw new Error('Store region is not configured')
      }

      const { region } = await fetchMedusa<{ region: { countries: { iso_2: string }[] } }>(
        `/store/regions/${checkoutRegionId}`,
      )
      const countryCode = region.countries.find(c => c.iso_2 === 'vn')?.iso_2
        ?? region.countries[0]?.iso_2
        ?? 'vn'

      await fetchMedusa(`/store/carts/${current.id}`, {
        method: 'POST',
        body: {
          email: data.email || 'khach@thanglongcheviet.vn',
          shipping_address: {
            first_name: firstName || data.name,
            last_name: rest.join(' ') || data.name,
            address_1: data.address,
            city: 'Hà Nội',
            country_code: countryCode,
            phone: data.phone,
          },
        },
      })

      const { shipping_options } = await fetchMedusa<{ shipping_options: { id: string }[] }>(
        `/store/shipping-options?cart_id=${current.id}`,
      )
      const option = shipping_options[0]
      if (!option) throw new Error('No shipping option available for this cart')
      await fetchMedusa(`/store/carts/${current.id}/shipping-methods`, {
        method: 'POST',
        body: { option_id: option.id },
      })

      const { payment_collection } = await fetchMedusa<{ payment_collection: { id: string } }>(
        '/store/payment-collections',
        { method: 'POST', body: { cart_id: current.id } },
      )
      await fetchMedusa(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
        method: 'POST',
        body: { provider_id: data.payment_provider_id || 'pp_system_default' },
      })

      const result = await fetchMedusa<{ type: string, order?: { display_id: number }, error?: { message: string } }>(
        `/store/carts/${current.id}/complete`,
        { method: 'POST' },
      )

      if (result.type !== 'order' || !result.order) {
        throw new Error(result.error?.message || 'Checkout failed')
      }

      cartId.value = null
      cart.value = null
      items.value = []
      totals.value = { subtotal: 0, discount: 0, shipping: 0, total: 0 }
      promoCodes.value = []

      return {
        success: true,
        message: t('cart.orderSuccess', { number: String(result.order.display_id) }),
        orderNumber: String(result.order.display_id),
        paymentUrl: null as string | null,
      }
    } catch (err) {
      console.error('Checkout failed', err)
      return {
        success: false,
        message: parseApiError(err, t('cart.checkoutError')),
        orderNumber: null as string | null,
        paymentUrl: null as string | null,
      }
    } finally {
      loading.value = false
    }
  }

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const totalPrice = computed(() => items.value.reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0))

  return {
    cart,
    items,
    totals,
    promoCodes,
    loading,
    toast,
    totalItems,
    totalPrice,
    fetchCart,
    addToCart,
    updateCart,
    removeFromCart,
    applyPromoCode,
    removePromoCode,
    checkout,
  }
}
