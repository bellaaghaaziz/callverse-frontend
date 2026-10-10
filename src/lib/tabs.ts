// Keyboard model of the WAI-ARIA tabs pattern: the arrow keys move to the
// next or previous tab and wrap around; Home and End jump to the ends.
// Returns the index of the tab to select, or null when the key is not handled.
export function tabKeyTarget(key: string, index: number, count: number) {
  switch (key) {
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
