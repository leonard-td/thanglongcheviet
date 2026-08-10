<script setup lang="ts">
import { formatMoney } from '~/utils/storefront'
import {
  isAskEscalateContent,
  type AskChatMessage,
} from '~/utils/ask'

const LOCAL_PENDING_SESSION = 'local-pending'
const ASK_SESSION_STORAGE_KEY = 'tlcv-ask-session-v1'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { sendMessage, escalate } = useAsk()
const { setOpen, closeEpoch } = useUiOverlay()
const { active: quickBuyBarActive } = useQuickBuyBar()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const threadEl = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const sessionId = ref<string | undefined>()
const draft = ref('')
const pending = ref(false)
const error = ref<string | undefined>()

function defaultGreeting(): AskChatMessage {
  return {
    id: 'ask-greeting',
    sessionId: LOCAL_PENDING_SESSION,
    role: 'assistant',
    content: t('ask.greeting'),
    createdAt: '2026-01-01T00:00:00Z',
  }
}

const messages = ref<AskChatMessage[]>([defaultGreeting()])

function readPersistedAsk(): { sessionId?: string; messages: AskChatMessage[] } | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(ASK_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      sessionId?: string
      messages?: AskChatMessage[]
    }
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null
    return {
      sessionId: parsed.sessionId,
      messages: parsed.messages,
    }
  }
  catch {
    return null
  }
}

function persistAsk() {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      ASK_SESSION_STORAGE_KEY,
      JSON.stringify({
        sessionId: sessionId.value,
        messages: messages.value,
      }),
    )
  }
  catch {
    // ignore quota / private mode
  }
}

onMounted(() => {
  const saved = readPersistedAsk()
  if (!saved) return
  sessionId.value = saved.sessionId
  messages.value = saved.messages.map((m) =>
    m.id === 'ask-greeting' ? { ...m, content: t('ask.greeting') } : m,
  )
})

watch([sessionId, messages], () => persistAsk(), { deep: true })

const priceLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))

/** Only the latest escalate turn shows the contact form (shared form state). */
const latestEscalateIndex = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]
    if (m.role === 'assistant' && isAskEscalateContent(m.content)) return i
  }
  return -1
})

watch(open, (v) => {
  setOpen('ask', v)
  if (v) {
    nextTick(() => inputRef.value?.focus())
  }
})
watch(closeEpoch, () => {
  open.value = false
})
onUnmounted(() => setOpen('ask', false))

watch(locale, () => {
  const greeting = messages.value.find(m => m.id === 'ask-greeting')
  if (greeting) greeting.content = t('ask.greeting')
})

onClickOutside(root, () => {
  if (open.value) open.value = false
})
onKeyStroke('Escape', () => {
  open.value = false
})

