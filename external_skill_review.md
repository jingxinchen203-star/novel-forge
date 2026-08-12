# 外部小说 Skill 审查记录

## 用户来源
用户提供抖音短链接：https://v.douyin.com/naSUqNA6jio/
解析到的视频页面：https://www.douyin.com/video/7656495481396186410?previous_page=web_code_link
用户可见标题/话题包含“热门开源AI小说软件盘点”“AI写小说”“全自动写小说”等，但当前页面未提供可稳定读取的完整字幕或软件清单。

## 已核验候选仓库
官方仓库：https://github.com/worldwonderer/oh-story-claudecode
原始 README：https://raw.githubusercontent.com/worldwonderer/oh-story-claudecode/main/README.md
仓库描述：网文/小说写作 Skill 包，覆盖长篇与短篇网络小说的扫榜、拆文、写作、去 AI 味、封面图流程；支持 Claude Code、OpenCode、ZCode、OpenClaw、Codex CLI、Reasonix 等适配。

## 当前安全结论
1. 该仓库是公开的 Skill 文档/脚本集合，不应未经审查直接执行安装脚本或部署 hooks。
2. Novel Forge 不能直接访问用户的 MCP 工具；可将经过审查的写作方法论转化为本项目内部的提示词模板、工作流和数据结构。
3. 需要继续查看 README、具体 SKILL.md、许可证、安装脚本和依赖，重点候选为长篇写作、开书设定、扫榜/分析与去 AI 味模块。
4. 暂不把仓库整体复制进生产项目；优先做“规范提炼”，保留来源和许可证说明。

## 官方仓库进一步核验
- 许可证：MIT（要求保留版权与许可声明）。
- 包的 scripts 主要是 dashboard 测试；安装入口 README 推荐 `npx skills add worldwonderer/oh-story-claudecode -y -g`，这是面向本地 CLI/Agent 的安装方式，不适合直接在 Novel Forge 的生产容器内执行。
- Skills 目录包含 browser-cdp、story、story-setup、story-long-scan、story-long-analyze、story-long-write、story-review、story-deslop、story-import，以及短篇写作/分析/扫榜和封面模块。
- `story-long-write` 的核心方法：先明确情绪目标；从经验证的模式出发；用剧情模块组装；只加载当前章节必需状态；通过设定、大纲、正文、追踪状态分层管理长篇连续性；开书默认停在细纲，不自动写正文；批量正文应由用户明确章节范围。
- `story-long-scan` 的核心方法：跨样本识别重复模式，不根据单本排名直接断言趋势；区分番茄、起点、晋江、七猫等平台指标；采集后检查条目数量、必填字段、字段一致性、简介清洗和数据质量状态；趋势结论必须附样本依据与可行性/失败风险。
- `story-setup` 含 hooks、agents、配置合并和部署逻辑；这些内容属于本地 CLI/项目文件环境，不直接复制到 Web 应用生产端。
- 静态扫描发现仓库包含 shell/python/node 脚本、配置合并、hooks 与测试工具；本次只下载并静态审查，未执行任何仓库脚本。

## 初步接入策略
优先把 `story-long-write` 与 `story-long-scan` 的方法论提炼为 Novel Forge 内置的“写作协议/提示词模板/趋势分析规则”，保留 MIT 来源声明；不接入 browser-cdp、CLI hooks、custom agents 或自动安装脚本。
