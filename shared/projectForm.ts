export type ProjectFormValue = {
  title: string;
  genre: string;
  synopsis: string;
  targetWords: number;
};

export function buildProjectCreateInput(form: ProjectFormValue): ProjectFormValue {
  return { title: form.title.trim(), genre: form.genre.trim(), synopsis: form.synopsis.trim(), targetWords: form.targetWords };
}
