import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const searchAgentSkills = new FunctionTool({
    name: 'search_agent_skills',
    description: 'Searches a GitHub repository to find available agent skills. Use this to discover what skills are available before trying to add them.',
    parameters: z.object({
        repositoryUrl: z.string().describe('The GitHub repository URL, e.g. https://github.com/firebase/agent-skills'),
    }),
    execute: async ({ repositoryUrl }) => {
        const allowedPrefixes = [
            'https://github.com/firebase/',
            'https://github.com/GoogleCloudPlatform/',
        ];
        if (!allowedPrefixes.some((prefix) => repositoryUrl.startsWith(prefix))) {
            return { success: false, message: `Error: Must be from a verified source.` };
        }

        try {
            const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) return { success: false, message: 'Invalid GitHub URL format.' };
            const owner = match[1];
            const repo = match[2].replace(/\.git$/, '');

            let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/skills`, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'skills-agent' }
            });

            let basePath = 'skills/';
            if (!response.ok) {
                response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
                    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'skills-agent' }
                });
                basePath = '';
            }

            if (!response.ok) return { success: false, message: `Failed to fetch: ${response.statusText}` };
            const data = await response.json();
            const skills = data.filter((item: any) => item.type === 'dir' && !item.name.startsWith('.')).map((item: any) => item.name);

            return {
                success: true,
                message: `Found the following skills in ${basePath || 'root'}: ${skills.join(', ')}`,
                skills
            };
        } catch (error: any) {
            return { success: false, message: `Failed to search: ${error.message}` };
        }
    }
});

export const addAgentSkills = new FunctionTool({
    name: 'add_agent_skills',
    description: 'Adds an Agent Skill from a verified GitHub repository (e.g. firebase/agent-skills, GoogleCloudPlatform/... ) to the local project.',
    parameters: z.object({
        repositoryUrl: z.string().describe('The GitHub repository URL, e.g. https://github.com/firebase/agent-skills'),
        skillName: z.string().describe('The name of the specific skill to add, e.g. firebase-auth-basics'),
    }),
    execute: async ({ repositoryUrl, skillName }) => {
        // 1. Validation: Verify source
        const allowedPrefixes = [
            'https://github.com/firebase/',
            'https://github.com/GoogleCloudPlatform/',
        ];

        const isValidSource = allowedPrefixes.some((prefix) => repositoryUrl.startsWith(prefix));

        if (!isValidSource) {
            return {
                success: false,
                message: `Error: The repository URL must be from a verified source (${allowedPrefixes.join(' or ')}). Provided: ${repositoryUrl}`
            };
        }

        try {
            console.log(`Adding skill '${skillName}' from ${repositoryUrl}...`);

            // 2. Execute `gemini skills install` non-interactively
            const repo = repositoryUrl.endsWith('.git') ? repositoryUrl : `${repositoryUrl}.git`;
            // Check if skillName already contains the path
            const skillPath = skillName.includes('/') ? skillName : `skills/${skillName}`;
            const command = `gemini skills install ${repo} --path ${skillPath} --consent --scope workspace`;
            const { stdout, stderr } = await execAsync(command);

            console.log(stdout);
            if (stderr) console.error(stderr);

            return {
                success: true,
                message: `Successfully added skill ${skillName} from ${repositoryUrl}.`,
                details: stdout
            };

        } catch (error: any) {
            return {
                success: false,
                message: `Failed to add skill: ${error.message}`,
                details: error.stdout || error.stderr
            };
        }
    }
});
