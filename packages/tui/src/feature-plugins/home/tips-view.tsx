import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"
import { t } from "../../i18n"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}
type Tip = string | ((shortcuts: Shortcuts) => string | undefined)

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

// Raw English key; translated lazily at render so it reflects the locale set after this module loads.
const NO_MODELS_TIP = "Run {highlight}/connect{/highlight} to add an AI provider and start coding"

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function commandText(command: string, shortcut: string) {
  if (!shortcut) return shortcutText(command)
  return `${shortcutText(command)} or ${shortcutText(shortcut)}`
}

function press(shortcut: string, text: string) {
  if (!shortcut) return undefined
  return `${t("Press")} ${shortcutText(shortcut)} ${text}`
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("opencode.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }
  const tip = createMemo(() => {
    if (props.connected === false) return t(NO_MODELS_TIP)
    const tips = [...TIPS, process.platform !== "win32" ? TERMINAL_SUSPEND_TIP : INPUT_UNDO_TIP].flatMap((item) => {
      // String tips are baked at module load (before setLocale), so they hold the English key — re-translate here.
      const value = typeof item === "string" ? t(item) : item(shortcuts)
      return value ? [value] : []
    })
    return tips[Math.floor(tipOffset * tips.length)] ?? t(NO_MODELS_TIP)
  }, t(NO_MODELS_TIP))
  // Solid can expose a memo's initial value while a pure computation is pending.
  const parts = createMemo(() => {
    const value = tip()
    if (typeof value === "string") return parse(value)
    return parse(t(NO_MODELS_TIP))
  }, parse(t(NO_MODELS_TIP)))

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        {`● ${t("Tip")} `}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}

const TIPS: Tip[] = [
  t("Type {highlight}@{/highlight} followed by a filename to fuzzy search and attach files"),
  t("Start a message with {highlight}!{/highlight} to run shell commands directly (e.g., {highlight}!ls -la{/highlight})"),
  (shortcuts) => press(shortcuts.agentCycle(), t("to cycle between Build and Plan agents")),
  t("Use {highlight}/undo{/highlight} to revert the last message and file changes"),
  t("Use {highlight}/redo{/highlight} to restore previously undone messages and file changes"),
  t("Run {highlight}/share{/highlight} to create a public link to your conversation at opencode.ai"),
  t("Drag and drop images or PDFs into the terminal to add them as context"),
  (shortcuts) => press(shortcuts.inputPaste(), t("to paste images from your clipboard into the prompt")),
  (shortcuts) => t("Use {command} to compose messages in your external editor", { command: commandText("/editor", shortcuts.editorOpen()) }),
  t("Run {highlight}/init{/highlight} to auto-generate project rules based on your codebase"),
  (shortcuts) => t("Use {command} to see and switch between available AI models", { command: commandText("/models", shortcuts.modelList()) }),
  (shortcuts) => t("Use {command} to switch between {count} built-in themes", { command: commandText("/themes", shortcuts.themeList()), count: themeCount }),
  (shortcuts) => t("Use {command} to start a fresh conversation session", { command: commandText("/new", shortcuts.sessionNew()) }),
  (shortcuts) => t("Use {command} to list, pin, and continue sessions", { command: commandText("/sessions", shortcuts.sessionList()) }),
  (shortcuts) => press(shortcuts.sessionPinToggle(), t("in the session list to pin a session so it stays at the top")),
  (shortcuts) =>
    shortcuts.sessionQuickSwitch1() && shortcuts.sessionQuickSwitch9()
      ? t("Pinned sessions are assigned quick slots; use {slot1} through {slot9} to switch", { slot1: shortcutText(shortcuts.sessionQuickSwitch1()), slot9: shortcutText(shortcuts.sessionQuickSwitch9()) })
      : undefined,
  t("Run {highlight}/compact{/highlight} to summarize long sessions near context limits"),
  (shortcuts) => t("Use {command} to save the conversation as Markdown", { command: commandText("/export", shortcuts.sessionExport()) }),
  (shortcuts) => press(shortcuts.messagesCopy(), t("to copy the assistant's last message to clipboard")),
  (shortcuts) => press(shortcuts.commandList(), t("to see all available actions and commands")),
  t("Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers"),
  (shortcuts) => t("The leader key is {key}; combine with other keys for quick actions", { key: shortcutText(shortcuts.leader()) }),
  (shortcuts) => press(shortcuts.modelCycleRecent(), t("to quickly switch between recently used models")),
  (shortcuts) => press(shortcuts.sessionSidebarToggle(), t("in a session to show or hide the sidebar panel")),
  (shortcuts) =>
    shortcuts.messagesPageUp() && shortcuts.messagesPageDown()
      ? t("Use {pageUp}/{pageDown} to navigate through conversation history", { pageUp: shortcutText(shortcuts.messagesPageUp()), pageDown: shortcutText(shortcuts.messagesPageDown()) })
      : undefined,
  (shortcuts) => press(shortcuts.messagesFirst(), t("to jump to the beginning of the conversation")),
  (shortcuts) => press(shortcuts.messagesLast(), t("to jump to the most recent message")),
  (shortcuts) => press(shortcuts.inputNewline(), t("to add newlines in your prompt")),
  (shortcuts) => press(shortcuts.inputClear(), t("when typing to clear the input field")),
  (shortcuts) => press(shortcuts.sessionInterrupt(), t("to stop the AI mid-response")),
  t("Switch to {highlight}Plan{/highlight} agent to get suggestions without making actual changes"),
  t("Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents"),
  (shortcuts) => {
    const items = [
      shortcuts.sessionParent(),
      shortcuts.childFirst(),
      shortcuts.childPrevious(),
      shortcuts.childNext(),
    ].filter(Boolean)
    if (!items.length) return undefined
    return t("Use {shortcuts} to move between parent and child sessions", { shortcuts: items.map(shortcutText).join(" / ") })
  },
  t("Create {highlight}opencode.json{/highlight} for server settings and {highlight}tui.json{/highlight} for TUI settings"),
  t("Place TUI settings in {highlight}~/.config/opencode/tui.json{/highlight} for global config"),
  t("Add {highlight}$schema{/highlight} to your config for autocomplete in your editor"),
  t("Configure {highlight}model{/highlight} in config to set your default model"),
  t("Override any keybind in {highlight}tui.json{/highlight} via the {highlight}keybinds{/highlight} section"),
  t("Set any keybind to {highlight}none{/highlight} to disable it completely"),
  t("Configure local or remote MCP servers in the {highlight}mcp{/highlight} config section"),
  t("Add {highlight}.md{/highlight} files to {highlight}.opencode/commands/{/highlight} to define reusable custom prompts"),
  t("Use {highlight}$ARGUMENTS{/highlight}, {highlight}$1{/highlight}, {highlight}$2{/highlight} in custom commands for dynamic input"),
  t("Use backticks in commands to inject shell output (e.g., {highlight}`git status`{/highlight})"),
  t("Add {highlight}.md{/highlight} files to {highlight}.opencode/agents/{/highlight} for specialized AI personas"),
  t("Configure per-agent permissions for {highlight}edit{/highlight}, {highlight}bash{/highlight}, and {highlight}webfetch{/highlight} tools"),
  t('Use patterns like {highlight}"git *": "allow"{/highlight} for granular bash permissions'),
  t('Set {highlight}"rm -rf *": "deny"{/highlight} to block destructive commands'),
  t('Configure {highlight}"git push": "ask"{/highlight} to require approval before pushing'),
  t('Set {highlight}"formatter": true{/highlight} in config to enable built-in formatters like prettier, gofmt, and ruff'),
  t('Set {highlight}"formatter": false{/highlight} in config to disable formatters enabled by another config layer'),
  t("Define custom formatter commands with file extensions in config"),
  t('Set {highlight}"lsp": true{/highlight} in config to enable built-in LSP servers for code analysis'),
  t("Create {highlight}.ts{/highlight} files in {highlight}.opencode/tools/{/highlight} to define new LLM tools"),
  t("Tool definitions can invoke scripts written in Python, Go, etc"),
  t("Add {highlight}.ts{/highlight} files to {highlight}.opencode/plugins/{/highlight} for event hooks"),
  t("Use plugins to send OS notifications when sessions complete"),
  t("Create a plugin to prevent KZCode from reading sensitive files"),
  t("Use {highlight}opencode run{/highlight} for non-interactive scripting"),
  t("Use {highlight}opencode --continue{/highlight} to resume the last session"),
  t("Use {highlight}opencode run -f file.ts{/highlight} to attach files via CLI"),
  t("Use {highlight}--format json{/highlight} for machine-readable output in scripts"),
  t("Run {highlight}opencode serve{/highlight} for headless API access to KZCode"),
  t("Use {highlight}opencode run --attach{/highlight} to connect to a running server"),
  t("Run {highlight}opencode upgrade{/highlight} to update to the latest version"),
  t("Run {highlight}opencode auth list{/highlight} to see all configured providers"),
  t("Run {highlight}opencode agent create{/highlight} for guided agent creation"),
  t("Use {highlight}/opencode{/highlight} in GitHub issues/PRs to trigger AI actions"),
  t("Run {highlight}opencode github install{/highlight} to set up the GitHub workflow"),
  t("Comment {highlight}/opencode fix this{/highlight} on issues to auto-create PRs"),
  t("Comment {highlight}/oc{/highlight} on PR code lines for targeted code reviews"),
  t('Use {highlight}"theme": "system"{/highlight} to match your terminal\'s colors'),
  t("Create JSON theme files in {highlight}.opencode/themes/{/highlight} directory"),
  t("Themes support dark/light variants for both modes"),
  t("Use numeric xterm color codes 0-255 in custom theme JSON"),
  t("Use {highlight}{env:VAR_NAME}{/highlight} syntax to reference environment variables in config"),
  t("Use {highlight}{file:path}{/highlight} to include file contents in config values"),
  t("Use {highlight}instructions{/highlight} in config to load additional rules files"),
  t("Set agent {highlight}temperature{/highlight} from 0.0 (focused) to 1.0 (creative)"),
  t("Configure {highlight}steps{/highlight} to limit agentic iterations per request"),
  t('Set {highlight}"tools": {"bash": false}{/highlight} to disable specific tools'),
  t('Set {highlight}"mcp_*": false{/highlight} to disable all tools from an MCP server'),
  t("Override global tool settings per agent configuration"),
  t('Set {highlight}"share": "auto"{/highlight} to automatically share all sessions'),
  t('Set {highlight}"share": "disabled"{/highlight} to prevent any session sharing'),
  t("Run {highlight}/unshare{/highlight} to remove a session from public access"),
  t("Permission {highlight}doom_loop{/highlight} prevents infinite tool call loops"),
  t("Permission {highlight}external_directory{/highlight} protects files outside project"),
  t("Run {highlight}opencode debug config{/highlight} to troubleshoot configuration"),
  t("Use {highlight}--print-logs{/highlight} flag to see detailed logs in stderr"),
  (shortcuts) => t("Use {command} to jump to specific messages", { command: commandText("/timeline", shortcuts.sessionTimeline()) }),
  (shortcuts) => press(shortcuts.messagesToggleConceal(), t("to toggle code block visibility in messages")),
  (shortcuts) => t("Use {command} to see system status info", { command: commandText("/status", shortcuts.statusView()) }),
  t("Enable {highlight}scroll_acceleration{/highlight} in {highlight}tui.json{/highlight} for smooth macOS-style scrolling"),
  (shortcuts) =>
    shortcuts.commandList()
      ? t("Toggle username display in chat via the command palette ({shortcut})", { shortcut: shortcutText(shortcuts.commandList()) })
      : t("Toggle username display in chat via the command palette"),
  t("Run {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight} for containerized use"),
  t("Use {highlight}/connect{/highlight} with KZCode Zen for curated, tested models"),
  t("Commit your project's {highlight}AGENTS.md{/highlight} file to Git for team sharing"),
  t("Use {highlight}/review{/highlight} to review uncommitted changes, branches, or PRs"),
  (shortcuts) => t("Use {command} to show the help dialog", { command: commandText("/help", shortcuts.helpShow()) }),
  t("Use {highlight}/rename{/highlight} to rename the current session"),
]

const INPUT_UNDO_TIP: Tip = (shortcuts) => press(shortcuts.inputUndo(), t("to undo changes in your prompt"))
const TERMINAL_SUSPEND_TIP: Tip = (shortcuts) =>
  press(shortcuts.terminalSuspend(), t("to suspend the terminal and return to your shell"))
