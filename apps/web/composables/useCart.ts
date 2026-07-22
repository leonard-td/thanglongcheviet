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

const CART_FIELDS = '*items,*promotions'

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
  const config = useRuntimeConfig()

  const cartId = useCookie<string | null>('medusa_cart_id', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: Boolean(config.public.cookieSecure),
  })

  const cart = useState<Cart | null>('cart', () => null)
  const items = useState<CartItem[]>('cart_items', () => [])
  const totals = useState<CartTotals>('cart_totals', () => ({ subtotal: 0, discount: 0, shipping: 0, total: 0 }))
  const promoCodes = useState<string[]>('cart_promo_codes', () => [])
  const loading = ref(false)
  const toast = useState<string | null>('cart_toast', () => null)

  const applyCart = (medusaCart: MedusaCart) => {
    cart.value = { id: medusaCart.id, region_id: medusaCart.region_id }
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
    // If the customer is already logged in, attach ownership immediately.
    const token = useCookie<string | null>('customer_token')
    if (token.value) {
      try {
        const linked = await fetchMedusa<{ cart: MedusaCart }>(
          `/store/carts/${res.cart.id}/customer?fields=${CART_FIELDS}`,
          { method: 'POST' },
        )
        applyCart(linked.cart)
        return linked.cart
      } catch {
        /* guest cart still usable */
      }
    }
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

  /**
   * After login/register, attach the guest cart to the authenticated customer
   * so checkout and order history stay linked (POST /store/carts/:id/customer).
   */
  const transferCartToCustomer = async () => {
    if (!cartId.value) return
    try {
      const res = await fetchMedusa<{ cart: MedusaCart }>(
        `/store/carts/${cartId.value}/customer?fields=${CART_FIELDS}`,
        { method: 'POST' },
      )
      applyCart(res.cart)
    } catch (err) {
      console.warn('Could not transfer cart to customer', err)
    }
  }

  const addToCart = async (variantId: string, quantity = 1) => {
    loading.value = true
    try {
      try {
        await fetchMedusa<{ ok: boolean }>(
          `/store/variants/${variantId}/availability?quantity=${quantity}`,
        )
      } catch {
        return { success: false, message: t('cart.outOfStock') }
      }

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
    if (!cart.value) {
      return { success: false as const, message: t('cart.updateError') }
    }
    loading.value = true
    try {
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cart.value.id}/line-items/${itemId}?fields=${CART_FIELDS}`, {
        method: 'POST',
        body: { quantity },
      })
      applyCart(res.cart)
      return { success: true as const }
    } catch (err) {
      console.error('Failed to update cart', err)
      return { success: false as const, message: parseApiError(err, t('cart.updateError')) }
    } finally {
      loading.value = false
    }
  }

  const removeFromCart = async (itemId: string) => {
    if (!cart.value) {
      return { success: false as const, message: t('cart.removeError') }
    }
    loading.value = true
    try {
      await fetchMedusa(`/store/carts/${cart.value.id}/line-items/${itemId}`, {
        method: 'DELETE',
      })
      // DELETE returns the parent cart without computed totals — refetch to
      // keep totals/promotions consistent.
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cart.value.id}?fields=${CART_FIELDS}`)
      applyCart(res.cart)
      return { success: true as const }
    } catch (err) {
      console.error('Failed to remove from cart', err)
      return { success: false as const, message: parseApiError(err, t('cart.removeError')) }
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
      const codes = [...new Set([...promoCodes.value, code.trim().toUpperCase()])]
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${current.id}?fields=${CART_FIELDS}`, {
        method: 'POST',
        body: { promo_codes: codes },
      })
      applyCart(res.cart)
      const appliedNow = promoCodes.value.includes(code.trim().toUpperCase())
      return appliedNow
        ? { success: true as const, discount: totals.value.discount }
        : { success: false as const, message: t('cart.couponInvalid') }
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
      const codes = promoCodes.value.filter(c => c !== code)
      const res = await fetchMedusa<{ cart: MedusaCart }>(`/store/carts/${cart.value.id}?fields=${CART_FIELDS}`, {
        method: 'POST',
        body: { promo_codes: codes },
      })
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
    city?: string
    email?: string
    payment_provider_id?: string
  }) => {
    loading.value = true
    try {
      const current = await ensureCart()
      const [firstName, ...rest] = data.name.trim().split(/\s+/)

      // Prefer Vietnam when the region supports it; otherwise first country.
      const { region } = await fetchMedusa<{ region: { countries: { iso_2: string }[] } }>(
        `/store/regions/${current.region_id}`,
      )
      const countryCode = region.countries.find(c => c.iso_2 === 'vn')?.iso_2
        ?? region.countries[0]?.iso_2
        ?? 'vn'

      const shippingCity = (data.city || '').trim() || 'Hà Nội'
      const shippingEmail = (data.email || '').trim()
        || `order+${data.phone.replace(/\D/g, '')}@thanglongcheviet.vn`

      await fetchMedusa(`/store/carts/${current.id}`, {
        method: 'POST',
        body: {
          email: shippingEmail,
          shipping_address: {
            first_name: firstName || data.name,
            last_name: rest.join(' ') || data.name,
            address_1: data.address,
            city: shippingCity,
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

      try {
        await fetchMedusa<{ ok: boolean }>(
          `/store/carts/${current.id}/validate-inventory`,
          { method: 'POST' },
        )
      } catch {
        throw new Error(t('cart.outOfStock'))
      }

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
    transferCartToCustomer,
    addToCart,
    updateCart,
    removeFromCart,
    applyPromoCode,
    removePromoCode,
    checkout,
  }
}
