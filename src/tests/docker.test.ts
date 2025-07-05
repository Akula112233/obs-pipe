import docker from '@/lib/docker';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import net from 'net';

const TEST_CONTAINER_NAME = 'docker-integration-test-vector';

// Function to find an available port
function getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => {
                resolve(port);
            });
        });
    });
}

async function createTestConfig(port: number) {
    return {
        api: {
            enabled: true,
            address: `0.0.0.0:${port}`
        },
        sources: {
            test_source: {
                type: "demo_logs",
                format: "syslog",
                interval: 1
            }
        },
        sinks: {
            test_sink: {
                type: "console",
                inputs: ["test_source"],
                encoding: {
                    codec: "json"
                }
            }
        }
    };
}

async function createTempConfig(port: number): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vector-test-'));
    const configPath = path.join(tempDir, 'vector.yaml');
    const config = await createTestConfig(port);
    await fs.writeFile(configPath, yaml.dump(config));
    return configPath;
}

async function cleanup(configPath: string) {
    // Clean up temp config
    try {
        await fs.rm(path.dirname(configPath), { recursive: true });
    } catch (error) {
        console.error('Failed to clean up temp config:', error);
    }

    // Clean up container if it exists
    try {
        const container = docker.getContainer(TEST_CONTAINER_NAME);
        const info = await container.inspect();
        if (info.State.Running) {
            await container.stop();
        }
        await container.remove();
    } catch (error) {
        // Container doesn't exist or other error, ignore
    }
}

async function runTests() {
    console.log("Starting Docker integration tests...\n");
    let configPath: string | undefined;
    let vectorPort: number;

    try {
        // Test 1: Docker Connection
        console.log("Test 1: Docker Connection");
        try {
            const info = await docker.info();
            console.log("✅ Docker connection successful - Version:", info.ServerVersion);
        } catch (error) {
            console.error("❌ Docker connection failed:", error);
            return;
        }

        // Get available port
        vectorPort = await getAvailablePort();
        console.log("✅ Found available port:", vectorPort);

        // Create temp config
        configPath = await createTempConfig(vectorPort);
        console.log("✅ Created temporary pipeline config at:", configPath);

        // Test 2: Container Creation
        console.log("\nTest 2: Container Creation");
        try {
            // Check if container already exists
            try {
                const existingContainer = docker.getContainer(TEST_CONTAINER_NAME);
                const info = await existingContainer.inspect();
                console.log("Found existing test container, removing it...");
                if (info.State.Running) {
                    await existingContainer.stop();
                }
                await existingContainer.remove();
            } catch (error) {
                // Container doesn't exist, which is fine
            }

            // Create new container
            await docker.createContainer({
                Image: 'timberio/vector:latest-alpine',
                name: TEST_CONTAINER_NAME,
                ExposedPorts: {
                    [`${vectorPort}/tcp`]: {}
                },
                HostConfig: {
                    PortBindings: {
                        [`${vectorPort}/tcp`]: [{ HostPort: vectorPort.toString() }]
                    },
                    Binds: [`${configPath}:/etc/vector/vector.yaml:ro`]
                }
            });
            console.log("✅ Container created successfully");
        } catch (error) {
            console.error("❌ Failed to create container:", error);
            return;
        }

        // Test 3: Container Start
        console.log("\nTest 3: Container Start");
        try {
            const container = docker.getContainer(TEST_CONTAINER_NAME);
            await container.start();
            const info = await container.inspect();
            console.log("✅ Container started successfully. Status:", info.State.Status);
        } catch (error) {
            console.error("❌ Failed to start container:", error);
            return;
        }

        // Wait a bit for Vector to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 4: Logs Retrieval
        console.log("\nTest 4: Logs Retrieval");
        try {
            const container = docker.getContainer(TEST_CONTAINER_NAME);
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: 5,
                timestamps: true
            });
            const logLines = logs.toString('utf-8').split('\n').filter(Boolean);
            console.log("✅ Successfully retrieved logs. Last 5 entries:");
            logLines.slice(0, 5).forEach(line => console.log(`   ${line}`));
        } catch (error) {
            console.error("❌ Failed to retrieve logs:", error);
        }

        // Test 5: Exec Command
        console.log("\nTest 5: Exec Command");
        try {
            const container = docker.getContainer(TEST_CONTAINER_NAME);
            const exec = await container.exec({
                Cmd: ['sh', '-c', 'echo "test command"'],
                AttachStdout: true,
                AttachStderr: true
            });
            const stream = await exec.start({});
            console.log("✅ Successfully executed command in container");
        } catch (error) {
            console.error("❌ Failed to execute command:", error);
        }

        // Test 6: Collection State Toggle
        console.log("\nTest 6: Collection State Toggle");
        try {
            const container = docker.getContainer(TEST_CONTAINER_NAME);
            
            // Test start collection
            const startExec = await container.exec({
                Cmd: ['sh', '-c', 'export VECTOR_COLLECTING=true'],
                AttachStdout: true,
                AttachStderr: true
            });
            await startExec.start({});
            console.log("✅ Successfully set collection state to true");

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Test stop collection
            const stopExec = await container.exec({
                Cmd: ['sh', '-c', 'export VECTOR_COLLECTING=false'],
                AttachStdout: true,
                AttachStderr: true
            });
            await stopExec.start({});
            console.log("✅ Successfully set collection state to false");
        } catch (error) {
            console.error("❌ Failed to toggle collection state:", error);
        }

        // Test 7: Container Stop
        console.log("\nTest 7: Container Stop");
        try {
            const container = docker.getContainer(TEST_CONTAINER_NAME);
            await container.stop();
            const info = await container.inspect();
            console.log("✅ Container stopped successfully. Status:", info.State.Status);
        } catch (error) {
            console.error("❌ Failed to stop container:", error);
        }

    } catch (error) {
        console.error("\n❌ Test suite failed:", error);
    } finally {
        // Clean up
        if (configPath) {
            console.log("\nCleaning up...");
            await cleanup(configPath);
            console.log("✅ Cleanup completed");
        }
    }

    console.log("\nTests completed!");
}

// Run the tests
runTests().catch(console.error); 