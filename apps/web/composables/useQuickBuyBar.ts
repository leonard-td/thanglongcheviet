// Trạng thái dùng chung: có đang hiện "Thanh mua nhanh cố định" (trang chi
// tiết sản phẩm) hay không. ConnectWidget là widget nổi cố định toàn cục,
// render ngoài phạm vi trang sản phẩm — nó đọc giá trị này để tự dịch lên
// trên, tránh bị thanh mua nhanh che khuất phần dưới màn hình.
const active = ref(false)

export function useQuickBuyBar() {
  const setActive = (v: boolean) => { active.value = v }
  return { active: computed(() => active.value), setActive }
}
