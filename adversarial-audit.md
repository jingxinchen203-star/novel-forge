# Novel Forge 对抗性审查报告

**审查对象：** Novel Forge 小说创作工作台  
**审查视角：** 恶意登录用户、跨站攻击者、重复任务触发者、异常模型响应和超大输入  
**审查方式：** 服务端静态审查、数据库 schema 审查、认证链路审查、现有 Vitest 基线测试与模式扫描  
**审查日期：** 2026-08-12

> 结论先行：当前项目具备基本的登录保护和按用户 ID 的主要查询隔离，但尚不适合在未加固的情况下承载高价值长篇作品或开放给不受信任的用户。最需要优先处理的是**定时续写的并发幂等失效、项目级实体关联校验不足、状态修改接口缺少 CSRF/速率限制，以及超大/无长度上限输入导致的资源消耗风险**。

## 一、风险总览

| 编号 | 严重性 | 状态 | 风险主题 | 主要证据 |
|---|---|---|---|---|
| A-01 | 高 | 已证实 | 定时续写的 `lastRunAt` 检查与更新非原子，且章节无唯一约束，可并发生成重复章节 | `server/scheduled.ts:22-37`；`drizzle/schema.ts:50-61,74-84` |
| A-02 | 高 | 已证实 | 章节更新只按 `chapterId + userId`，未校验章节属于请求中的项目，可造成同一用户跨项目覆盖 | `server/routers.ts:96-104` |
| A-03 | 高 | 已证实/需结合部署策略 | Cookie 为 `SameSite=None`，状态修改 procedure 未见 CSRF 或 Origin 校验，可能被跨站诱导执行删除、生成和回滚 | `server/_core/cookies.ts`；`server/_core/index.ts:40-47`；`server/routers.ts:54-115` |
| A-04 | 中高 | 已证实 | 多个大文本输入没有长度上限，入口允许 50 MB JSON，能放大数据库、模型 token 和请求处理成本 | `server/_core/index.ts:35-37`；`server/routers.ts:13,85,92,96,103,107` |
| A-05 | 中高 | 已证实 | AI 生成接口无用户级速率、并发或额度限制，登录用户可以持续消耗模型资源 | `server/routers.ts:92-101`；`server/_core/llm.ts:300-420` |
| A-06 | 中 | 已证实 | `saveVersion` 未验证 entity/project/user 的真实关联，可制造伪版本；回滚只能部分防止破坏，版本数据可被污染 | `server/routers.ts:106-114`；`drizzle/schema.ts:63-72` |
| A-07 | 中 | 已证实 | 定时计划没有禁用/删除 procedure，`enabled` 字段未被回调检查；用户无法可靠撤销已创建计划 | `server/routers.ts:118-125`；`server/scheduled.ts:20-24` |
| A-08 | 中 | 已证实 | 定时回调先写 `lastRunAt` 再调用模型；模型失败会吞掉本次续写机会，且错误路径不会建立失败通知 | `server/scheduled.ts:22-23,32-42` |
| A-09 | 中 | 已证实 | 定时回调将异常 `error.message`、请求 URL 和时间戳直接返回给调用方，可能透传上游或内部错误细节 | `server/scheduled.ts:40-42`；`server/_core/llm.ts:413-417` |
| A-10 | 低中 | 已证实 | 删除项目没有级联策略，会留下章节、设定、版本、计划和通知孤儿记录；数据残留和后续任务风险未被统一处理 | `server/routers.ts:61-65`；`drizzle/schema.ts` 全部业务表 |

## 二、重点攻击路径

### 1. 并发触发定时续写，生成重复章节

攻击者或平台重试者同时向同一个 scheduled endpoint 发起两次合法 cron 请求。两个请求都可能在第 22 行读到相同的旧 `lastRunAt`，随后都在第 23 行写入新的时间。由于第 29 行的“下一章是否存在”检查与第 37 行的插入之间没有事务锁，也没有数据库唯一约束 `(projectId, chapterNumber)`，两个请求都可能通过检查并插入相同章节号。

