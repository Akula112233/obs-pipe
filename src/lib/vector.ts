import Docker from "dockerode";
import yaml from "js-yaml";
import fs from "fs/promises";
import path from "path";
import { createServerComponentClient } from "@/utils/supabase/server";
import { addPreviewCapabilities } from "@/lib/config";
import { getOrganizationData } from "@/utils/organization";
import { addCaddyPorts, removeCaddyPorts } from "./caddy";

const docker = new Docker();
const VECTOR_PORT = 8686; // Single fixed port for Vector API
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || "app_network";
const SIGNOZ_NETWORK = "signoz-net";

// Cache for vector instances
const instanceCache: Record<string, { instance: any; timestamp: number }> = {};
const CACHE_TTL = 5000; // 5 seconds

interface VectorPort {
  port: string;
  protocol: "tcp" | "udp";
  description: string;
}

interface ContainerPortConfig {
  // Ports that Vector is configured to listen on (from config)
  configuredPorts: VectorPort[];
  // Ports that were actually detected as listening
  detectedPorts: VectorPort[];
  // The Vector API port (always present)
  apiPort: VectorPort;
}

async function loadDefaultConfig(): Promise<any> {
  try {
    const configPath = path.join(
      process.cwd(),
      "src",
      "config",
      "default.yaml"
    );
    const configFile = await fs.readFile(configPath, "utf8");
    return yaml.load(configFile);
  } catch (error) {
    console.error("Error loading default config:", error);
    // Return a minimal default config if file can't be loaded
    return {
      sources: {},
      transforms: {},
      sinks: {},
    };
  }
}

async function getOrgOwner(orgId: string): Promise<string> {
  const supabase = await createServerComponentClient();

  // Get the first member of the organization (assuming it's the owner)
  const { data: member, error } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !member) {
    throw new Error("Could not find organization owner");
  }

  return member.id;
}

export async function ensureDefaultVectorInstance(orgId: string): Promise<any> {
  console.log(`[ensureDefaultVectorInstance] Starting for orgId: ${orgId}`);
  const supabase = await createServerComponentClient();

  // First check if organization exists
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select()
    .eq("id", orgId)
    .single();

  console.log(`[ensureDefaultVectorInstance] Organization check result:`, {
    org,
    orgError,
  });

  if (orgError || !org) {
    throw new Error(`Organization ${orgId} does not exist`);
  }

  // Check if instance already exists
  const { data: existingInstance } = await supabase
    .from("vector_instances")
    .select()
    .eq("org_id", orgId)
    .single();

  console.log(`[ensureDefaultVectorInstance] Existing instance check result:`, {
    existingInstance,
  });

  if (existingInstance) {
    console.log(
      `[ensureDefaultVectorInstance] Returning existing instance for orgId: ${orgId}`
    );
    return existingInstance;
  }

  console.log(
    `[ensureDefaultVectorInstance] Creating new instance with default config for orgId: ${orgId}`
  );
  // Load default config
  const defaultConfig = await loadDefaultConfig();

  // Create new instance with default config
  return createVectorInstance(orgId, defaultConfig);
}

export async function createVectorInstance(
  orgId: string,
  config: any = {}
): Promise<any> {
  console.log(`[createVectorInstance] Starting for orgId: ${orgId}`);
  const supabase = await createServerComponentClient();

  // Check if instance already exists for this organization
  const { data: existingInstance } = await supabase
    .from("vector_instances")
    .select()
    .eq("org_id", orgId)
    .single();

  console.log(`[createVectorInstance] Existing instance check result:`, {
    existingInstance,
  });

  if (existingInstance) {
    throw new Error("Vector instance already exists for this organization");
  }

  // Get the organization owner to use as creator
  const ownerId = await getOrgOwner(orgId);
  console.log(
    `[createVectorInstance] Got owner ID: ${ownerId} for orgId: ${orgId}`
  );

  // Create the vector instance
  const { data: instance, error: instanceError } = await supabase
    .from("vector_instances")
    .insert([
      {
        org_id: orgId,
        config,
      },
    ])
    .select()
    .single();

  console.log(`[createVectorInstance] Instance creation result:`, {
    instance,
    instanceError,
  });

  if (instanceError) throw instanceError;

  // Create initial version history
  const { error: versionError } = await supabase
    .from("vector_instance_versions")
    .insert([
      {
        instance_id: instance.id,
        config,
        version_number: 1,
        created_by: ownerId,
      },
    ]);

  console.log(`[createVectorInstance] Version history creation result:`, {
    versionError,
  });

  if (versionError) {
    // Cleanup the instance if version creation fails
    console.log(
      `[createVectorInstance] Version creation failed, cleaning up instance ${instance.id}`
    );
    await supabase.from("vector_instances").delete().eq("id", instance.id);
    throw versionError;
  }

  console.log(
    `[createVectorInstance] Successfully created instance for orgId: ${orgId}`
  );
  return instance;
}

