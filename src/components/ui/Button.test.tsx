import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

afterEach(cleanup);

describe("Button", () => {
  it("announces a pending action and blocks further clicks", () => {
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Envoyer
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Envoyer/ });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("works normally when not pending", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Envoyer</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
