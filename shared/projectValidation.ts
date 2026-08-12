export function normalizeGenreInput(value: string) {
  return value.trim();
}

export function canSaveProject(title: string, genre: string) {
  return Boolean(title.trim() && genre.trim());
}
