import Link from "next/link";
export default function Brand({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="CallVerse — accueil"
      className={"cv-brand " + (dark ? "cv-brand-dark" : "")}
    >
      <span className="cv-brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          callverse<span className="cv-brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
