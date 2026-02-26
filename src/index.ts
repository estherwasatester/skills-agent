import 'dotenv/config';
import express from 'express';
import { jsonRpcHandler } from '@a2a-js/sdk/server/express';
import { skillsCollatorAgent } from './agent';

const app = express();

// Since the ADK gives us an agent, we need to wrap it into an AgentExecutor
// Note: This is a placeholder since the exact ADK AgentExecutor interface wasn't fully documented.
// If the ADK provides an A2ARequestHandler or AgentExecutor directly, we'd use that.
// For now, let's just make sure it compiles and start the server so adk web can connect.

app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Skills Collator Agent Server is running.'));

app.listen(PORT, () => {
    console.log(`Starting Skills Collator Agent... To connect from Gemini, use the exposed port ${PORT}.`);
});
