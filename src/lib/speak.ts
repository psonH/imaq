import type { Lang } from './i18n'

const VOICE_LANG: Record<Lang, string | null> = { en: 'en-CA', fr: 'fr-CA', iu: null }

export function canSpeak(lang: Lang) {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && VOICE_LANG[lang] !== null
}

export function speak(text: string, lang: Lang, onEnd: () => void) {
  const code = VOICE_LANG[lang]
  if (!code || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = code
  u.rate = 0.9
  u.onend = onEnd
  u.onerror = onEnd
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
