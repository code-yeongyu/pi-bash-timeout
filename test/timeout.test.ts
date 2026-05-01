import { describe, expect, it } from "vitest";

import {
	applyBashTimeout,
	BASH_DEFAULT_TIMEOUT_SECONDS,
	BASH_MAX_TIMEOUT_SECONDS,
	buildBashTimeoutPrompt,
	resolveBashTimeoutDefaults,
} from "../src/timeout.js";

describe("resolveBashTimeoutDefaults", () => {
	it("#given no env overrides #when resolving defaults #then returns built-in values", () => {
		// given / when
		const result = resolveBashTimeoutDefaults({});

		// then
		expect(result.defaultSeconds).toBe(BASH_DEFAULT_TIMEOUT_SECONDS);
		expect(result.maxSeconds).toBe(BASH_MAX_TIMEOUT_SECONDS);
	});

	it("#given valid env overrides #when resolving defaults #then uses override values", () => {
		// given / when
		const result = resolveBashTimeoutDefaults({
			PI_BASH_DEFAULT_TIMEOUT_SECONDS: "30",
			PI_BASH_MAX_TIMEOUT_SECONDS: "900",
		});

		// then
		expect(result).toEqual({ defaultSeconds: 30, maxSeconds: 900 });
	});

	it("#given invalid env overrides #when resolving defaults #then ignores invalid values", () => {
		// given / when
		const garbage = resolveBashTimeoutDefaults({ PI_BASH_DEFAULT_TIMEOUT_SECONDS: "garbage" });
		const zero = resolveBashTimeoutDefaults({ PI_BASH_DEFAULT_TIMEOUT_SECONDS: "0" });
		const negative = resolveBashTimeoutDefaults({ PI_BASH_MAX_TIMEOUT_SECONDS: "-1" });

		// then
		expect(garbage.defaultSeconds).toBe(BASH_DEFAULT_TIMEOUT_SECONDS);
		expect(zero.defaultSeconds).toBe(BASH_DEFAULT_TIMEOUT_SECONDS);
		expect(negative.maxSeconds).toBe(BASH_MAX_TIMEOUT_SECONDS);
	});

	it("#given max below default #when resolving defaults #then raises max to default", () => {
		// given / when
		const result = resolveBashTimeoutDefaults({
			PI_BASH_DEFAULT_TIMEOUT_SECONDS: "500",
			PI_BASH_MAX_TIMEOUT_SECONDS: "100",
		});

		// then
		expect(result).toEqual({ defaultSeconds: 500, maxSeconds: 500 });
	});
});

describe("applyBashTimeout", () => {
	const defaults = { defaultSeconds: 120, maxSeconds: 600 };

	it("#given missing timeout #when applying policy #then injects default timeout", () => {
		// given
		const input: { command: string; timeout?: number } = { command: "echo hi" };

		// when
		const result = applyBashTimeout(input, defaults);

		// then
		expect(result).toEqual({ command: "echo hi", timeout: 120 });
	});

	it("#given in-range timeout #when applying policy #then preserves user timeout", () => {
		// given
		const input = { command: "sleep 1", timeout: 30 };

		// when
		const result = applyBashTimeout(input, defaults);

		// then
		expect(result).toBe(input);
		expect(result).toEqual({ command: "sleep 1", timeout: 30 });
	});

	it("#given timeout above max #when applying policy #then preserves user timeout", () => {
		// given
		const input = { command: "sleep 99999", timeout: 9999 };

		// when
		const result = applyBashTimeout(input, defaults);

		// then
		expect(result).toBe(input);
		expect(result).toEqual({ command: "sleep 99999", timeout: 9999 });
	});

	it("#given millisecond-style timeout #when applying policy #then preserves host units", () => {
		// given
		const input = { command: "sleep 30", timeout: 30_000 };

		// when
		const result = applyBashTimeout(input, defaults);

		// then
		expect(result).toBe(input);
		expect(result.timeout).toBe(30_000);
	});

	it("#given non-positive timeout #when applying policy #then treats it as missing", () => {
		// given / when
		const zero = applyBashTimeout({ command: "noop", timeout: 0 }, defaults);
		const negative = applyBashTimeout({ command: "noop", timeout: -5 }, defaults);

		// then
		expect(zero).toEqual({ command: "noop", timeout: 120 });
		expect(negative).toEqual({ command: "noop", timeout: 120 });
	});

	it("#given input object #when applying policy #then does not mutate the original object", () => {
		// given
		const input: { command: string; timeout?: number } = { command: "echo hi" };

		// when
		applyBashTimeout(input, defaults);

		// then
		expect(input.timeout).toBeUndefined();
	});
});

describe("buildBashTimeoutPrompt", () => {
	it("#given minute-aligned values #when building prompt #then includes seconds and minute labels", () => {
		// given / when
		const prompt = buildBashTimeoutPrompt({ defaultSeconds: 120, maxSeconds: 600 });

		// then
		expect(prompt).toContain("Default timeout: 120s (2 min)");
		expect(prompt).toContain("Recommended maximum timeout: 600s (10 min)");
	});

	it("#given non-minute-aligned values #when building prompt #then falls back to seconds labels", () => {
		// given / when
		const prompt = buildBashTimeoutPrompt({ defaultSeconds: 45, maxSeconds: 90 });

		// then
		expect(prompt).toContain("Default timeout: 45s (45s)");
		expect(prompt).toContain("Recommended maximum timeout: 90s (90s)");
	});

	it("#given prompt policy #when building prompt #then includes long-running command guidance", () => {
		// given / when
		const prompt = buildBashTimeoutPrompt({ defaultSeconds: 120, maxSeconds: 600 });

		// then
		expect(prompt).toMatch(/long-running commands/i);
		expect(prompt).toMatch(/explicit `timeout`/i);
		expect(prompt).toContain("tmux");
	});
});
