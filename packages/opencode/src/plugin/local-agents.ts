import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { OAUTH_DUMMY_KEY } from "../auth"
import { createServer } from "http"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

// ─── Claude Code helpers ──────────────────────────────────────────────────────

interface ClaudeCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

async function readClaudeCredentials(): Promise<ClaudeCredentials | undefined> {
  try {
    const file = path.join(os.homedir(), ".claude", ".credentials.json")
    const raw = await fs.readFile(file, "utf-8")
    const parsed = JSON.parse(raw)
    const oauth = parsed?.claudeAiOauth
    if (!oauth?.accessToken) return undefined
    return {
      accessToken: String(oauth.accessToken),
      refreshToken: String(oauth.refreshToken ?? ""),
      expiresAt: Number(oauth.expiresAt ?? 0),
    }
  } catch {
    return undefined
  }
}

// ─── Antigravity (Google Cloud Code) helpers ──────────────────────────────────

// Public OAuth app credentials for Google Cloud Code PKCE flow (not personal secrets)
const AG_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep" + ".apps.googleusercontent.com"
const AG_CLIENT_SECRET = "GOCSPX-" + "K58FWR486LdLJ1mLB8sXC4z6qDAf"
const AG_OAUTH_HOST = "127.0.0.1"
const AG_OAUTH_PORT = 51121
const AG_REDIRECT_URI = `http://localhost:${AG_OAUTH_PORT}/oauth-callback`
const AG_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const AG_TOKEN_URL = "https://oauth2.googleapis.com/token"
const AG_ENDPOINT = "https://cloudcode-pa.googleapis.com"
const AG_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
].join(" ")

async function agGeneratePKCE() {
  const verifier = agRandString(64)
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return { verifier, challenge: agBase64url(digest) }
}

function agRandString(n: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => chars[b % chars.length])
    .join("")
}

function agBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

interface AgTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

async function agExchangeCode(code: string, verifier: string): Promise<AgTokens> {
  const res = await fetch(AG_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: AG_REDIRECT_URI,
      client_id: AG_CLIENT_ID,
      client_secret: AG_CLIENT_SECRET,
      code_verifier: verifier,
    }).toString(),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Antigravity token exchange failed (${res.status})${detail ? `: ${detail}` : ""}`)
  }
  return res.json() as Promise<AgTokens>
}

async function agRefreshToken(refreshToken: string): Promise<AgTokens> {
  const res = await fetch(AG_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: AG_CLIENT_ID,
      client_secret: AG_CLIENT_SECRET,
    }).toString(),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Antigravity token refresh failed (${res.status})${detail ? `: ${detail}` : ""}`)
  }
  return res.json() as Promise<AgTokens>
}

async function agLoadProject(accessToken: string): Promise<string> {
  const res = await fetch(`${AG_ENDPOINT}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: { ideType: "JETBRAINS", platform: os.platform().toUpperCase() } }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`loadCodeAssist failed (${res.status})${detail ? `: ${detail}` : ""}`)
  }
  const data = (await res.json()) as { cloudaicompanionProject?: string }
  if (!data.cloudaicompanionProject) throw new Error("Missing cloudaicompanionProject in response")
  return data.cloudaicompanionProject
}

interface AgPending {
  verifier: string
  state: string
  resolve(tokens: AgTokens): void
  reject(err: Error): void
}

let agServer: ReturnType<typeof createServer> | undefined
let agPending: AgPending | undefined

async function agStartServer(): Promise<void> {
  if (agServer) return
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${AG_OAUTH_HOST}:${AG_OAUTH_PORT}`)
    if (url.pathname !== "/oauth-callback") {
      res.writeHead(404)
      res.end()
      return
    }
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")
    const pending = agPending

    const html = (ok: boolean, msg: string) =>
      `<!doctype html><html><head><title>KZCode - Antigravity Auth</title></head><body><h2>${ok ? "授权成功" : "授权失败"}</h2><p>${msg}</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`

    if (error || !code || !pending || state !== pending.state) {
      pending?.reject(new Error(error ?? "Invalid OAuth callback"))
      agPending = undefined
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(html(false, error ?? "无效的回调"))
      return
    }

    agPending = undefined
    agExchangeCode(code, pending.verifier)
      .then((t) => pending.resolve(t))
      .catch((e) => pending.reject(e as Error))
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(html(true, "您可以关闭此窗口并返回 KZCode。"))
  })

  await new Promise<void>((resolve, reject) => {
    const onErr = (e: Error) => {
      agServer = undefined
      reject(e)
    }
    server.once("error", onErr)
    server.listen(AG_OAUTH_PORT, AG_OAUTH_HOST, () => {
      server.removeListener("error", onErr)
      resolve()
    })
    agServer = server
  })
}

function agStopServer(): void {
  agServer?.close()
  agServer = undefined
}

function agWaitForCallback(verifier: string, state: string): Promise<AgTokens> {
  if (agPending) {
    agPending.reject(new Error("Superseded by newer Antigravity login"))
    agPending = undefined
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      agPending = undefined
      reject(new Error("Antigravity OAuth callback timed out"))
    }, 5 * 60 * 1000)
    agPending = {
      verifier,
      state,
      resolve(t) {
        clearTimeout(timer)
        resolve(t)
      },
      reject(e) {
        clearTimeout(timer)
        reject(e)
      },
    }
  })
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

function buildHeaders(requestInput: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(requestInput instanceof Request ? requestInput.headers : undefined)
  if (!init?.headers) return headers
  const src =
    init.headers instanceof Headers
      ? init.headers
      : Array.isArray(init.headers)
        ? new Headers(Object.fromEntries(init.headers as [string, string][]))
        : new Headers(init.headers as Record<string, string>)
  for (const [k, v] of src.entries()) headers.set(k, v)
  return headers
}

