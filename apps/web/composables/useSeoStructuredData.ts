import type { BlogPost, Product } from '~/utils/storefront'
import type { EventItem } from '~/composables/useEvents'

export function useProductStructuredData(product: Ref<Product | null>) {
  const route = useRoute()
  const baseUrl = useRequestURL().origin
  const { toAbsoluteShareImage } = useSeoShareImage()

  useHead({
    script: computed(() => {
      if (!product.value) return []

      const pageUrl = `${baseUrl}${route.path}`
      const image = toAbsoluteShareImage(product.value.image)

      return [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.value.title,
          description: product.value.shortDesc || product.value.description,
          ...(image ? { image } : {}),
          sku: product.value.id,
          offers: {
            '@type': 'Offer',
            price: product.value.price,
            priceCurrency: (product.value.currencyCode || 'VND').toUpperCase(),
            availability: product.value.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: pageUrl,
          },
        }),
      }]
    }),
  })
}

export function useArticleStructuredData(post: Ref<BlogPost | null | undefined>) {
  const route = useRoute()
  const { site } = useSettings()
  const baseUrl = useRequestURL().origin
  const { toAbsoluteShareImage } = useSeoShareImage()

  useHead({
    script: computed(() => {
      if (!post.value) return []

      const pageUrl = `${baseUrl}${route.path}`
      const image = toAbsoluteShareImage(post.value.image)

      return [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.value.seoTitle || post.value.title,
          description: post.value.seoDescription || post.value.excerpt,
          ...(image ? { image } : {}),
          datePublished: post.value.date,
          author: {
            '@type': 'Organization',
            name: site.value.name,
          },
          mainEntityOfPage: pageUrl,
        }),
      }]
    }),
  })
}

export function useEventStructuredData(event: Ref<EventItem | null | undefined>) {
  const route = useRoute()
  const { site } = useSettings()
  const baseUrl = useRequestURL().origin
  const { toAbsoluteShareImage } = useSeoShareImage()

  useHead({
    script: computed(() => {
      if (!event.value || !event.value.startAt) return []

      const pageUrl = `${baseUrl}${route.path}`
      const image = toAbsoluteShareImage(event.value.image)

      return [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.value.seoTitle || event.value.title,
          description: event.value.seoDescription || event.value.excerpt,
          ...(image ? { image } : {}),
          startDate: event.value.startAt,
          endDate: event.value.endAt || undefined,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          location: event.value.location
            ? { '@type': 'Place', name: event.value.location }
            : undefined,
          organizer: {
            '@type': 'Organization',
            name: site.value.name,
          },
          url: pageUrl,
        }),
      }]
    }),
  })
}
