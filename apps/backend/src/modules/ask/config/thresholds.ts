export const HIGH_THRESHOLD = 2
export const MED_THRESHOLD = 1

/** Escalate sentinels — UI form triggers when assistant content equals either string. */
export const ESCALATE_MESSAGE_EN =
  "We couldn't find a confident answer. Leave your contact details and our team will reply."

export const ESCALATE_MESSAGE_VI =
  "Chúng tôi chưa tìm thấy câu trả lời phù hợp. Để lại thông tin liên hệ, đội ngũ sẽ phản hồi sớm."

/**
 * Engine default (EN). `answerQuestion` remaps to VI for Vietnamese queries
 * so the Nuxt escalate form matches.
 */
export const ESCALATE_MESSAGE = ESCALATE_MESSAGE_EN