这不是理论上的“极低概率”问题：上游模型调用会把竞态窗口从微秒级扩大到秒级。`lastRunAt` 更像一个非原子标记，而不是互斥锁。修复应采用数据库事务/条件更新抢锁，并增加唯一约束；插入冲突时必须把它当作幂等成功处理。

### 2. 同一用户跨项目覆盖章节

`generateChapter` 接受 `projectId` 和可选 `chapterId`，但第 99 行更新章节时只使用 `chapters.id` 与 `chapters.userId`，没有加入 `chapters.projectId = input.projectId`。`saveChapter` 第 104 行同样只按 `id + userId` 更新。

因此，一个用户可以把项目 B 的章节 ID 与项目 A 的 `projectId` 组合提交，最终用项目 A 的生成内容覆盖项目 B 的章节。该问题不是跨用户越权，但会破坏用户自己的作品数据，并且可以由前端状态错乱、旧页面或恶意构造请求触发。所有章节更新、版本读取和回滚都应通过“项目归属 + 用户归属 + 实体 ID”三重条件验证。

### 3. Cookie 状态修改缺少显式 CSRF 防护

会话 cookie 使用 `SameSite=None`，这是跨站上下文/iframe 兼容配置，但也意味着不能把 SameSite 当作状态修改保护。服务入口注册了公开的 scheduled 路径和 tRPC 路径，没有看到统一的 Origin/Referer 校验、CSRF token 或双提交 token 中间件。所有创建、删除、生成、回滚、标记已读和创建 schedule 的 procedure 都依赖 cookie 会话。

是否能在特定浏览器和部署代理组合下完成跨站请求，取决于 cookie、CORS 和 tRPC body 解析细节，因此这里标记为“已证实缺少防护，实际可利用性需在生产域名上验证”。修复方向是：对所有 cookie-authenticated mutation 增加 CSRF token 或严格的受信任 Origin 校验；不要只依赖 `SameSite=None` 或前端按钮隐藏。

### 4. 大文本输入放大模型和数据库资源消耗

全局 JSON 与 URL-encoded body limit 设置为 50 MB。与此同时，`projectInput`、`saveDocs`、`generateOutline`、`generateChapter`、`saveChapter`、`saveVersion` 中的大量 `z.string()` 没有 `.max(...)`。攻击者只需登录，就可以提交超大世界观、正文、版本或生成方向，导致 JSON 解析、数据库写入、模型 token 化和 Forge API 调用成本上升。

这还会放大提示词注入：用户可把伪装成“系统规则”的巨大文本嵌入世界观、人物或风格字段，当前代码直接把它们拼入 user message，没有长度、结构或内容分区策略。

### 5. AI 生成无限消耗与重试放大

大纲生成、章节生成和定时续写都直接调用 `invokeLLM`。服务端没有看到用户级速率限制、项目级并发锁、每日生成额度或单请求 token 预算。底层 LLM wrapper 对非 2xx 和网络错误进行多次指数退避重试；这对瞬态网络错误有帮助，但在上层没有预算时，也会放大单个恶意请求的资源消耗。

建议至少增加：用户/项目维度的并发锁、每分钟与每日额度、服务端硬性 max tokens、输入 token 预算、对失败重试的总时间上限，以及对模型错误的统一内部日志化处理。

## 三、其他数据完整性问题

`saveVersion` 只验证输入类型和当前用户写入 `userId`，没有在写入前确认 `entityId` 属于 `projectId`、属于当前用户，并且实体类型与目标表一致。恶意用户可以制造与真实内容无关的伪版本，污染版本列表。`rollbackVersion` 对 outline 版本只按 `projectId + userId` 更新项目文档，没有核对 `version.entityId` 是否对应该项目的文档记录。

定时计划创建接口只提供 create/list，没有 remove、disable 或 update；schema 中的 `enabled` 字段目前既没有用户操作入口，也没有在 `runScheduledContinuation` 中作为执行条件检查。项目删除只删除 `novelProjects`，没有外键级联或显式清理策略。若数据库没有级联，已删除项目的章节和定时计划仍可能存在；若定时任务继续回调，会继续尝试生成内容。

