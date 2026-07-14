<script setup lang="ts">
/**
 * Cặp nút "Thêm vào giỏ" / "Mua ngay" dùng chung cho mọi thẻ sản phẩm trong
 * danh sách. `iconOnly` cho các vị trí nhỏ (menu phải, khối khuyến mãi,
 * sản phẩm liên quan) — chỉ hiện icon, nhãn đưa vào aria-label/title.
 *
 * Luôn dùng @click.prevent.stop vì thẻ sản phẩm thường được bọc trong
 * NuxtLink sang trang chi tiết.
 */
const props = withDefaults(defineProps<{
  variantId: string
  slug: string
  inStock?: boolean
  iconOnly?: boolean
}>(), {
  inStock: true,
  iconOnly: false,
})

const { t } = useI18n()
const localePath = useLocalePath()
const { addToCart } = useCart()

const adding = ref(false)
const buying = ref(false)
const busy = computed(() => adding.value || buying.value)

// Danh sách chỉ có biến thể mặc định; thiếu variantId (dữ liệu lỗi) thì đưa
// khách về trang chi tiết để tự chọn thay vì gọi API hỏng.
const goDetail = () => navigateTo(localePath(`/san-pham/${props.slug}`))

const handleAdd = async () => {
  if (busy.value || !props.inStock) return
  if (!props.variantId) return goDetail()
  adding.value = true
  try {
    await addToCart(props.variantId, 1)
  } finally {
    adding.value = false
  }
}

const handleBuyNow = async () => {
  if (busy.value || !props.inStock) return
  if (!props.variantId) return goDetail()
  buying.value = true
  try {
    const res = await addToCart(props.variantId, 1)
    if (res.success) await navigateTo(localePath('/gio-hang'))
  } finally {
    buying.value = false
  }
}
</script>

<template>
  <!-- ── Chế độ icon (vị trí nhỏ) ── -->
  <div v-if="iconOnly" class="flex items-center gap-1.5">
    <button
      type="button"
      class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full
             bg-primary-500 text-white hover:bg-primary-600 transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!inStock || busy"
      :aria-label="t('cart.add')"
      :title="t('cart.add')"
      @click.prevent.stop="handleAdd"
    >
      <svg v-if="!adding" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M11 10.5h5M13.5 8v5" />
      </svg>
      <svg v-else class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
      </svg>
    </button>

    <button
      type="button"
      class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full
             border border-primary-500 text-primary-400 hover:bg-primary-500 hover:text-white
             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!inStock || busy"
      :aria-label="t('products.buyNow')"
      :title="t('products.buyNow')"
      @click.prevent.stop="handleBuyNow"
    >
      <svg v-if="!buying" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z" />
      </svg>
      <svg v-else class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  <!-- ── Chế độ đầy đủ (lưới sản phẩm) ── -->
  <div v-else class="flex items-stretch gap-2">
    <button
      type="button"
      class="btn-primary !min-h-[36px] flex-1 gap-1.5 rounded-full px-2.5 !text-[10px] md:!text-[11px]
             disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!inStock || busy"
      @click.prevent.stop="handleAdd"
      :aria-label="t('cart.add')"
      :title="t('cart.add')"
    >
      <svg v-if="!adding" class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M11 10.5h5M13.5 8v5" />
      </svg>
      <svg v-else class="h-3.5 w-3.5 flex-none animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
      </svg>
      <!-- <span>{{ adding ? '…' : t('cart.add') }}</span> -->
    </button>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 min-h-[36px] flex-1 rounded-full px-2.5
             border-2 border-primary-500 text-primary-400
             font-condensed text-[10px] md:text-[11px] uppercase tracking-[0.12em]
             hover:bg-primary-500 hover:text-white transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!inStock || busy"
      @click.prevent.stop="handleBuyNow"
    >
      <svg v-if="!buying" class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z" />
      </svg>
      <svg v-else class="h-3.5 w-3.5 flex-none animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
      </svg>
      <span>{{ buying ? '…' : t('products.buyNow') }}</span>
    </button>
  </div>
</template>
