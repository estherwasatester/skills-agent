import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
    AgentCard, 
    Message, 
    AGENT_CARD_PATH 
} from '@a2a-js/sdk';
import { 
    AgentExecutor, 
    RequestContext, 
    ExecutionEventBus, 
    DefaultRequestHandler, 
    InMemoryTaskStore 
} from '@a2a-js/sdk/server';
import { 
    agentCardHandler, 
    jsonRpcHandler, 
    restHandler, 
    UserBuilder 
} from '@a2a-js/sdk/server/express';
import { Runner, InMemorySessionService } from '@google/adk';
import { skillsCollatorAgent } from './agent';

const runner = new Runner({
    appName: 'skills-agent',
    agent: skillsCollatorAgent,
    sessionService: new InMemorySessionService()
});

class ADKExecutor implements AgentExecutor {
    async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
        const { contextId, userMessage } = requestContext;
        
        // Map A2A message to ADK message format
        const adkMessage = {
            parts: userMessage.parts.map(p => {
                if (p.kind === 'text') return { text: p.text };
                return { text: '' }; // fallback for non-text parts in this simple implementation
            })
        };

        const responseStream = runner.runAsync({
            userId: contextId,
            sessionId: contextId,
            newMessage: adkMessage,
        });

        try {
            for await (const event of responseStream) {
                if (event.content) {
                    // Extract text from ADK content event
                    const text = event.content.parts?.[0]?.text || '';
                    if (text) {
                        const responseMessage: Message = {
                            kind: 'message',
                            messageId: uuidv4(),
                            role: 'agent',
                            parts: [{ kind: 'text', text }],
                            contextId: contextId,
                        };
                        eventBus.publish(responseMessage);
                    }
                }
            }
        } catch (error) {
            console.error('Error during ADK agent execution:', error);
            const errorMessage: Message = {
                kind: 'message',
                messageId: uuidv4(),
                role: 'agent',
                parts: [{ kind: 'text', text: 'Sorry, I encountered an internal error while processing your request.' }],
                contextId: contextId,
            };
            eventBus.publish(errorMessage);
        } finally {
            eventBus.finished();
        }
    }

    async cancelTask(): Promise<void> {
        // Implement cancellation logic if supported by ADK runAsync
    }
}

const skillsAgentCard: AgentCard = {
    name: 'Skills Agent',
    description: 'An agent that fetches and collates necessary AI development skills for user projects.',
    protocolVersion: '0.3.0',
    version: '1.0.0',
    url: process.env.URL || 'http://localhost:8080/a2a/jsonrpc',
    skills: [],
    capabilities: {
        pushNotifications: false,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    additionalInterfaces: [
        { url: process.env.URL || 'http://localhost:8080/a2a/jsonrpc', transport: 'JSONRPC' },
        { url: (process.env.URL || 'http://localhost:8080') + '/a2a/rest', transport: 'HTTP+JSON' },
    ],
};

const agentExecutor = new ADKExecutor();
const requestHandler = new DefaultRequestHandler(
    skillsAgentCard,
    new InMemoryTaskStore(),
    agentExecutor
);

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Skills Collator Agent Server is running.'));

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use('/a2a/jsonrpc', jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use('/a2a/rest', restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Starting Skills Collator Agent... To connect from Gemini, use the exposed port ${PORT}.`);
});
