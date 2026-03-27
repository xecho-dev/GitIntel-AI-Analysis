import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserId } from "@/lib/api";

// We test the sync functions and mock the fetch-based functions
describe("getUserId", () => {
  it("extracts user id from session object", () => {
    const session = { user: { id: "user-123", name: "Test" } };
    expect(getUserId(session)).toBe("user-123");
  });

  it("falls back to sub field if id is missing", () => {
    const session = { user: { sub: "sub-456", name: "Test" } };
    expect(getUserId(session)).toBe("sub-456");
  });

  it("prefers id over sub", () => {
    const session = { user: { id: "id-789", sub: "sub-456" } };
    expect(getUserId(session)).toBe("id-789");
  });

  it("returns empty string when neither id nor sub is available", () => {
    const session = { user: { name: "Test" } };
    expect(getUserId(session)).toBe("");
  });

  it("handles missing user object", () => {
    const session = {};
    expect(getUserId(session)).toBe("");
  });
});

describe("analyzeRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    }) as unknown as typeof fetch;

    const { analyzeRepo } = await import("@/lib/api");

    await expect(
      analyzeRepo("https://github.com/test/repo", "main", "user123", () => {})
    ).rejects.toThrow("API 请求失败: 401 Unauthorized");
  });

  it("throws when response body is null", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    }) as unknown as typeof fetch;

    const { analyzeRepo } = await import("@/lib/api");

    await expect(
      analyzeRepo("https://github.com/test/repo", "main", "user123", () => {})
    ).rejects.toThrow("响应体为空");
  });

  it("calls onEvent for each parsed SSE data line", async () => {
    const onEvent = vi.fn();

    // Mock ReadableStream
    const chunks = [
      'data: {"type":"status","agent":"repo_loader","message":"starting"}\n\n',
      'data: {"type":"result","agent":"repo_loader","data":{"total_loaded":10}}\n\n',
    ];
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let index = 0;
          return {
            read: async () => {
              if (index < chunks.length) {
                const chunk = chunks[index++];
                return { done: false, value: encoder.encode(chunk) };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    }) as unknown as typeof fetch;

    const { analyzeRepo } = await import("@/lib/api");

    await analyzeRepo("https://github.com/test/repo", "main", "user123", onEvent);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith({
      type: "status",
      agent: "repo_loader",
      message: "starting",
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: "result",
      agent: "repo_loader",
      data: { total_loaded: 10 },
    });
  });

  it("sends correct headers including X-User-Id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    }) as unknown as typeof fetch;

    global.fetch = mockFetch;

    const { analyzeRepo } = await import("@/lib/api");

    await analyzeRepo("https://github.com/test/repo", undefined, "user123", () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-User-Id": "user123",
        }),
        body: JSON.stringify({ repoUrl: "https://github.com/test/repo" }),
      })
    );
  });

  it("includes branch in body when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    }) as unknown as typeof fetch;

    global.fetch = mockFetch;

    const { analyzeRepo } = await import("@/lib/api");

    await analyzeRepo("https://github.com/test/repo", "develop", "user123", () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        body: JSON.stringify({ repoUrl: "https://github.com/test/repo", branch: "develop" }),
      })
    );
  });
});
