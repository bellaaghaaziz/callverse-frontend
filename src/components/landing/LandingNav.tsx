"use client";

import { useEffect, useState } from "react";
import { currentSection } from "@/lib/landing";

const links = [
  { id: "experience", label: "L’expérience" },
  { id: "roles", label: "Vos espaces" },
  { id: "architecture", label: "Architecture" },
];

// Marks the link of the section being read: the last one whose top has
// passed 40% of the screen, or the last section at the end of the page.
export default function LandingNav() {
  const [current, setCurrent] = useState(links[0].id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = links.flatMap(({ id }) => {
        const section = document.getElementById(id);
        return section
          ? [{ id, top: section.getBoundingClientRect().top }]
          : [];
      });
      const page = document.documentElement;
      const atBottom =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= page.scrollHeight - 2;
      const id = currentSection(sections, window.innerHeight * 0.4, atBottom);
      if (id) setCurrent(id);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Also runs once on observe, and again when the layout changes size.
    const layout = new ResizeObserver(schedule);
    layout.observe(document.documentElement);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      layout.disconnect();
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <nav aria-label="Navigation du site">
      {links.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={id === current ? "cv-landing-nav-current" : undefined}
          aria-current={id === current ? "location" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
