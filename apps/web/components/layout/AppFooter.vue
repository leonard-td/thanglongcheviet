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
              <span>{{ addressText }}</span>
              <span>
                <strong>{{ t('footer.phone') }}:</strong>
                <a :href="`tel:${contact.phone}`">{{ contact.phoneDisplay }}</a>
              </span>
              <span>
                <strong>{{ t('footer.email') }}:</strong>
                <a :href="`mailto:${contact.email}`">{{ contact.email }}</a>
              </span>
              <span>
                <strong>{{ t('footer.web') }}:</strong>
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

