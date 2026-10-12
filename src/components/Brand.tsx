import Link from "next/link";
export default function Brand({
  dark = false,
  compact = false,
  link = true,
}: {
  dark?: boolean;
  compact?: boolean;
  // Plain wordmark where another control already leads home (the login page).
  link?: boolean;
}) {
  const className = "cv-brand " + (dark ? "cv-brand-dark" : "");
  const content = (
    <>
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
    </>
  );
  if (!link) return <span className={className}>{content}</span>;
  return (
    <Link href="/" aria-label="CallVerse — accueil" className={className}>
      {content}
    </Link>
  );
}
