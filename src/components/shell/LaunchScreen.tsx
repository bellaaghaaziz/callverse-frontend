// The opening screen while the session is being secured, in the manner of banking apps: the
// brand mark on the brand colour, a short reassuring line, then the space fades in.
export default function LaunchScreen({ message = "Sécurisation de votre espace…" }: { message?: string }) {
  return (
    <div className="cv-launch" role="status" aria-live="polite">
      <div className="cv-launch-mark" aria-hidden="true"><i /><i /><i /><i /></div>
      <p className="cv-launch-brand" aria-hidden="true">callverse<span>.</span></p>
      <p className="cv-launch-text">{message}</p>
      <span className="cv-launch-bar" aria-hidden="true"><span /></span>
    </div>
  );
}
