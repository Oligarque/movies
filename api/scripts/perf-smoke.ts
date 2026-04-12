const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";

type Metric = {
  name: string;
  samples: number[];
};

const timedRequest = async (url: string): Promise<number> => {
  const start = performance.now();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  await response.text();
  return performance.now() - start;
};

const formatMs = (value: number): string => `${value.toFixed(1)}ms`;

const summarize = (metric: Metric) => {
  const sorted = [...metric.samples].sort((a, b) => a - b);
  const avg = sorted.reduce((acc, value) => acc + value, 0) / sorted.length;
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  return {
    avg,
    p95,
    min,
    max,
  };
};

async function main() {
  const endpoints: Array<{ name: string; path: string; runs: number }> = [
    { name: "GET /api/movies", path: "/api/movies", runs: 8 },
    { name: "GET /api/tmdb/search?query=in", path: "/api/tmdb/search?query=in", runs: 5 },
  ];

  const metrics: Metric[] = [];

  for (const endpoint of endpoints) {
    const samples: number[] = [];

    for (let i = 0; i < endpoint.runs; i += 1) {
      const duration = await timedRequest(`${BASE_URL}${endpoint.path}`);
      samples.push(duration);
    }

    metrics.push({ name: endpoint.name, samples });
  }

  console.log(`Smoke perf against ${BASE_URL}`);
  for (const metric of metrics) {
    const summary = summarize(metric);
    console.log(
      `${metric.name}: avg=${formatMs(summary.avg)} p95=${formatMs(summary.p95)} min=${formatMs(summary.min)} max=${formatMs(summary.max)}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
