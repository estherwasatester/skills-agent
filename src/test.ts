import { Runner, InMemorySessionService } from '@google/adk';
import { skillsCollatorAgent } from './agent';

async function testAgent() {
    console.log('Testing Skills Collator Agent...');

    const runner = new Runner({
        appName: 'photonic-equinox',
        agent: skillsCollatorAgent,
        sessionService: new InMemorySessionService()
    });

    const responseStream = runner.runEphemeral({
        userId: 'test-user',
        newMessage: { parts: [{ text: "I want to add firebase authentication to my web app but I don't have the right skills" }] },
    });

    console.log('Agent Response Stream:');
    for await (const event of responseStream) {
        console.log(JSON.stringify(event, null, 2));
    }
}

testAgent().catch(console.error);
