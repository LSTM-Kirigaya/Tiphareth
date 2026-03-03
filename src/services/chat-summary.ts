/**
 * 群聊摘要服务：将原始群消息通过 LLM 总结为 summarize_chat.json 和 summarize_user.json 格式
 * 供关系图 (message-summary-og) 等使用
 */

import { z } from "zod";
import OpenAI from "openai";
import Instructor from "@instructor-ai/instructor";

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

const client = Instructor({
  client: openai,
  mode: "TOOLS",
});

/** summarize_chat.json 格式：话题 + 贡献者 */
export interface SummarizeChatMessage {
  topic: string;
  contributors: string[];
}

/** summarize_user.json 格式：用户名称与 QQ */
export interface SummarizeUserItem {
  name: string;
  qq: string;
}

/** QueryMessageDto 的简化类型（来自 lagrange.onebot） */
interface RawMessage {
  sender: string;
  time: string;
  content: string;
}

interface RawUserInfo {
  name: string;
  qq: number;
  messageCount?: number;
  wordCount?: number;
}

interface RawQueryMessageDto {
  messages: RawMessage[];
  users?: Record<string, RawUserInfo>;
}

const ChatSummarySchema = z.object({
  messages: z
    .array(
      z.object({
        topic: z.string().describe("讨论话题/主题的简短名称"),
        contributors: z
          .array(z.string())
          .describe("参与该话题讨论的成员名称列表，使用 sender 中的名称"),
      })
    )
    .describe("从群聊中归纳出的主要话题及每个话题的参与成员"),
});

/**
 * 使用 LLM 将原始群消息总结为话题 + 贡献者格式
 */
export async function summarizeChatToTopics(
  rawJson: RawQueryMessageDto
): Promise<SummarizeChatMessage[]> {
  const textContent = JSON.stringify(
    {
      messages: rawJson.messages.map((m) => ({
        sender: m.sender,
        time: m.time,
        content: m.content,
      })),
    },
    null,
    2
  );

  try {
    const result = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `你是一个群聊分析助手。请根据用户提供的群聊消息记录，归纳出主要讨论的话题（3-10个），并为每个话题列出参与讨论的成员名称。
规则：
1. topic 使用简短的中文主题名（如「AI开发」「前端技术」）
2. contributors 必须使用消息中的 sender 名称，与原始数据保持一致
3. 合并相似话题，避免过于细碎`,
        },
        {
          role: "user",
          content: `请分析以下群聊消息，归纳话题与贡献者：\n\n${textContent}`,
        },
      ],
      response_model: { schema: ChatSummarySchema, name: "ChatSummary" },
      max_retries: 2,
    });
    return result.messages;
  } catch (error) {
    console.error("[CHAT-SUMMARY] LLM 摘要失败:", error);
    throw error;
  }
}

/**
 * 从 QueryMessageDto.users 生成 summarize_user.json 格式（无需 LLM）
 */
export function summarizeUsersFromRaw(rawJson: RawQueryMessageDto): SummarizeUserItem[] {
  const users = rawJson.users;
  if (!users) return [];

  const titles: SummarizeUserItem[] = [];
  for (const [key, u] of Object.entries(users)) {
    const info = u as RawUserInfo;
    if (info?.name) {
      titles.push({
        name: info.name,
        qq: String(info.qq ?? key),
      });
    }
  }
  return titles;
}
