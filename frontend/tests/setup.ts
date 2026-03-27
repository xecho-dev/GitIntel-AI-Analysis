import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test to prevent state leakage between tests
afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth session
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { id: "test-user-123", name: "Test User", email: "test@example.com" },
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock lucide-react icons to avoid render errors
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    // Fallback icons that render as simple spans
    BarChart3: () => null,
    Code2: () => null,
    // Add more as needed by components
  };
});

// Suppress console.error for expected React warnings during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out known harmless React 18 warnings
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: An update to") ||
        args[0].includes("act(...)"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
