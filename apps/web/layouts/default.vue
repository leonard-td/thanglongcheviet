<template>
  <div class="min-h-screen flex flex-col bg-[#1a1a1a]">
    <LayoutAppHeader />
    <WidgetsLangSwitch />
    <WidgetsConnectWidget />
    <!-- <LayoutGlobalWidgets /> -->
    <main id="main-content" class="flex-1 pt-[72px]">
      <HomeNewsMarquee inline hide-brand />
      <slot />
    </main>
    <LayoutAppFooter />
    <WidgetsCartToast />
  </div>
</template>
