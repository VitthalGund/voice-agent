import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { kycTool, agriStackTool, scoringTool, underwritingTool } from './tools';
import { renderTextDescription } from 'langchain/tools/render';
import { Actor, AgentStep } from 'langchain/schema';
import { formatLogToString } from 'langchain/agents/format_scratchpad/log';
import { ReActSingleInputOutputParser } from 'langchain/agents/react/output_parser';
import { AgentExecutor } from 'langchain/agents';

// Construct the Master Agent
// We will use a standard ReAct agent for simplicity and robustness in this MVP.
// It will have access to all worker tools.

const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview', // Speed and intelligence
  temperature: 0,
});

const tools = [kycTool, agriStackTool, scoringTool, underwritingTool];

const toolNames = tools.map((tool) => tool.name);

const prompt = PromptTemplate.fromTemplate(`
You are Krishi-Mitra, an intelligent agricultural finance assistant for Indian farmers.
You speak in a simple, direct, and encouraging manner.
Your goal is to help a farmer apply for a loan.

You have access to the following tools:
{tools}

To use a tool, please use the following format:
\`\`\`
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
\`\`\`

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:
\`\`\`
Thought: Do I need to use a tool? No
Final Answer: [your response here]
\`\`\`

Begin!

Conversation History:
{chat_history}

User Input: {input}
Agent Scratchpad:
{agent_scratchpad}
`);

const responsePrompt = PromptTemplate.fromTemplate(`
You are Krishi-Mitra. Convert the technical response below into a warm, natural spoken response for an Indian farmer (in English/Hinglish).
Keep it short (under 2 sentences) to reduce TTS latency.
Technical Response: {text}
`);

export const runAgent = async (input: string, chatHistory: string) => {
  // 1. Create the ReAct Agent logic
  const llmWithStop = model.bind({
    stop: ['\nObservation'],
  });

  const agent = RunnableSequence.from([
    {
      input: (i: { input: string; chat_history: string }) => i.input,
      chat_history: (i: { input: string; chat_history: string }) => i.chat_history,
      tools: () => renderTextDescription(tools),
      tool_names: () => toolNames.join(', '),
      agent_scratchpad: (i: { steps: AgentStep[] }) => formatLogToString(i.steps),
    },
    prompt,
    llmWithStop,
    new ReActSingleInputOutputParser({ toolNames }),
  ]);

  const executor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: true,
    returnIntermediateSteps: true,
  });

  const result = await executor.invoke({ input, chat_history: chatHistory });
  
  // 2. Humanize the output for Voice
  const humanizerChain = RunnableSequence.from([
      responsePrompt,
      model,
      new StringOutputParser()
  ]);

  const finalSpeech = await humanizerChain.invoke({ text: result.output });

  return {
    rawResult: result,
    finalSpeech
  };
};

// Helper for intent classification (simple version)
export const classifyIntent = async (text: string) => {
    const classificationPrompt = PromptTemplate.fromTemplate(`
    Classify the following text into one of: LOAN_REQUEST, KYC_PROVIDE, AGRI_DETAILS, STATUS_CHECK, GENERAL.
    Text: {text}
    Classification:
    `);
    const chain = classificationPrompt.pipe(model).pipe(new StringOutputParser());
    return await chain.invoke({ text });
}
