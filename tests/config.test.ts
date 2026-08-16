import { describe, expect, it } from "vitest";
import { manifestIsConfigured, manifestSchema, requireCapability } from "../src/config";
import { manifest } from "./fixtures";

describe("agent-home manifest", () => {
  it("accepts a configured deny-by-default instance", () => {
    const parsed = manifestSchema.parse(manifest());
    expect(manifestIsConfigured(parsed)).toBe(true);
    expect(parsed.autonomy.default).toBe("deny");
  });

  it("rejects template placeholders at runtime readiness", () => {
    const value = manifest();
    value.instance.github.owner = "replace-me";
    expect(manifestIsConfigured(value)).toBe(false);
  });

  it("denies omitted and denied capabilities", () => {
    expect(() => requireCapability(manifest(), "github.pull_requests.write")).toThrow("Capability denied");
    expect(() => requireCapability(manifest(), "browser.use")).toThrow("Capability denied");
  });

  it("allows an explicitly named external host capability", () => {
    const value = manifest();
    value.external_capabilities = ["linear.tasks.write"];
    expect(() => requireCapability(value, "linear.tasks.write")).not.toThrow();
  });
});
