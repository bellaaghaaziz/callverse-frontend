// Landing nav: which section link to mark as current. `top` is each
// section's distance from the top of the viewport, in page order. The last
// section whose top has passed the reading line wins; before the first one
// is reached the first stays marked, and at the end of the page the last one
// is marked even when it is too short to reach the line.
export function currentSection(
  sections: { id: string; top: number }[],
  line: number,
  atBottom: boolean,
) {
  if (sections.length === 0) return null;
  if (atBottom) return sections[sections.length - 1].id;
  const passed = sections.filter((section) => section.top <= line);
  return (passed.at(-1) ?? sections[0]).id;
}
