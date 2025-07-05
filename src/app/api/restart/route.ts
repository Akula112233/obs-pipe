import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
    // Get the absolute path from project root
    const configPath = path.resolve(process.cwd(), "src/vector-configs/vector.yaml");

    return new Promise((resolve) => {
        // First check if the container exists
        exec(`docker ps -a -q -f name=vector`, (error, stdout) => {
            const stopCommand = stdout.trim() ? 'docker stop vector && docker rm vector && ' : '';
            
            // Then run the container with proper path
            exec(
                `${stopCommand}docker run -d -v "${configPath}":/etc/vector/vector.yaml:ro -p --name vector timberio/vector:0.43.1-debian`,
                (error, stdout, stderr) => {
                    if (error) {
                        console.error("Error restarting Vector:", stderr || error.message);
                        resolve(
                            NextResponse.json({ error: stderr || error.message }, { status: 500 })
                        );
                    } else {
                        console.log("Vector restarted successfully:", stdout);
                        resolve(
                            NextResponse.json(
                                { status: "Vector restarted successfully", containerId: stdout.trim() },
                                { status: 200 }
                            )
                        );
                    }
                }
            );
        });
    });
}