/**
 * Analyzes Vector configuration yaml file to find ports that should be exposed within the Docker network.
 * These ports are extracted from source configurations that specify listening ports.
 */
function analyzeConfiguredPorts(config: any): VectorPort[] {
  const ports: VectorPort[] = [];

  if (!config.sources) return ports;

  Object.entries(config.sources).forEach(
    ([sourceName, source]: [string, any]) => {
      // Handle standard address configurations (e.g., "0.0.0.0:9000")
      if (source.address) {
        const portMatch = source.address.toString().match(/:(\d+)$/);
        if (portMatch) {
          ports.push({
            port: portMatch[1],
            protocol: "tcp",
            description: `Source ${sourceName} address listener`,
          });
        }
      }

      // Handle explicit port configurations
      if (source.port) {
        ports.push({
          port: source.port.toString(),
          protocol:
            source.mode === "udp" || source.type?.includes("udp")
              ? "udp"
              : "tcp",
          description: `Source ${sourceName} port listener`,
        });
      }

      // Handle OTLP and other nested configurations
      if (source.grpc?.address) {
        const portMatch = source.grpc.address.toString().match(/:(\d+)$/);
        if (portMatch) {
          ports.push({
            port: portMatch[1],
            protocol: "tcp",
            description: `Source ${sourceName} gRPC listener`,
          });
        }
      }

      if (source.http?.address) {
        const portMatch = source.http.address.toString().match(/:(\d+)$/);
        if (portMatch) {
          ports.push({
            port: portMatch[1],
            protocol: "tcp",
            description: `Source ${sourceName} HTTP listener`,
          });
        }
      }
    }
  );

  return ports;
}

/**
 * Detects ports that Vector is actually listening on within the container.
 * This is used to verify our configuration and catch any dynamic port assignments.
 */
async function detectListeningPorts(
  container: Docker.Container
): Promise<VectorPort[]> {
  try {
    const exec = await container.exec({
      Cmd: [
        "sh",
        "-c",
        "netstat -tlun | grep LISTEN || ss -tlun | grep LISTEN",
      ],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});
    const output = await new Promise<string>((resolve) => {
      let data = "";
      stream.on("data", (chunk) => (data += chunk.toString()));
      stream.on("end", () => resolve(data));
    });

    const ports: VectorPort[] = [];
    const lines = output.split("\n");

    lines.forEach((line) => {
      const portMatch = line.match(/:(\d+)\s+.*LISTEN/);
      if (portMatch) {
        ports.push({
          port: portMatch[1],
          protocol: line.toLowerCase().includes("udp") ? "udp" : "tcp",
          description: "Detected listening port",
        });
      }
    });

    return ports;
  } catch (error) {
    console.error("Error detecting listening ports:", error);
    return [];
  }
}

/**
 * Prepares port configuration for Caddy reverse proxy.
 * This will be used to route external traffic to the appropriate Vector instance.
 */
async function prepareCaddyConfig(
  containerName: string,
  ports: ContainerPortConfig,
  orgId: string,
): Promise<void> {
  // For now, just log the configuration we would send to Caddy
  console.log("Preparing Caddy configuration for Vector instance:");
  console.log(
    JSON.stringify(
      {
        containerName,
        ports: {
          api: ports.apiPort,
          configured: ports.configuredPorts,
          detected: ports.detectedPorts,
        },
      },
      null,
      2
    )
  );
  const detectedPorts = ports.detectedPorts.map(
      (detectedPort) => detectedPort.port
  );
  await addCaddyPorts(detectedPorts, orgId, containerName);

  // TODO: Implement actual Caddy configuration update
  // This would involve:
  // 1. Generating Caddy routes for each port
  // 2. Using containerName for the upstream
  // 3. Potentially setting up SSL/TLS
  // 4. Applying the configuration to Caddy
}

