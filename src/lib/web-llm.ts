/**
 * WebLLM 聊天引擎 —— 在浏览器内运行 Qwen 2.5 1.5B 模型
 * 需要 WebGPU 支持（Chrome 113+, Edge 113+）
 */
import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";

// 量化版 Qwen 2.5 1.5B，约 1GB 下载量，适合浏览器运行
const MODEL_ID = "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let loadPromise: Promise<MLCEngine> | null = null;

export interface LoadProgress {
  text: string;
  progress: number; // 0-1
}

export type ProgressCallback = (p: LoadProgress) => void;

/** 检查浏览器是否支持 WebLLM */
export function isWebGPUSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

/** 加载模型（单例，只加载一次） */
export async function loadModel(onProgress?: ProgressCallback): Promise<MLCEngine> {
  if (engine) return engine;
  if (loadPromise) return loadPromise;

  loadPromise = CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report) => {
      onProgress?.({ text: report.text, progress: report.progress });
    },
  });

  engine = await loadPromise;
  return engine;
}

/** 检查引擎是否已加载 */
export function isEngineReady(): boolean {
  return engine !== null;
}

/** 用本地模型生成回复 */
export async function chatWithWebLLM(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const eng = engine || (await loadModel());

  const reply = await eng.chat.completions.create({
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    max_tokens: options?.maxTokens ?? 200,
    temperature: options?.temperature ?? 0.7,
  });

  return reply.choices[0]?.message?.content || "";
}
