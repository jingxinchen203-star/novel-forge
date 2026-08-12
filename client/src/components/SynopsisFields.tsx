import React from "react";
import { Textarea } from "@/components/ui/textarea";

export function SynopsisFields({ idea, synopsis, onIdeaChange, onSynopsisChange }: { idea: string; synopsis: string; onIdeaChange: (value: string) => void; onSynopsisChange: (value: string) => void }) {
  return <><Textarea aria-label="粗略想法" className="md:col-span-2 min-h-[150px]" placeholder="先写你的简单想法，例如：一个失业厨师意外继承了能听见食材心声的菜市场。" value={idea} onChange={event => onIdeaChange(event.target.value)} /><Textarea aria-label="最终简介" className="md:col-span-2 min-h-[150px]" placeholder="最终简介（可由 AI 优化，也可以手动修改）" value={synopsis} onChange={event => onSynopsisChange(event.target.value)} /></>;
}