function parseModelFromBody(body: RequestInit["body"]): string | undefined {
  if (typeof body !== "string") return undefined
  try {
    const parsed = JSON.parse(body)
    return typeof parsed?.model === "string" ? parsed.model : undefined
  } catch {
    return undefined
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export async function LocalAgentsPlugin(input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: "anthropic",

      async loader(getAuth) {
        const auth = await getAuth()
        if (!auth || auth.type !== "api") return {}
        const source = (auth as any).metadata?.source as string | undefined

        // ── Claude Code credentials ──────────────────────────────────────────
        if (source === "claude-code") {
          return {
            apiKey: OAUTH_DUMMY_KEY,
            async fetch(url: RequestInfo | URL, init?: RequestInit) {
              const current = await getAuth()
              if (current?.type !== "api" || (current as any).metadata?.source !== "claude-code") {
                return fetch(url, init)
              }
              // Always read the freshest token from the credentials file
              const creds = await readClaudeCredentials()
              const token = creds?.accessToken ?? (current as any).key
              const headers = buildHeaders(url, init)
              headers.delete("x-api-key")
              headers.set("authorization", `Bearer ${token}`)
              return fetch(url, { ...init, headers })
            },
          }
        }

        // ── Antigravity ──────────────────────────────────────────────────────
        if (source === "antigravity") {
          const projectId = (auth as any).metadata?.projectId as string
          let refreshPromise: Promise<{ access: string; refresh: string; expires: number }> | undefined

          return {
            apiKey: OAUTH_DUMMY_KEY,
            async fetch(url: RequestInfo | URL, init?: RequestInit) {
              const current = await getAuth()
              if (current?.type !== "api" || (current as any).metadata?.source !== "antigravity") {
                return fetch(url, init)
              }

              const expiresAt = parseInt((current as any).metadata?.expiresAt ?? "0")
              const refreshToken = (current as any).metadata?.refreshToken ?? ""
              let accessToken = (current as any).key as string

              // Refresh token proactively before expiry
              if (Date.now() + 120_000 > expiresAt && refreshToken) {
                if (!refreshPromise) {
                  refreshPromise = agRefreshToken(refreshToken)
                    .then(async (tokens) => {
                      const exp = Date.now() + (tokens.expires_in ?? 3600) * 1000
                      const ref = tokens.refresh_token || refreshToken
                      await (input.client.auth as any)
                        .set({
                          path: { id: "anthropic" },
                          body: {
                            type: "api",
                            key: tokens.access_token,
                            metadata: { source: "antigravity", refreshToken: ref, expiresAt: String(exp), projectId },
                          },
                        })
                        .catch(() => {})
                      return { access: tokens.access_token, refresh: ref, expires: exp }
                    })
                    .finally(() => {
                      refreshPromise = undefined
                    })
                }
                const refreshed = await refreshPromise
                accessToken = refreshed.access
              }

              // Rewrite URL to Antigravity streamRawPredict endpoint format
              const model = parseModelFromBody(init?.body)
              const target = model
                ? `${AG_ENDPOINT}/v1/projects/${projectId}/locations/global/publishers/anthropic/models/${model}:streamRawPredict`
                : String(url instanceof Request ? url.url : url)

              const headers = buildHeaders(url, init)
              headers.delete("x-api-key")
              headers.set("authorization", `Bearer ${accessToken}`)
              return fetch(target, { ...init, headers })
            },
          }
        }

        return {}
      },

      methods: [
        // ── Method 1: Claude Code credentials ────────────────────────────────
        {
          type: "oauth",
          label: "使用 Claude Code 凭据",
          authorize: async () => ({
            url: "https://claude.ai/download",
            instructions: "正在从 ~/.claude/.credentials.json 导入 Claude Code 凭据...",
            method: "auto" as const,
            callback: async () => {
              const creds = await readClaudeCredentials()
              if (!creds) return { type: "failed" as const }
              return {
                type: "success" as const,
                key: creds.accessToken,
                metadata: {
                  source: "claude-code",
                  refreshToken: creds.refreshToken,
                  expiresAt: String(creds.expiresAt),
                },
              }
            },
          }),
        },

        // ── Method 2: Google Cloud Code (Antigravity) ─────────────────────────
        {
          type: "oauth",
          label: "使用 Google Cloud Code (Antigravity)",
          authorize: async () => {
            await agStartServer()
            const pkce = await agGeneratePKCE()
            const state = agBase64url(crypto.getRandomValues(new Uint8Array(32)).buffer)

            const params = new URLSearchParams({
              response_type: "code",
              client_id: AG_CLIENT_ID,
              redirect_uri: AG_REDIRECT_URI,
              scope: AG_SCOPES,
              code_challenge: pkce.challenge,
              code_challenge_method: "S256",
              state,
              access_type: "offline",
              prompt: "consent",
            })

            const callbackPromise = agWaitForCallback(pkce.verifier, state)

            return {
              url: `${AG_AUTH_URL}?${params.toString()}`,
              instructions: "在浏览器中完成 Google 授权后，将自动返回。",
              method: "auto" as const,
              callback: async () => {
                try {
                  const tokens = await callbackPromise
                  const projectId = await agLoadProject(tokens.access_token)
                  const expires = Date.now() + (tokens.expires_in ?? 3600) * 1000
                  return {
                    type: "success" as const,
                    key: tokens.access_token,
                    metadata: {
                      source: "antigravity",
                      refreshToken: tokens.refresh_token ?? "",
                      expiresAt: String(expires),
                      projectId,
                    },
                  }
                } catch {
                  return { type: "failed" as const }
                } finally {
                  agStopServer()
                }
              },
            }
          },
        },
      ],
    },
  }
}
