/**
 * Copyright 2025 LY Corporation
 *
 * LINE Corporation licenses this file to you under the Apache License,
 * version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as line from "@line/bot-sdk";
import { z } from "zod";
import pkg from "../package.json" with { type: "json" };

const server = new McpServer({
  name: "line-bot",
  version: pkg.version,
});

const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || "";
const destinationId = process.env.DESTINATION_USER_ID || "";

// Define group mappings directly
const groupMappings = {
  大同訂貨測試: "C8454521a69a83333ae76724a91adb48a",
  // Add more groups here if needed
};

const messagingApiClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: channelAccessToken,
  defaultHeaders: {
    "User-Agent": `${pkg.name}/${pkg.version}`,
  },
});

server.tool(
  "push_text_message",
  "Push a simple text message to user via LINE. Use this for sending plain text messages without formatting.",
  {
    userId: z
      .string()
      .optional()
      .describe(
        "The user ID to receive a message. Defaults to DESTINATION_USER_ID.",
      ),
    groupName: z
      .string()
      .optional()
      .describe(
        "The group name from mapping table. Will override userId if provided.",
      ),
    message: z.object({
      type: z.literal("text").default("text"),
      text: z
        .string()
        .max(5000)
        .describe("The plain text content to send to the user."),
    }),
  },
  async ({ userId, groupName, message }) => {
    let targetId = userId ?? destinationId;

    // 如果提供了群組名稱，則嘗試從映射表中查找對應ID
    if (groupName && groupMappings[groupName]) {
      targetId = groupMappings[groupName];
      // 不使用console.log紀錄中文訊息，避免JSON解析問題
    } else if (groupName) {
      // 不使用console.log紀錄中文訊息，避免JSON解析問題
      console.error(`Group name not found in mappings: ${groupName}`);
    }

    try {
      const response = await messagingApiClient.pushMessage({
        to: targetId,
        messages: [message as unknown as line.messagingApi.FlexMessage],
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              result: "Message sent successfully",
              sentMessages: response.sentMessages,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to send message",
              details: error.message,
            }),
          },
        ],
      };
    }
  },
);

server.tool(
  "push_flex_message",
  "Push a highly customizable flex message to user via LINE. Supports both bubble (single container) and carousel " +
    "(multiple swipeable bubbles) layouts.",
  {
    userId: z
      .string()
      .optional()
      .describe(
        "The user ID to receive a message. Defaults to DESTINATION_USER_ID.",
      ),
    groupName: z
      .string()
      .optional()
      .describe(
        "The group name from mapping table. Will override userId if provided.",
      ),
    message: z.object({
      type: z.literal("flex").default("flex"),
      altText: z
        .string()
        .describe(
          "Alternative text shown when flex message cannot be displayed.",
        ),
      contents: z
        .object({
          type: z
            .enum(["bubble", "carousel"])
            .describe(
              "Type of the container. 'bubble' for single container, 'carousel' for multiple swipeable bubbles.",
            ),
        })
        .passthrough()
        .describe(
          "Flexible container structure following LINE Flex Message format. For 'bubble' type, can include header, " +
            "hero, body, footer, and styles sections. For 'carousel' type, includes an array of bubble containers in " +
            "the 'contents' property.",
        ),
    }),
  },
  async ({ userId, groupName, message }) => {
    let targetId = userId ?? destinationId;

    // 如果提供了群組名稱，則嘗試從映射表中查找對應ID
    if (groupName && groupMappings[groupName]) {
      targetId = groupMappings[groupName];
      // 不使用console.log紀錄中文訊息，避免JSON解析問題
    } else if (groupName) {
      // 不使用console.log紀錄中文訊息，避免JSON解析問題
      console.error(`Group name not found in mappings: ${groupName}`);
    }

    try {
      const response = await messagingApiClient.pushMessage({
        to: targetId,
        messages: [message as unknown as line.messagingApi.FlexMessage],
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              result: "Message sent successfully",
              sentMessages: response.sentMessages,
            }),
          },
        ],
      };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to send message",
              details: error.message,
            }),
          },
        ],
      };
    }
  },
);

server.tool(
  "get_profile",
  "Get detailed profile information of a LINE user including display name, profile picture URL, status message and language.",
  {
    userId: z
      .string()
      .optional()
      .describe(
        "The ID of the user whose profile you want to retrieve. Defaults to DESTINATION_USER_ID.",
      ),
  },
  async ({ userId }) => {
    try {
      const response = await messagingApiClient.getProfile(
        userId ?? destinationId,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting profile:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to get profile",
              details: error.message,
            }),
          },
        ],
      };
    }
  },
);

// Tool: List all available group names
server.tool(
  "list_groups",
  "List all available group names from the mapping table.",
  {},
  async () => {
    const groups = Object.keys(groupMappings);

    const groupsText =
      groups.length > 0
        ? `Available groups:\n${groups.map(name => `- ${name} (ID: ${groupMappings[name]})`).join("\n")}`
        : "No available groups in mapping table";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            groups: groupMappings,
            message: groupsText,
          }),
        },
      ],
    };
  },
);

async function main() {
  if (!process.env.CHANNEL_ACCESS_TOKEN) {
    console.error("Please set CHANNEL_ACCESS_TOKEN");
    process.exit(1);
  }

  if (!process.env.DESTINATION_USER_ID) {
    console.error("Please set DESTINATION_USER_ID");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
