import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "@/lib/whatsapp";

describe("buildWhatsAppLink", () => {
  it("usa solo dígitos del número y codifica el mensaje", () => {
    const url = buildWhatsAppLink("+57 300 123 4567", "Té verde & menta");
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Té verde & menta"));
    expect(url).not.toContain(" ");
  });
});