function scrollToEnd() {
  nextTick(() => {
    const el = threadEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function sendUserMessage(raw: string) {
  const content = raw.trim()
  if (!content || pending.value) return

  messages.value.push({
    id: `local_${Date.now()}`,
    sessionId: sessionId.value ?? LOCAL_PENDING_SESSION,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  })
  draft.value = ''
  error.value = undefined
  pending.value = true
  scrollToEnd()

  try {
    const reply = await sendMessage({
      message: content,
      sessionId: sessionId.value,
    })
    sessionId.value = reply.sessionId
    messages.value.push(reply.message)
    scrollToEnd()
  }
  catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : t('ask.ui.error')
  }
  finally {
    pending.value = false
    scrollToEnd()
  }
}

function onSubmit(e: Event) {
  e.preventDefault()
  void sendUserMessage(draft.value)
}

function priorUserQuestion(index: number): string | undefined {
  return [...messages.value]
    .slice(0, index)
    .reverse()
    .find(m => m.role === 'user')?.content
}

// ── Escalate form state (per last escalate message) ──
const escName = ref('')
const escPhone = ref('')
const escEmail = ref('')
const escStatus = ref<'idle' | 'pending' | 'done' | 'error'>('idle')
const escMessage = ref<string | null>(null)

async function submitEscalate(question: string) {
  if (!escEmail.value.trim() && !escPhone.value.trim()) return
  escStatus.value = 'pending'
  escMessage.value = null
  const res = await escalate({
    q: question,
    name: escName.value.trim() || undefined,
    phone: escPhone.value.trim() || undefined,
    email: escEmail.value.trim() || undefined,
  })
  if (res.success) {
    escStatus.value = 'done'
    escMessage.value = res.message
  }
  else {
    escStatus.value = 'error'
    escMessage.value = res.message
  }
}

watch(latestEscalateIndex, () => {
  escName.value = ''
  escPhone.value = ''
  escEmail.value = ''
  escStatus.value = 'idle'
  escMessage.value = null
})
</script>

<template>
  <div
    ref="root"
    class="ask"
    :class="{ 'above-buybar': quickBuyBarActive }"
  >
    <!-- Panel -->
    <Transition name="ask-panel">
      <section
        v-if="open"
        class="ask-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ask.ui.title')"
      >
        <header class="ask-header">
          <h2 class="ask-title">
            {{ t('ask.ui.title') }}
          </h2>
          <button
            type="button"
            class="ask-close"
            :aria-label="t('ask.ui.close')"
            @click="open = false"
          >
            ×
          </button>
        </header>

        <div
          ref="threadEl"
          class="ask-thread"
          :aria-label="t('ask.conversationLabel')"
          :aria-busy="pending || undefined"
        >
          <div
            v-for="(message, index) in messages"
            :key="message.id"
            class="ask-row"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <div class="ask-bubble">
              {{ message.content }}
            </div>

            <div
              v-if="message.suggestions?.length"
              class="ask-suggestions"
              :aria-label="t('ask.suggestionsLabel')"
            >
              <NuxtLink
                v-for="p in message.suggestions"
                :key="p.id"
                :to="localePath(`/san-pham/${p.slug}`)"
                class="ask-card"
                @click="open = false"
              >
                <img
                  v-if="p.image"
                  :src="p.image"
                  :alt="p.title"
                  class="ask-card-img"
                  loading="lazy"
                >
                <div
                  v-else
                  class="ask-card-img ask-card-img--empty"
                  aria-hidden="true"
                />
                <div class="ask-card-body">
                  <p class="ask-card-title">
                    {{ p.title }}
                  </p>
                  <p
                    v-if="p.price > 0"
                    class="ask-card-price"
                  >
                    {{ formatMoney(p.price, p.currencyCode, priceLocale) }}
                  </p>
                </div>
              </NuxtLink>
            </div>

            <div
              v-if="message.role === 'assistant' && message.relatedQuestions?.length"
              class="ask-related"
              role="group"
              :aria-label="t('ask.relatedLabel')"
            >
              <button
                v-for="q in message.relatedQuestions"
                :key="q"
                type="button"
                class="ask-chip"
                :disabled="pending"
                @click="sendUserMessage(q)"
              >
                {{ q }}
              </button>
            </div>

            <form
              v-if="
                message.role === 'assistant'
                  && index === latestEscalateIndex
                  && priorUserQuestion(index)
              "
              class="ask-escalate"
              @submit.prevent="submitEscalate(priorUserQuestion(index)!)"
            >
              <p
                v-if="escStatus === 'done'"
                class="ask-escalate-done"
              >
                {{ escMessage }}
              </p>
              <template v-else>
                <p class="ask-escalate-hint">
                  {{ t('ask.escalate.hint') }}
                </p>
                <input
                  v-model="escName"
                  type="text"
                  :placeholder="t('ask.escalate.namePlaceholder')"
                  class="ask-input"
                  autocomplete="name"
                >
                <input
                  v-model="escPhone"
                  type="tel"
                  :placeholder="t('ask.escalate.phonePlaceholder')"
                  class="ask-input"
                  autocomplete="tel"
                >
                <input
                  v-model="escEmail"
                  type="email"
                  :placeholder="t('ask.escalate.emailPlaceholder')"
                  class="ask-input"
                  autocomplete="email"
                >
                <p
                  v-if="escMessage && escStatus === 'error'"
                  class="ask-error"
                  role="alert"
                >
                  {{ escMessage }}
                </p>
                <button
                  type="submit"
                  class="ask-send"
                  :disabled="
                    escStatus === 'pending'
                      || (!escEmail.trim() && !escPhone.trim())
                  "
                >
                  {{
                    escStatus === 'pending'
                      ? t('ask.escalate.sending')
                      : t('ask.escalate.submit')
                  }}
                </button>
              </template>
            </form>
          </div>

          <div
            v-if="pending"
            class="ask-row is-assistant"
          >
            <div
              class="ask-bubble is-thinking"
              role="status"
            >
              {{ t('ask.ui.thinking') }}
            </div>
          </div>
        </div>

        <form
          class="ask-composer"
          @submit="onSubmit"
        >
          <input
            ref="inputRef"
            v-model="draft"
            type="text"
            class="ask-input ask-composer-input"
            :placeholder="t('ask.ui.placeholder')"
            :aria-label="t('ask.ui.placeholder')"
            :disabled="pending"
            autocomplete="off"
          >
          <button
            type="submit"
            class="ask-send"
            :disabled="pending || !draft.trim()"
          >
            {{ t('ask.ui.send') }}
          </button>
        </form>
        <p
          v-if="error"
          class="ask-error ask-footer-error"
          role="alert"
        >
          {{ error }}
        </p>
      </section>
    </Transition>

    <!-- FAB bottom-right -->
    <WidgetsTooltip :text="t('ask.ui.title')">
      <button
        type="button"
        class="ask-fab"
        :aria-expanded="open"
        :aria-label="t('ask.ui.title')"
        @click="open = !open"
      >
        <svg
          v-if="!open"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" />
        </svg>
        <span
          v-else
          aria-hidden="true"
          class="ask-fab-x"
        >×</span>
      </button>
    </WidgetsTooltip>
  </div>
</template>

<style scoped>
.ask {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  transition: bottom 0.25s ease;
}

.ask.above-buybar {
  bottom: 88px;
}

.ask-fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: #c9a86c;
  color: #1a1a1a;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, background 0.2s ease;
}

.ask-fab:hover,
.ask-fab:focus-visible {
  transform: translateY(-2px);
  background: #d4b87a;
}

.ask-fab-x {
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
}

.ask-panel {
  position: absolute;
  right: 0;
  bottom: 68px;
  display: flex;
  flex-direction: column;
  width: min(100vw - 24px, 380px);
  height: min(80vh, 560px);
  border-radius: 16px;
  background: #1f1f1f;
  color: #f5f5f0;
  border: 1px solid rgba(201, 168, 108, 0.25);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.ask-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ask-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #c9a86c;
}

.ask-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #f5f5f0;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.ask-close:hover {
  background: rgba(255, 255, 255, 0.06);
}

