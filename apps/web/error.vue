<script setup lang="ts">
/**
 * Keep this page dependency-light. useI18n / useLocalePath can fail while
 * recovering from a load error and make Vite emit ERR_LOAD_URL cascades.
 */
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()

const statusCode = computed(() => props.error?.statusCode || 500)
const is404 = computed(() => statusCode.value === 404)
const title = computed(() =>
  is404.value ? 'Không tìm thấy trang' : 'Đã xảy ra lỗi',
)
const message = computed(() =>
  is404.value
    ? 'Trang bạn tìm không tồn tại hoặc đã được di chuyển.'
    : (props.error?.statusMessage || 'Vui lòng thử lại sau.'),
)

const clear = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center bg-[#141810] text-white px-4">
    <div class="text-center max-w-lg">
      <p class="text-primary-400 text-sm uppercase tracking-[0.2em] mb-3">
        {{ statusCode }}
      </p>
      <h1 class="font-heading text-3xl md:text-4xl font-bold mb-4">
        {{ title }}
      </h1>
      <p class="text-white/65 mb-8 leading-relaxed">
        {{ message }}
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center min-h-[44px] px-6 py-3
               bg-gradient-to-br from-[#7a4a12] to-[#64231e] text-[#e8d5a8]
               text-xs font-bold uppercase tracking-widest rounded-sm"
        @click="clear"
      >
        Trang chủ
      </button>
    </div>
  </div>
</template>
