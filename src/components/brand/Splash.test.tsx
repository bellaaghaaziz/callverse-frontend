import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Splash from "@/components/brand/Splash";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { mockReducedMotion } from "@/test/matchMedia";

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe("Splash", () => {
  it("plays on a first visit and announces loading to screen readers", async () => {
    mockReducedMotion(false);
    render(<Splash />);
    expect(await screen.findByText("Chargement de CallVerse")).toBeTruthy();
    expect(document.querySelector("[data-splash]")).not.toBeNull();
  });

  it("can be skipped with the keyboard and is then remembered", async () => {
    mockReducedMotion(false);
    render(<Splash />);
    await screen.findByText("Chargement de CallVerse");

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    await waitFor(() => expect(document.querySelector("[data-splash]")).toBeNull());
    expect(hasSeenIntro()).toBe(true);
  });

  it("does not play again in the same session", () => {
    mockReducedMotion(false);
    markIntroSeen();
    render(<Splash />);
    expect(document.querySelector("[data-splash]")).toBeNull();
  });

  it("does not play when reduced motion is requested", () => {
    mockReducedMotion(true);
    render(<Splash />);
    expect(document.querySelector("[data-splash]")).toBeNull();
  });
});
