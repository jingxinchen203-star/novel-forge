# Novel Forge 数据完整性决策记录

## 当前决策

本轮暂不为 `project_docs`、`chapters`、`content_versions`、`writing_schedules`、`notifications` 和 `generation_usage` 增加数据库外键或级联删除。当前项目已通过服务端的 userId/projectId 组合校验、项目删除事务、章节号唯一约束、策划文档唯一约束、续写计划唯一约束和 generation_usage 清理实现主要一致性保护。

## 暂不迁移的原因

现有表是在项目运行中逐步建立的，历史迁移没有外键；直接追加外键需要先确认所有既有行都能映射到 users 和 novel_projects，并评估删除项目时的远程 Heartbeat 删除顺序。由于自动续写还涉及外部 cron 删除，数据库级级联无法覆盖远程任务清理，贸然启用级联可能造成“数据库已删、远程任务仍在运行”的状态。因此本轮选择低风险的应用层事务清理和唯一约束，避免破坏既有数据。

## 风险接受范围

应用层清理必须继续保持所有写入口的 userId/projectId 校验；项目删除必须先处理远程 cron，再在事务中清理本地子表。该方案仍可能受到直接数据库写入、未来遗漏新写入口或部分失败的影响，因此不等同于外键保护。生产环境需要定期运行孤儿数据检测查询，并在未来数据治理窗口完成历史数据核验后再评估外键迁移。

## 后续迁移条件

只有在完成全量孤儿检测、为外部 cron 建立可重试的补偿记录、验证删除事务和备份恢复流程后，才考虑对本地实体增加 `FOREIGN KEY`；不应把远程 cron 清理交给数据库级联。迁移前需在 staging 执行删除、回滚和并发写入验证。

## 已执行的孤儿检测

已在当前数据库执行只读检测：将 `project_docs`、`chapters`、`content_versions`、`writing_schedules`、`generation_usage` 与 `notifications.projectId` 分别左连接 `novel_projects.id`，统计项目引用不存在的行。当前六类结果均为 **0**。该查询应在外键迁移前、重大删除逻辑变更后及定期运维中复用；若任一 `orphan_count` 大于 0，应暂停外键迁移并先通过受审计的数据修复流程处理。
