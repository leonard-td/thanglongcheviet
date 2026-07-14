<script setup lang="ts">
// Trang có banner full-bleed tự render <HomeNewsMarquee inline /> ngay dưới
// banner của nó và set definePageMeta({ bannerMarquee: true }) để layout
// không render trùng ở đầu main.
const route = useRoute()
const showTopMarquee = computed(() => !route.meta.bannerMarquee)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#1a1a1a]">
    <LayoutAppHeader />
    <WidgetsLangSwitch />
    <WidgetsConnectWidget />
    <!-- <LayoutGlobalWidgets /> -->
    <main id="main-content" class="flex-1 pt-[72px]">
      <HomeNewsMarquee v-if="showTopMarquee" inline />
      <slot />
    </main>
    <LayoutAppFooter />
    <WidgetsCartToast />
  </div>
</template>
