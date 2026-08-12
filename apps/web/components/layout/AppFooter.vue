<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { contact, hours } = useSettings()
const { latestPosts } = useBlog()
const year = new Date().getFullYear()

const addressText = computed(() =>
  contact.value.address?.[locale.value as 'vi' | 'en'] ?? contact.value.address?.vi ?? '',
)

const recentPosts = computed(() =>
  latestPosts.value.map(post => ({
    slug: post.slug,
    title: post.title,
  })),
)

const footerHours = computed(() => {
  if (hours.value.length >= 2) {
    return [
      { days: hours.value[0]!.days, time: hours.value[0]!.time },
      { days: hours.value[1]!.days, time: hours.value[1]!.time },
      {
        days: locale.value === 'en' ? 'Sunday & holidays' : 'Chủ nhật & Lễ',
        time: hours.value[1]!.time,
      },
    ]
  }
  return hours.value
})
</script>

<template>
  <footer class="modis-site-footer">
    <div class="container-page">
      <div class="row">
        <div class="col-md-4">
          <div class="widget widget_recent_post">
            <h3>{{ t('footer.latestNews') }}</h3>
            <ul>
              <li v-for="post in recentPosts" :key="post.slug">
                <NuxtLink :to="localePath(`/tin-tuc/${post.slug}`)">{{ post.title }}</NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <div class="col-md-4">
          <div class="widget">
            <h3>{{ t('contact.hours') }}</h3>
            <div class="box-border double">
              <ul class="list-border-bottom">
                <li v-for="h in footerHours" :key="h.days">
                  <span class="pull-left">{{ h.days }}</span>
                  <span class="pull-right id-color">{{ h.time }}</span>
                  <div class="clearfix" />
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="widget widget-address">
            <h3>{{ t('contact.title') }}</h3>
            <address>
              <span class="address-item address-item--map">
                <span class="address-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <span class="address-item-text">{{ addressText }}</span>

                <div v-if="contact.mapEmbed" class="address-map-popup">
                  <iframe :src="contact.mapEmbed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
                </div>
              </span>
              <span class="address-item">
                <span class="address-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>
                </span>
                <a :href="`tel:${contact.phone}`">{{ contact.phoneDisplay }}</a>
              </span>
              <span class="address-item">
                <span class="address-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>
                </span>
                <a :href="`mailto:${contact.email}`">{{ contact.email }}</a>
              </span>
              <span class="address-item">
                <span class="address-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></svg>
                </span>
                <a href="https://thanglongcheviet.vn" target="_blank" rel="noopener">thanglongcheviet.vn</a>
              </span>
            </address>
          </div>
        </div>
      </div>
    </div>

    <div class="subfooter">
      <div class="container text-center">
        <NuxtLink :to="localePath('/tai-khoan')" class="text-white/50 hover:text-primary-400 text-sm mr-4">
          {{ t('account.title') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/tra-cuu-don')" class="text-white/50 hover:text-primary-400 text-sm mr-4">
          {{ t('orderLookup.title') }}
        </NuxtLink>
        {{ t('footer.copyright', { year }) }}
      </div>
    </div>
  </footer>
</template>

