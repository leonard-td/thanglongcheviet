<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { promo, site } = useSettings()

const promos = computed(() => [
  {
    id: 'special',
    badge: t('promo.badgeLabel'),
    heading: locale.value === 'vi' ? 'Ưu đãi tháng này' : 'This Month\'s Offer',
    desc: site.value.description,
    image: '/images/gallery/hair-2.jpg',
    cta: t('nav.bookNow'),
  },
  {
    id: 'discount',
    badge: promo.value.badge,
    heading: promo.value.heading,
    desc: promo.value.subheading,
    image: '/images/promo-bg.jpg',
    cta: t('promo.cta'),
    discount: promo.value.discount,
  },
])
</script>

<template>
  <section
    v-if="promo.active"
    class="section-py bg-[#222] text-white"
    aria-labelledby="promo-heading"
  >
    <div class="container-page">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-on-scroll">

        <!-- Promo Card -->
        <article
          v-for="item in promos"
          :key="item.id"
          class="group relative overflow-hidden border border-white/8
                 hover:border-primary-500/40 transition-all duration-300"
        >
          <!-- Background image -->
          <div class="absolute inset-0" aria-hidden="true">
            <NuxtImg
              :src="item.image"
              alt=""
              class="w-full h-full object-cover opacity-20 transition-transform duration-700
                     group-hover:scale-105 group-hover:opacity-30"
              sizes="(max-width: 1024px) 100vw, 50vw"
              format="webp"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/90 via-[#1a1a1a]/70 to-transparent" />
          </div>

          <!-- Content -->
          <div class="relative z-10 p-8 md:p-12 lg:p-14">
            <!-- Discount badge (only for 2nd card) -->
            <div v-if="item.discount" class="mb-5">
              <span class="text-xs uppercase tracking-[0.2em] text-primary-400 font-condensed">
                {{ item.badge }}
              </span>
              <div class="font-heading text-6xl md:text-8xl font-bold text-primary-400 leading-none mt-2">
                {{ item.discount }}
              </div>
            </div>

            <h2
              :id="item.id === 'special' ? 'promo-heading' : undefined"
              class="font-heading text-xl md:text-2xl lg:text-3xl font-semibold mb-4"
            >
              {{ item.heading }}
            </h2>

            <p class="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
              {{ item.desc }}
            </p>

            <NuxtLink
              :to="localePath('/lien-he')"
              class="btn-primary px-8 py-3.5 text-xs uppercase tracking-wider
                     group-hover:bg-primary-400 transition-colors"
            >
              {{ item.cta }}
            </NuxtLink>
          </div>
        </article>

      </div>
    </div>
  </section>
</template>
