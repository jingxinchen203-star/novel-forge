export function normalizeStoryDirection(value: string) {
  return value.trim();
}

export function canGenerateOutline(value: string) {
  return normalizeStoryDirection(value).length > 0;
}
