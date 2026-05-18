import { describe, expect, it } from "vitest";

import bashTimeoutExtension, { type BashToolInputLike } from "../src/index.js";

type Handler = (event: unknown) => Promise<unknown> | unknown;

type ApiMock = {
	on(event: string, handler: Handler): void;
};

function createApiMock(): { api: ApiMock; handlers: Record<string, Handler[]> } {
	const handlers: Record<string, Handler[]> = {};
	return {
		api: {
			on(event: string, handler: Handler): void {
				const list = handlers[event] ?? [];
				list.push(handler);
				handlers[event] = list;
			},
		},
		handlers,
	};
}

describe("bashTimeoutExtension", () => {
	it("injects a default timeout for bash tool calls", async () => {
		// given
		const { api, handlers } = createApiMock();
		bashTimeoutExtension(api as never);
		const input: BashToolInputLike = { command: "echo hi" };

		// when
		await handlers["tool_call"]?.[0]?.({ toolName: "bash", input });

		// then
		expect(input.timeout).toBe(120);
	});

	it("preserves explicit host timeout values", async () => {
		// given
		const { api, handlers } = createApiMock();
		bashTimeoutExtension(api as never);
		const input: BashToolInputLike = { command: "sleep 30", timeout: 30_000 };

		// when
		await handlers["tool_call"]?.[0]?.({ toolName: "bash", input });

		// then
		expect(input.timeout).toBe(30_000);
	});

	it("appends timeout guidance to the system prompt", async () => {
		// given
		const { api, handlers } = createApiMock();
		bashTimeoutExtension(api as never);

		// when
		const result = await handlers["before_agent_start"]?.[0]?.({ systemPrompt: "Base" });

		// then
		expect(result).toEqual({
			systemPrompt: expect.stringContaining("Recommended maximum timeout"),
		});
	});
});
