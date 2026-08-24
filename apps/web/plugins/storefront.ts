export default defineNuxtPlugin(() => {
  // Warm the shared site-settings request so header/footer/SEO all read one
  // resolved response instead of racing their own fetches.
  useSiteSettings()

  if (import.meta.client) {
    const { fetchCart } = useCart()
    fetchCart()
  }
})
