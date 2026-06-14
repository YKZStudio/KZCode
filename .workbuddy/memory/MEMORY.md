# KZCode 项目记忆

## i18n 语言支持
- 只保留三种语言：en (英文)、zh (简体中文)、zht (繁体中文)
- 其他所有语言已被删除，非中文区域自动回退到英文
- 存储键使用 `kzcode.global.dat:language`（已修好 rebrand 残留的 opencode 前缀 bug）

## i18n 系统位置
- App/Web: packages/app/src/i18n/, packages/ui/src/i18n/
- Console: packages/console/app/src/i18n/
- Desktop: packages/desktop/src/renderer/i18n/
- TUI: packages/tui/src/i18n/
- Web 文档: packages/web/src/content/i18n/ (JSON 格式), packages/web/src/content/docs/zh-cn/, zh-tw/

## TUI i18n 设计
- 使用"英文字符串作为 key"模式，t() 函数自动回退到英文
- zh.ts 字典包含所有翻译（同时用于 zh 和 zht）
- Locale 从 TuiConfig 读取，支持环境变量 LANG/LC_ALL 自动检测
- 所有面向用户的字符串通过 t("english text") 调用
