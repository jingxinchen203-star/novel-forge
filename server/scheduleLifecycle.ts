export type HeartbeatJobRef = { taskUid: string; nextExecutionAt?: string | null };

export async function createScheduleWithCleanup<T extends HeartbeatJobRef>(params: {
  sessionToken: string;
  create: () => Promise<T>;
  persist: (job: T) => Promise<void>;
  remove: (taskUid: string, sessionToken: string) => Promise<void>;
}) {
  let job: T | undefined;
  try {
    job = await params.create();
    await params.persist(job);
    return job;
  } catch {
    if (job?.taskUid) await params.remove(job.taskUid, params.sessionToken).catch(() => undefined);
    throw new Error("schedule_create_failed");
  }
}
