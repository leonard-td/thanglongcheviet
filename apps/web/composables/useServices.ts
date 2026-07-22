import { localText } from '~/utils/storefront'

export function useServices() {
  const { locale } = useI18n()
  const { services: servicesData } = useSiteBundle()

  const categories = computed(() =>
    servicesData.value.map(cat => ({
      id: cat.id,
      name: localText(cat.category, locale.value),
      icon: cat.icon,
      items: cat.items.map(item => ({
        id: item.id,
        name: localText(item.name, locale.value),
        description: localText(item.description, locale.value),
        price: item.price,
        duration: item.duration,
        image: item.image,
        featured: item.featured,
        discount: null as string | null,
      })),
    })),
  )

  const featuredServices = computed(() =>
    servicesData.value.flatMap(cat =>
      cat.items
        .filter(item => item.featured)
        .map(item => ({
          id: item.id,
          categoryId: cat.id,
          categoryName: localText(cat.category, locale.value),
          categoryIcon: cat.icon,
          name: localText(item.name, locale.value),
          description: localText(item.description, locale.value),
          price: item.price,
          duration: item.duration,
          image: item.image,
        })),
    ),
  )

  return { categories, featuredServices, servicesData }
}
