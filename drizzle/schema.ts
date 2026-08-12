import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const novelProjects = mysqlTable("novel_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  genre: varchar("genre", { length: 120 }).notNull(),
  synopsis: text("synopsis").notNull(),
  targetWords: int("targetWords").default(100000).notNull(),
  status: mysqlEnum("status", ["draft", "writing", "completed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("novel_projects_user_idx").on(table.userId) }));

export const trendTags = mysqlTable("trend_tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  heat: int("heat").default(50).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("trend_tags_user_idx").on(table.userId) }));

export const projectDocs = mysqlTable("project_docs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  outline: text("outline"),
  worldSetting: text("worldSetting").notNull(),
  characters: text("characters").notNull(),
  conflicts: text("conflicts").notNull(),
  styleGuide: text("styleGuide").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ projectIdx: index("project_docs_project_idx").on(table.projectId) }));

export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  chapterNumber: int("chapterNumber").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  outline: text("outline").notNull(),
  body: text("body").notNull(),
  targetWords: int("targetWords").default(3000).notNull(),
  status: mysqlEnum("status", ["planned", "draft", "revised"]).default("planned").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ projectIdx: index("chapters_project_idx").on(table.projectId), projectNumberUnique: uniqueIndex("chapters_project_number_unique").on(table.projectId, table.chapterNumber) }));

export const contentVersions = mysqlTable("content_versions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["outline", "chapter"]).notNull(),
  entityId: int("entityId").notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ entityIdx: index("content_versions_entity_idx").on(table.entityType, table.entityId) }));

export const writingSchedules = mysqlTable("writing_schedules", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  cronExpression: varchar("cronExpression", { length: 80 }).notNull(),
  timezone: varchar("timezone", { length: 80 }).default("UTC").notNull(),
  enabled: int("enabled").default(1).notNull(),
  lockAt: timestamp("lockAt"),
  lastRunAt: timestamp("lastRunAt"),
  lastError: text("lastError"),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ taskIdx: index("writing_schedules_task_idx").on(table.scheduleCronTaskUid) }));

export const generationUsage = mysqlTable("generation_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  windowStartedAt: timestamp("windowStartedAt").notNull(),
  windowCount: int("windowCount").default(0).notNull(),
  activeUntil: timestamp("activeUntil"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ ownerProjectUnique: uniqueIndex("generation_usage_owner_project_unique").on(table.userId, table.projectId) }));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("notifications_user_idx").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type NovelProject = typeof novelProjects.$inferSelect;
export type TrendTag = typeof trendTags.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