/**
 * Creates Docker container configuration with proper port exposure.
 * Note: This only handles Docker network exposure, not host machine binding.
 */
function createContainerConfig(
  containerName: string,
  configBase64: string,
  portConfig: ContainerPortConfig
) {
  // Convert ports to Docker's port format
  const exposedPorts = {
    // Always expose Vector API port
    [`${portConfig.apiPort.port}/${portConfig.apiPort.protocol}`]: {},
    // Expose all configured source ports
    ...Object.fromEntries(
      portConfig.configuredPorts.map((p) => [`${p.port}/${p.protocol}`, {}])
    ),
  };

  return {
    Image: "timberio/vector:latest-alpine",
    name: containerName,
    Hostname: containerName,
    // Declare all ports that should be accessible within Docker network
    ExposedPorts: exposedPorts,
    Env: [`VECTOR_CONFIG=${configBase64}`],
    Entrypoint: [
      "sh",
      "-c",
      'echo "$VECTOR_CONFIG" | base64 -d > /etc/vector/vector.yaml && exec vector --config /etc/vector/vector.yaml',
    ],
    HostConfig: {
      // No host port bindings - everything stays within Docker network
      PortBindings: {},
      NetworkMode: DOCKER_NETWORK,
      ExtraHosts: ["host.docker.internal:host-gateway"],
      RestartPolicy: { Name: "no" },
    },
  };
}

export async function startVectorInstance(orgId: string): Promise<void> {
  const supabase = await createServerComponentClient();

  const { data: instance, error } = await supabase
    .from("vector_instances")
    .select()
    .eq("org_id", orgId)
    .single();

  if (error) throw error;
  if (!instance) throw new Error("Vector instance not found");

  // Parse config if it's a string
  const parsedConfig =
    typeof instance.config === "string"
      ? yaml.load(instance.config)
      : instance.config;

  // Create runtime config with preview capabilities
  const runtimeConfig = {
    api: {
      enabled: true,
      address: `0.0.0.0:${VECTOR_PORT}`,
    },
    ...addPreviewCapabilities(parsedConfig, orgId),
  };
  const configYaml = yaml.dump(runtimeConfig);
  const configBase64 = Buffer.from(configYaml, "utf8").toString("base64");

  // Check if container exists
  const containerName = `vector-${orgId}`;
  let container;
  try {
    container = docker.getContainer(containerName);

    // Only remove the container if it exists, before creating a new one
    await container.stop().catch(() => {}); // Ignore stop errors
    await container.remove().catch(() => {}); // Ignore remove errors
  } catch (error) {
    // Container doesn't exist, which is fine
  }

  // Initialize port configuration
  const portConfig: ContainerPortConfig = {
    apiPort: {
      port: VECTOR_PORT.toString(),
      protocol: "tcp",
      description: "Vector API",
    },
    configuredPorts: analyzeConfiguredPorts(parsedConfig),
    detectedPorts: [],
  };

  // Create and start the container
  const containerConfig = createContainerConfig(
    containerName,
    configBase64,
    portConfig
  );
  container = await docker.createContainer(containerConfig);
  await container.start();

  // Wait for Vector to start and detect actual listening ports
  await new Promise((resolve) => setTimeout(resolve, 5000));
  portConfig.detectedPorts = await detectListeningPorts(container);

  // Prepare Caddy configuration
  await prepareCaddyConfig(containerName, portConfig,orgId);

  // Connect to additional networks if needed
  try {
    const network = docker.getNetwork(SIGNOZ_NETWORK);
    await network.connect({
      Container: containerName,
      EndpointConfig: { Aliases: [containerName] },
    });
  } catch (error) {
    console.error(`Failed to connect to ${SIGNOZ_NETWORK} network:`, error);
  }
}

