import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QualityAgentCard } from "@/components/agents/QualityAgentCard";
import { useAppStore } from "@/store/useAppStore";

// Mock the store
vi.mock("@/store/useAppStore", () => ({
  useAppStore: vi.fn(),
}));

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-len={data.length}>{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => <div data-testid="bar">{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// Mock lucide-react
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return { ...actual, BarChart3: () => <div data-testid="bar-chart-3-icon" /> };
});

// Mock GlassCard
vi.mock("@/components/ui/GlassCard", () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
}));

const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>;

describe("QualityAgentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {},
        isAnalyzing: false,
        finishedAgents: [],
      };
      return selector(state);
    });
  });

  it("renders glass card", () => {
    render(<QualityAgentCard />);
    expect(screen.getByTestId("glass-card")).toBeInTheDocument();
  });

  it("renders with zero health score when no event", () => {
    render(<QualityAgentCard />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders health score from agent event", () => {
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {
          quality: {
            type: "result",
            agent: "quality",
            data: {
              health_score: 85,
              test_coverage: 60,
              complexity: "Low",
              python_metrics: { avg_cyclomatic: 1.2, avg_length: 30, doc_ratio: 0.3 },
              typescript_metrics: {},
            },
          },
        },
        isAnalyzing: false,
        finishedAgents: ["quality"],
      };
      return selector(state);
    });

    render(<QualityAgentCard />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders test coverage percentage", () => {
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {
          quality: {
            type: "result",
            agent: "quality",
            data: {
              health_score: 85,
              test_coverage: 75,
              complexity: "Low",
              python_metrics: { avg_cyclomatic: 1.2, avg_length: 30, doc_ratio: 0.3 },
              typescript_metrics: {},
            },
          },
        },
        isAnalyzing: false,
        finishedAgents: [],
      };
      return selector(state);
    });

    render(<QualityAgentCard />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders complexity label in green for Low", () => {
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {
          quality: {
            type: "result",
            agent: "quality",
            data: {
              health_score: 85,
              test_coverage: 0,
              complexity: "Low",
              python_metrics: { avg_cyclomatic: 1.2, avg_length: 30, doc_ratio: 0.3 },
              typescript_metrics: {},
            },
          },
        },
        isAnalyzing: false,
        finishedAgents: [],
      };
      return selector(state);
    });

    render(<QualityAgentCard />);
    const complexitySpan = screen.getByText("Low");
    expect(complexitySpan).toBeInTheDocument();
    expect(complexitySpan.className).toContain("text-emerald-400");
  });

  it("renders complexity label in red for High", () => {
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {
          quality: {
            type: "result",
            agent: "quality",
            data: {
              health_score: 30,
              test_coverage: 0,
              complexity: "High",
              python_metrics: { avg_cyclomatic: 15, avg_length: 30, doc_ratio: 0.1 },
              typescript_metrics: {},
            },
          },
        },
        isAnalyzing: false,
        finishedAgents: [],
      };
      return selector(state);
    });

    render(<QualityAgentCard />);
    const complexitySpan = screen.getByText("High");
    expect(complexitySpan).toBeInTheDocument();
    expect(complexitySpan.className).toContain("text-rose-400");
  });

  it("shows dash for missing test coverage", () => {
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        agentEvents: {},
        isAnalyzing: false,
        finishedAgents: [],
      };
      return selector(state);
    });

    render(<QualityAgentCard />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
