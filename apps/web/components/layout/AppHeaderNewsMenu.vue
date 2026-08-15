<script setup lang="ts">
import { FALLBACK_POST_IMAGE, resolveCardImage } from '~/utils/storefront'
import type { MegaMenuSection } from './AppHeaderMegaMenu.vue'

interface NavChildLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
}

const props = defineProps<{
  children: NavChildLink[]
}>()

const { t } = useI18n()

// Chủ đề (campaign-topics, content_type="post") — admin-managed, real
// backend entity, same shape as products' categories/collections.
const { topics, pending: topicsPending } = useBlogTopics()

// Same admin-managed "Cards" content as the products mega menu — gives the
// former plain-text "Khám phá thêm" links a representative image so they
// read as tiles inside the Chủ đề grid instead of a separate text list.
const { cards, pending: cardsPending } = useCards()

const cardImageForPath = (path: string) => {
  const card = cards.value.find(c => c.type === 'link' && c.is_active && c.path === path)
  return (card ? resolveCardImage(card.image) : '') || FALLBACK_POST_IMAGE
}

const sections = computed<MegaMenuSection[]>(() => {
  const items: MegaMenuSection['items'] = [
    ...topics.value.map(topic => ({
      key: topic.id,
      path: `/tin-tuc/chu-de/${topic.slug}`,
      label: topic.name,
      image: topic.image || FALLBACK_POST_IMAGE,
    })),
    ...props.children.map(child => ({
      key: child.key,
      path: child.path,
      label: child.label || t(child.key),
      image: cardImageForPath(child.path),
      openInNewTab: child.openInNewTab,
    })),
  ]

  return items.length ? [{ key: 'topics', title: t('blog.topics.eyebrow'), items }] : []
})

const pending = computed(() => topicsPending.value || cardsPending.value)
</script>

<template>
  <AppHeaderMegaMenu
    :sections="sections"
    :loading="pending"
    view-all-path="/tin-tuc"
    :view-all-label="t('blog.viewAll')"
    :view-all-icon="false"
    min-width="min(640px, 90vw)"
    max-width="820px"
  />
</template>
