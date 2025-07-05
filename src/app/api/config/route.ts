import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'src', 'vector-configs', 'vector.yaml');

export async function GET() {
    try {
        const config = await fs.readFile(CONFIG_PATH, 'utf8');
        console.log("Read config from:", CONFIG_PATH); // Helpful for debugging
        return NextResponse.json({ config });
    } catch (error: any) {
        console.error("Error reading config:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to read configuration' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { config } = body;

        if (!config) {
            return NextResponse.json(
                { error: 'Configuration data is missing' },
                { status: 400 }
            );
        }

        // Ensure directory exists
        const dirPath = path.dirname(CONFIG_PATH);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(CONFIG_PATH, config, 'utf8');
        console.log("Wrote config to:", CONFIG_PATH); // Helpful for debugging
        return NextResponse.json({ status: 'Configuration updated successfully' });
    } catch (error: any) {
        console.error("Error writing config:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to update configuration' },
            { status: 500 }
        );
    }
}