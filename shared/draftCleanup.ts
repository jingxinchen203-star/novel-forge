export type DraftBackupRecord = {
  id: number;
  createdAt: Date;
};

export type DraftCleanupOptions = {
  retentionDays?: number;
  keepLatest?: number;
};

export function getDraftBackupIdsToDelete(
  backups: DraftBackupRecord[],
  now = new Date(),
  options: DraftCleanupOptions = {}
) {
  const retentionDays = Math.max(1, Math.min(3650, options.retentionDays ?? 30));
  const keepLatest = Math.max(1, Math.min(100, options.keepLatest ?? 10));
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return backups
    .filter((backup, index) => index >= keepLatest || backup.createdAt < cutoff)
    .map(backup => backup.id);
}