export async function stopVectorInstance(orgId: string): Promise<void> {
  try {
    const containerName = `vector-${orgId}`;
    const container = docker.getContainer(containerName);
    const containerInfo = await container.inspect();

    if (containerInfo.State.Running) {
      const detectedPorts = (await detectListeningPorts(container)).map(
        (detectedPort) => detectedPort.port
      );
      await removeCaddyPorts(detectedPorts, orgId, containerName);

      await container.stop();
      await container.remove();
    }
  } catch (error) {
    // Container doesn't exist or other error, ignore
    console.error("Error stopping container:", error);
  }
}

export async function getVectorInstance(orgId: string): Promise<any> {
  const now = Date.now();

  console.log(
    `[getVectorInstance] Attempting to get vector instance for orgId: ${orgId}`
  );

  // Check cache first
  if (
    instanceCache[orgId] &&
    now - instanceCache[orgId].timestamp < CACHE_TTL
  ) {
    console.log(
      `[getVectorInstance] Returning cached instance for orgId: ${orgId}`
    );
    return instanceCache[orgId].instance;
  }

  const supabase = await createServerComponentClient();

  // First check how many instances exist
  const { count, error: countError } = await supabase
    .from("vector_instances")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  console.log(`[getVectorInstance] Instance count for orgId ${orgId}:`, {
    count,
    countError,
  });

  if (countError) {
    console.error(`[getVectorInstance] Error counting instances:`, countError);
    throw countError;
  }

  if (count === 0) {
    // No instances exist, create a new one
    console.log(
      `[getVectorInstance] No instances found, creating default for orgId: ${orgId}`
    );
    const newInstance = await ensureDefaultVectorInstance(orgId);
    instanceCache[orgId] = { instance: newInstance, timestamp: now };
    return newInstance;
  }

  if (count !== null && count > 1) {
    console.warn(
      `[getVectorInstance] WARNING: Multiple instances (${count}) found for orgId ${orgId}`
    );
    // Log all instances to help with debugging
    const { data: instances } = await supabase
      .from("vector_instances")
      .select()
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    console.log(
      `[getVectorInstance] All instances for orgId ${orgId}:`,
      instances
    );

    // For now, use the oldest instance (first created)
    if (instances && instances.length > 0) {
      console.log(
        `[getVectorInstance] Using oldest instance (${instances[0].id}) for orgId: ${orgId}`
      );
      instanceCache[orgId] = { instance: instances[0], timestamp: now };
      return instances[0];
    }
  }

  // Try to get the single instance (or oldest if multiple exist)
  const { data: instance, error } = await supabase
    .from("vector_instances")
    .select()
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (
      error.code === "PGRST116" &&
      error.details?.includes("contains 0 rows")
    ) {
      console.log(
        `[getVectorInstance] No instance found, creating default for orgId: ${orgId}`
      );
      const newInstance = await ensureDefaultVectorInstance(orgId);
      instanceCache[orgId] = { instance: newInstance, timestamp: now };
      return newInstance;
    }
    throw error;
  }

  // Cache the instance
  console.log(
    `[getVectorInstance] Caching and returning instance for orgId: ${orgId}`
  );
  instanceCache[orgId] = { instance, timestamp: now };
  return instance;
}

export async function updateVectorConfig(
  userId: string,
  config: any
): Promise<void> {
  const supabase = await createServerComponentClient();
  const { orgId } = await getOrganizationData();

  // Get or create instance
  const instance = await ensureDefaultVectorInstance(orgId);

  // Get latest version number
  const { data: versions, error: versionError } = await supabase
    .from("vector_instance_versions")
    .select("version_number")
    .eq("instance_id", instance.id)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionError) throw versionError;

  const nextVersion =
    versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

  // Update instance
  const { error: updateError } = await supabase
    .from("vector_instances")
    .update({
      config,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);

  if (updateError) throw updateError;

  // Create new version record
  const { error: newVersionError } = await supabase
    .from("vector_instance_versions")
    .insert([
      {
        instance_id: instance.id,
        config,
        version_number: nextVersion,
        created_by: userId,
      },
    ]);

  if (newVersionError) throw newVersionError;
}

export async function isVectorRunning(orgId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(`vector-${orgId}`);
    const containerInfo = await container.inspect();
    return containerInfo.State.Running;
  } catch (error) {
    return false;
  }
}
