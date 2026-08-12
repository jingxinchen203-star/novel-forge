import React from "react";
import { GENRE_OPTION_GROUPS, GENRE_OPTIONS, GENRE_SOURCE_NOTE } from "@shared/genreOptions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeGenreInput } from "@shared/projectValidation";

const GENRE_DATALIST_ID = "novel-forge-genre-options";

export function GenrePicker({ value, onChange, required = true }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={GENRE_DATALIST_ID} className="text-xs uppercase tracking-[.16em] text-muted-foreground">题材{required ? " *" : ""}</Label><Input id={GENRE_DATALIST_ID} list={GENRE_DATALIST_ID} required={required} className="rounded-none" value={value} onChange={event => onChange(normalizeGenreInput(event.target.value))} placeholder="搜索或输入题材，例如：都市高武" /><datalist id={GENRE_DATALIST_ID}>{GENRE_OPTION_GROUPS.map(group => <React.Fragment key={group.label}>{group.options.map(option => <option key={option} value={option} label={group.label} />)}</React.Fragment>)}</datalist>{!GENRE_OPTIONS.includes(value) && value && <p className="text-[11px] text-accent">自定义题材：{value}</p>}{!value && <p className="text-[11px] leading-5 text-muted-foreground">{GENRE_SOURCE_NOTE}</p>}</div>;
}
