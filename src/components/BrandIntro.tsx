// The opening of the site, in the manner of a banking app: the mark rises bar by bar, the name
// writes itself, then the screen opens onto the page. Pure CSS in the server HTML, so it plays
// before React loads; the inline script in the layout skips it after the first page of a visit
// and under reduced motion. Decorative only.
const WORD = "callverse";

export default function BrandIntro() {
  return (
    <div className="cv-intro" aria-hidden="true">
      <div className="cv-intro-core">
        <span className="cv-intro-halo" />
        <span className="cv-intro-mark"><i /><i /><i /><i /></span>
        <span className="cv-intro-word">
          {WORD.split("").map((letter, index) => (
            <span key={index} style={{ animationDelay: `${560 + index * 45}ms` }}>{letter}</span>
          ))}
          <span className="cv-intro-dot">.</span>
        </span>
        <span className="cv-intro-tagline">La relation client, avec plus de clarté.</span>
      </div>
    </div>
  );
}
