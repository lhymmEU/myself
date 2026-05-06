import { Button } from "@/components/ui/button";

interface Props {
  prompts: string[];
  onSelect?: (prompt: string) => void;
}

export function SuggestionsCard({ prompts, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="h-auto whitespace-normal text-left"
          onClick={() => onSelect?.(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