定时回调在生成前写入 `lastRunAt`，因此模型失败、数据库插入失败或进程中断都会让下一次触发在十分钟内被跳过。对于每天一次的计划，这可能表现为整天没有续写且用户没有失败通知。应拆分“抢占锁时间”和“成功完成时间”，并持久化执行状态、错误原因和重试次数。

## 四、认证与错误处理观察

认证链路使用 HS256 会话 JWT，并且会话默认有效期为一年。JWT 校验了签名、算法、过期时间和必需字段，普通资源查询也普遍按 `userId` 过滤，这是当前项目的主要正面控制。但 `protectedProcedure` 本身只检查“存在用户”，资源安全完全依赖各 procedure 自己写对 where 条件；这使实体关联遗漏非常容易成为安全回归。

`scheduled.ts` 的 500 响应直接返回 `error.message` 和 `req.originalUrl`。底层 LLM wrapper 还会把上游响应原文拼入异常。生产环境应向调用方返回固定错误码和 request ID，把完整错误写入受控服务端日志，并避免把上游原文、URL、内部路径或数据库信息发送给外部调用方。

## 五、现有测试覆盖的反证

当前测试基线为 **4 个测试文件、6 个测试全部通过**。这些测试覆盖认证退出、基础路由契约、空标题校验、OH Story system prompt 关键词和定时文本归一化，但没有覆盖以下关键对抗场景：

| 缺失测试 | 需要验证的性质 |
|---|---|
| 跨项目 chapterId | 不允许用项目 A 的输入更新项目 B 的章节 |
| 版本实体关联 | 不允许创建或回滚与项目/实体不匹配的版本 |
| schedule 并发 | 两个同时回调最多生成一个章节 |
| schedule 失败恢复 | 模型失败后计划不会永久丢失本次执行，且有失败状态/通知 |
| CSRF/Origin | 非受信任 Origin 的 mutation 被拒绝 |
| 输入上限 | 超长标题、设定、正文、风格和版本内容在进入 DB/LLM 前被拒绝 |
| rate limit | 同一用户/项目的并发生成和高频生成受到限制 |
| 删除清理 | 项目删除不会留下可执行的定时计划或孤儿作品数据 |

## 六、修复优先级

**P0：** 为章节和版本实体建立统一的归属验证函数；为章节增加 `(projectId, chapterNumber)` 唯一约束；用事务/条件更新实现 schedule 抢锁；增加 schedule disable/remove 与删除项目清理；对 cookie mutation 增加 CSRF 或 Origin 防护。

**P1：** 为所有文本字段设置按用途划分的长度上限；加入用户/项目级生成速率和并发限制；为 LLM 输入和输出设置硬 token 预算；将模型和 cron 错误改为固定错误码 + request ID，不透传原始错误。

**P2：** 增加版本快照哈希、乐观锁/updatedAt 检查、schedule execution 表、失败通知和管理员审计日志；补齐对抗性 Vitest 与并发集成测试。

## 七、审查边界

本次审查没有尝试绕过真实登录、攻击外部 OAuth 服务、执行破坏性数据库操作或调用真实模型制造消耗。由于此前用户选择跳过人机验证，生产登录态下的浏览器行为、真实 cookie 跨站可利用性和真实 cron 平台重试仍需在受控测试环境中验证。

## 参考代码位置

1. [server/routers.ts](server/routers.ts)  
2. [server/scheduled.ts](server/scheduled.ts)  
3. [server/_core/sdk.ts](server/_core/sdk.ts)  
4. [server/_core/llm.ts](server/_core/llm.ts)  
5. [server/_core/index.ts](server/_core/index.ts)  
6. [server/_core/trpc.ts](server/_core/trpc.ts)  
7. [drizzle/schema.ts](drizzle/schema.ts)  
8. [server/novel-forge.core.test.ts](server/novel-forge.core.test.ts)
