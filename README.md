# Skills Collator Agent

## Why does this exist? 

The **Skills Collator Agent** was created to solve a specific problem: **finding and getting the right skills for the job at hand to use with Gemini CLI**. 

Instead of manually hunting for the right extensions or tools, this agent is designed to take a user's intent, identify the necessary skills from verified sources (like Firebase or Google Cloud), and use `npx skills add` to automatically download and prepare them in a local `Skills` folder. It provides a streamlined way to supercharge your AI coding assistants with exactly the tools you need for your current task.

## Prerequisites

- Node.js (v18 or higher recommended)
- `npm` or `yarn`
- Gemini CLI installed and configured

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   You will need an API key to run the agent. Copy the example environment file and add your key:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your `GEMINI_API_KEY` (or `GOOGLE_GENAI_API_KEY`).

3. **Run the agent server:**
   You can start the server locally using `ts-node`:
   ```bash
   npx ts-node src/index.ts
   ```
   Or if you have added the start script to `package.json`:
   ```bash
   npm start
   ```

4. **Test with ADK Web UI (Optional):**
   You can launch the Google ADK local web UI to test the agent by running:
   ```bash
   npm run adk-web
   ```
   This will start a local web interface (default `http://localhost:8000`) where you can interact directly with the agent instance.

5. **Connect with Gemini CLI:**
   By default, the Express server runs on port `8080`. You can connect Gemini CLI (or any compatible client like Gemini Enterprise) to this remote subagent using its exposed URL/Port.

   *Example URL: `http://localhost:8080`*

## How to Deploy

To deploy this subagent so it can be accessed over the internet (e.g., via Cloud Run):

1. **Compile the TypeScript code:**
   Ensure you compile your TypeScript down to JavaScript. You can do this by running:
   ```bash
   npx tsc
   ```

2. **Containerize the application (Optional but recommended):**
   Create a `Dockerfile` to package your Express app:
   ```dockerfile
   FROM node:18-slim
   WORKDIR /usr/src/app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   RUN npx tsc
   EXPOSE 8080
   CMD [ "node", "dist/index.js" ]
   ```

3. **Deploy to Google Cloud Run:**
   You can deploy directly from your source code using the Google Cloud CLI:
   ```bash
   gcloud run deploy skills-collator-agent \
     --source . \
     --port 8080 \
     --allow-unauthenticated
   ```
   Once deployed, Cloud Run will provide you with a public URL that you can configure as the endpoint for your Gemini CLI or Gemini Enterprise.

## How it works

- The agent is built using the **Google ADK** (`@google/adk`) in TypeScript.
- It exposes an Express.js server that listens for incoming agent protocol requests.
- When it receives a request with a specific intent, it uses its built-in tools (like `skillsSearchTool` and `skillsAddTool`) to search for the right skills and install them locally using `npx skills add`.
