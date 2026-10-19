"use client";
import { useEffect } from "react";
import { countValue } from "@/lib/motion";

const COUNT_MS = 1400;

// The landing page's motion, in one place: sections rise into view as they are reached, figures
// count up once visible, the hero follows the pointer with a slight parallax, and the bar hardens
// once the page scrolls. Without JavaScript or under reduced motion, everything simply shows.
export default function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = (node: HTMLElement) => {
      const target = Number(node.dataset.count || 0);
      if (reduced) { node.textContent = String(target); return; }
      const start = performance.now();
      const step = (now: number) => {
        node.textContent = String(countValue(target, now - start, COUNT_MS));
        if (now - start < COUNT_MS) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target as HTMLElement;
        node.classList.add("is-visible");
        node.querySelectorAll<HTMLElement>("[data-count]").forEach(count);
        observer.unobserve(node);
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-reveal]").forEach(node => observer.observe(node));

    const hero = document.querySelector<HTMLElement>(".cv-hero");
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (!hero || reduced || event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty("--px", ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
        hero.style.setProperty("--py", ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
      });
    };
    hero?.addEventListener("pointermove", move);

    const nav = document.querySelector<HTMLElement>(".cv-landing-nav");
    const scrolled = () => nav?.classList.toggle("cv-landing-nav-scrolled", window.scrollY > 12);
    scrolled();
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      observer.disconnect();
      hero?.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scrolled);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
