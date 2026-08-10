export type QueryLanguage = 'en' | 'vi'

/** Latin letters with Vietnamese diacritics (NFC). */
const VI_DIACRITIC = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i

/**
 * Common VI support / commerce tokens (ASCII-folded forms included where useful).
 * Not a full NLP model — good enough for Ask FAQ/intent until miss logs justify franc + ADR.
 */
const VI_TOKENS = [
  'giao hàng',
  'giao hang',
  'phí ship',
  'phi ship',
  'vận chuyển',
  'van chuyen',
  'đổi trả',
  'doi tra',
  'hoàn tiền',
  'hoan tien',
  'bảo hành',
  'bao hanh',
  'khiếu nại',
  'khieu nai',
  'hỏng',
  'hong',
  'bị vỡ',
  'sai hàng',
  'đơn hàng',
  'don hang',
  'thanh toán',
  'thanh toan',
  'giỏ hàng',
  'gio hang',
  'đăng ký',
  'dang ky',
  'đăng nhập',
  'dang nhap',
  'liên hệ',
  'lien he',
  'hỗ trợ',
  'ho tro',
  'sản phẩm',
  'san pham',
  'bài viết',
  'bai viet',
  'rẻ nhất',
  're nhat',
  'đắt nhất',
  'dat nhat',
]

/**
 * Detect query language for retrieval policy (not UI chrome — UI stays English, AP-29).
 * Prefer explicit `override` from the caller when present.
 */
export function detectLanguage(q: string, override?: QueryLanguage): QueryLanguage {
  if (override === 'en' || override === 'vi') return override

  const s = q.trim().toLowerCase()
  if (!s) return 'en'

  if (VI_DIACRITIC.test(s)) return 'vi'
  if (VI_TOKENS.some((t) => s.includes(t))) return 'vi'

  return 'en'
}
