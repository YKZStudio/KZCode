import type { TuiLocale } from "../config"
import { createSignal } from "solid-js"
import { zh } from "./zh"

export type { TuiLocale }

const [localeSignal, setLocaleSignal] = createSignal<TuiLocale>("en")
let _dict: Record<string, string> = {}

export function setLocale(locale: TuiLocale) {
  setLocaleSignal(() => {
    _dict = locale === "zh" || locale === "zht" ? zh : {}
    return locale
  })
}

export function getLocale(): TuiLocale {
  return localeSignal()
}

function interpolate(text: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value !== undefined ? String(value) : `{${key}}`
  })
}

export function t(key: string, params?: Record<string, string | number | boolean>): string {
  const locale = localeSignal()
  if (locale === "en") return interpolate(key, params)
  const translated = _dict[key]
  return interpolate(translated ?? key, params)
}

export function tt(en: string, zhText: string): string {
  return localeSignal() === "en" ? en : zhText
}
