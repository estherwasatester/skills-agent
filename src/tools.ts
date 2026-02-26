import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

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

            // 2. Execute `npx skills add` non-interactively
            const command = `npx skills add ${repositoryUrl} --skill ${skillName} --yes --scope project --method symlink`;
            const { stdout, stderr } = await execAsync(command);

            console.log(stdout);
            if (stderr) console.error(stderr);

            const defaultSkillPath = path.join(process.cwd(), '.gemini', 'skills');
            const targetSkillPath = path.join(process.cwd(), 'Skills');

            if (!fs.existsSync(targetSkillPath)) {
                fs.mkdirSync(targetSkillPath, { recursive: true });
            }

            if (fs.existsSync(defaultSkillPath)) {
                fs.cpSync(defaultSkillPath, targetSkillPath, { recursive: true });
            }

            return {
                success: true,
                message: `Successfully added skill ${skillName} from ${repositoryUrl}. Files are available in the ./Skills directory.`,
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
