# Novel Forge 视觉改版研究

## 参考来源

Open Design 设计系统目录：https://open-design.ai/plugins/systems/
Open Design GitHub：https://github.com/nexu-io/open-design

## 关键观察

Open Design 将设计系统组织成以 `DESIGN.md` 为核心的可版本化设计契约，并可附带 `manifest.json`、`tokens.css`、组件样例、资产和出处信息。目录中同时提供 `warm-editorial`、`Editorial`、`Elegant`、`Bento`、`Linear`、`Notion`、`kami (紙 / 纸)` 等可借鉴方向。

Open Design 的视觉目录不是单一模板，而是通过设计系统切换令后续渲染使用新的 tokens。对 Novel Forge 最有价值的不是复制其桌面应用或 MCP 安装方式，而是把视觉语言拆成颜色、字体、间距、边框、卡片、状态、动效等可维护 tokens。

## 改版方向

Novel Forge 继续使用奶油白与黑色墨水色，但将当前大面积空白网格改为更有编辑室节奏的三层结构：左侧项目索引、中央当前稿件/章节主工作区、右侧轻量的状态与灵感栏。增加带编号的章节卡、轻量纸张阴影、暖色强调色、非对称分栏和可折叠的“今日写作任务”区域，避免整页只有标题和空状态。

保留 Didone 大标题作为品牌识别，但降低其占屏比例；使用更清晰的正文无衬线和小号等宽标签来区分状态、字数、版本与计划。卡片不统一使用厚边框，而是混用细线、浅阴影、色块标题和悬浮反馈，形成杂志编辑台的层级。

## 不采用

不复制 Open Design 的本地桌面应用、MCP、插件安装器或其运行时配置；本次只参考公开视觉设计系统结构，并在 Novel Forge 内实现独立的 React/Tailwind 代码。
