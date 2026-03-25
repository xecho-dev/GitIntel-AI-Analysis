/**
 * GitIntel API Client
 *
 * 在本地开发时指向 localhost:8000
 * 在 Vercel 部署后通过 NEXT_PUBLIC_API_URL 环境变量指定后端地址
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * 发起仓库分析请求（支持 SSE 流式响应）
 * @param repoUrl  仓库地址
 * @param branch   分支名（可选）
 * @param onEvent  每个 SSE 事件的回调
 */
export async function analyzeRepo(
  repoUrl: string,
  branch?: string,
  onEvent?: (data: unknown) => void
) {
  const params = new URLSearchParams({ repoUrl });
  if (branch) params.set("branch", branch);

  const res = await fetch(`${API_BASE}/analyze?${params}`, {
    headers: { Accept: "text/event-stream" },
  });

  if (!res.ok) {
    throw new Error(`API 请求失败: ${res.status} ${res.statusText}`);
  }

  if (!res.body) throw new Error("响应体为空");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  // SSE 解析：data: {...}\n\n
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent?.(data);
        } catch {
          // ignore parse error
        }
      }
    }
  }
}

export { API_BASE };
