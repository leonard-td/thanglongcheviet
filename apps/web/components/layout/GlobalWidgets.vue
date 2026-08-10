<script setup lang="ts">
const { active: overlayActive, closeAll } = useUiOverlay()
</script>

<template>
  <div
    class="global-blur"
    :class="{ on: overlayActive }"
    aria-hidden="true"
    @click="closeAll"
  />
  <WidgetsLangSwitch />
  <WidgetsConnectWidget />
  <!-- Ask is mounted in layouts/default.vue + pages/index.vue (layout:false). Do not remount here. -->
</template>

<style scoped>
.global-blur {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, .1);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  pointer-events: none;
  transition: opacity .35s ease, visibility .35s ease;
  /* z-index: 900; */
  /* visibility: hidden; */
  /* opacity: 0; */
}
.global-blur.on {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
@media (prefers-reduced-motion: reduce) {
  .global-blur {
    transition: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(10, 10, 10, .45);
  }
}
</style>
