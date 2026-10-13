import Image from "next/image";
import { coverUrl } from "@/lib/books/open-library";

/**
 * A book cover at a 2:3 ratio, sized by its container. Open Library already serves
 * small/medium/large versions, so we load theirs directly (`unoptimized`) instead of
 * spending the host's image-resizing quota. Books with no cover get a plain
 * book-like placeholder with the title.
 */
export function Cover({ coverId, title, size = "M", className = "", priority = false }: {
  coverId: number | null;
  title: string;
  size?: "S" | "M" | "L";
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-border/50 shadow-sm ${className}`}>
      {coverId ? (
        <Image
          src={coverUrl(coverId, size)}
          alt={`Cover of ${title}`}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 640px) 33vw, 180px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center border-l-4 border-accent/60 bg-surface p-2 text-center">
          <span className="line-clamp-4 font-serif text-sm leading-snug text-muted">{title}</span>
        </div>
      )}
    </div>
  );
}