.ask-thread {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ask-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 100%;
}

.ask-row.is-user {
  align-items: flex-end;
}

.ask-row.is-assistant {
  align-items: flex-start;
}

.ask-bubble {
  max-width: 92%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.875rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.is-user .ask-bubble {
  background: #c9a86c;
  color: #1a1a1a;
  border-bottom-right-radius: 4px;
}

.is-assistant .ask-bubble {
  background: #2a2a2a;
  color: #f5f5f0;
  border-bottom-left-radius: 4px;
}

.ask-bubble.is-thinking {
  opacity: 0.75;
  font-style: italic;
}

.ask-suggestions {
  display: grid;
  gap: 8px;
  width: 100%;
}

.ask-card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 12px;
  background: #2a2a2a;
  border: 1px solid rgba(201, 168, 108, 0.2);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
}

.ask-card:hover {
  border-color: #c9a86c;
}

.ask-card-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: #2a3326;
  flex-shrink: 0;
}

.ask-card-img--empty {
  display: block;
}

.ask-card-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ask-card-price {
  margin: 4px 0 0;
  font-size: 0.8125rem;
  color: #c9a86c;
  font-weight: 600;
}

.ask-related {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ask-chip {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(201, 168, 108, 0.4);
  background: transparent;
  color: #c9a86c;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  white-space: normal;
  line-height: 1.3;
}

.ask-chip:hover:not(:disabled) {
  background: rgba(201, 168, 108, 0.12);
}

.ask-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ask-escalate {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: #252525;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ask-escalate-hint,
.ask-escalate-done {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(245, 245, 240, 0.75);
}

.ask-composer {
  display: flex;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.ask-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #2a2a2a;
  color: #f5f5f0;
  font-size: 0.875rem;
}

.ask-input::placeholder {
  color: rgba(245, 245, 240, 0.45);
}

.ask-input:focus {
  outline: none;
  border-color: #c9a86c;
}

.ask-composer-input {
  flex: 1;
}

.ask-send {
  flex-shrink: 0;
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: #c9a86c;
  color: #1a1a1a;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.ask-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ask-error {
  margin: 0;
  font-size: 0.75rem;
  color: #e57373;
}

.ask-footer-error {
  padding: 0 16px 12px;
}

.ask-panel-enter-active,
.ask-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ask-panel-enter-from,
.ask-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 480px) {
  .ask {
    right: 12px;
    bottom: 12px;
  }

  .ask.above-buybar {
    bottom: 80px;
  }

  .ask-panel {
    width: calc(100vw - 24px);
    height: min(78vh, 520px);
  }
}
</style>
