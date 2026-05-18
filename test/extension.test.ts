import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { describe, expect, it } from "vitest";

import bashTimeoutExtension from "../src/index.js";

type BashInput = { command: string; timeout?: number };
type ToolCallEvent = { toolName: string; input: BashInput };
type BeforeAgentStartEvent = { systemPrompt: string };
type BeforeAgentStartResult = { systemPrompt: string };
type ToolCallHandler = (event: ToolCallEvent) => Promise<void> | void;
type BeforeAgentStartHandler = (
	event: BeforeAgentStartEvent,
) => Promise<BeforeAgentStartResult> | BeforeAgentStartResult;

interface CapturedHandlers {
	toolCall?: ToolCallHandler;
	beforeAgentStart?: BeforeAgentStartHandler;
}

function createFakePi(captured: CapturedHandlers): ExtensionAPI {
	return {
		on(eventName: "tool_call" | "before_agent_start", handler: ToolCallHandler | BeforeAgentStartHandler): void {
			if (eventName === "tool_call") {
				captured.toolCall = handler as ToolCallHandler;
				return;
			}
			captured.beforeAgentStart = handler as BeforeAgentStartHandler;
		},
	} as ExtensionAPI;
}

function withEnv<TValue>(env: Record<string, string | undefined>, run: () => TValue): TValue {
	const previousDefault = process.env["PI_BASH_DEFAULT_TIMEOUT_SECONDS"];
	const previousMax = process.env["PI_BASH_MAX_TIMEOUT_SECONDS"];
	setEnv("PI_BASH_DEFAULT_TIMEOUT_SECONDS", env["PI_BASH_DEFAULT_TIMEOUT_SECONDS"]);
	setEnv("PI_BASH_MAX_TIMEOUT_SECONDS", env["PI_BASH_MAX_TIMEOUT_SECONDS"]);
	try {
		return run();
	} finally {
		setEnv("PI_BASH_DEFAULT_TIMEOUT_SECONDS", previousDefault);
		setEnv("PI_BASH_MAX_TIMEOUT_SECONDS", previousMax);
	}
}

function setEnv(
	name: "PI_BASH_DEFAULT_TIMEOUT_SECONDS" | "PI_BASH_MAX_TIMEOUT_SECONDS",
	value: string | undefined,
): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}
	process.env[name] = value;
}

describe("bashTimeoutExtension", () => {
	it("#given extension factory #when registering #then captures tool_call and before_agent_start handlers", () => {
		// given
		const captured: CapturedHandlers = {};

		// when
		bashTimeoutExtension(createFakePi(captured));

		// then
		expect(captured.toolCall).toBeTypeOf("function");
		expect(captured.beforeAgentStart).toBeTypeOf("function");
	});

	it("#given bash tool call without timeout #when handler runs #then mutates timeout to default", async () => {
		// given
		const captured: CapturedHandlers = {};
		bashTimeoutExtension(createFakePi(captured));
		if (!captured.toolCall) throw new Error("tool_call handler was not registered");
		const event: ToolCallEvent = { toolName: "bash", input: { command: "echo hi" } };

		// when
		await captured.toolCall(event);

		// then
		expect(event.input).toEqual({ command: "echo hi", timeout: 120 });
	});

	it("#given non-bash tool call #when handler runs #then leaves input untouched", async () => {
		// given
		const captured: CapturedHandlers = {};
		bashTimeoutExtension(createFakePi(captured));
		if (!captured.toolCall) throw new Error("tool_call handler was not registered");
		const event: ToolCallEvent = { toolName: "read", input: { command: "unused" } };

		// when
		await captured.toolCall(event);

		// then
		expect(event.input).toEqual({ command: "unused" });
	});

	it("#given bash tool call with explicit timeout above max #when handler runs #then preserves explicit timeout", async () => {
		// given
		const captured: CapturedHandlers = {};
		bashTimeoutExtension(createFakePi(captured));
		if (!captured.toolCall) throw new Error("tool_call handler was not registered");
		const event: ToolCallEvent = { toolName: "bash", input: { command: "sleep 9999", timeout: 9999 } };

		// when
		await captured.toolCall(event);

		// then: explicit timeout values are preserved because different hosts use different timeout units
		expect(event.input).toEqual({ command: "sleep 9999", timeout: 9999 });
	});

	it("#given env overrides #when factory registers handler #then uses env default", async () => {
		await withEnv({ PI_BASH_DEFAULT_TIMEOUT_SECONDS: "45", PI_BASH_MAX_TIMEOUT_SECONDS: undefined }, async () => {
			// given
			const captured: CapturedHandlers = {};
			bashTimeoutExtension(createFakePi(captured));
			if (!captured.toolCall) throw new Error("tool_call handler was not registered");
			const event: ToolCallEvent = { toolName: "bash", input: { command: "echo hi" } };

			// when
			await captured.toolCall(event);

			// then
			expect(event.input.timeout).toBe(45);
		});
	});

	it("#given before_agent_start event #when handler runs #then appends timeout prompt", async () => {
		// given
		const captured: CapturedHandlers = {};
		bashTimeoutExtension(createFakePi(captured));
		if (!captured.beforeAgentStart) throw new Error("before_agent_start handler was not registered");

		// when
		const result = await captured.beforeAgentStart({ systemPrompt: "base prompt" });

		// then
		expect(result.systemPrompt).toContain("base prompt");
		expect(result.systemPrompt).toContain("Bash Tool Timeout Policy");
		expect(result.systemPrompt).toContain("Default timeout: 120s (2 min)");
	});
});
