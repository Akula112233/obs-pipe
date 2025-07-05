import axios from 'axios';

const caddyUrl = process.env.CADDY_ADMIN_URL || 'http://localhost:2019';

interface ServerBlock {
  automatic_https: {
    disable: boolean;
  };
  listen: string[];
  routes: RouteBlock[];
}

interface RouteBlock {
  handle: HandleBlock[];
  terminal: boolean;
}

interface HandleBlock {
  handler: string;
  routes?: SubRoute[];
  upstreams?: UpstreamBlock[];
}

interface SubRoute {
  group?: string;
  handle: HandleBlock[];
  match?: MatchBlock[];
}

interface MatchBlock {
  host: string[];
}

interface UpstreamBlock {
  dial: string;
}

const defaultServerBlock: ServerBlock = {
  automatic_https: {
    disable: true
  },
  listen: [],
  routes: [{
    handle: [{
      handler: 'subroute',
      routes: []
    }],
    terminal: true
  }]
};

async function getExistingConfig(serverName: string): Promise<ServerBlock> {
  try {
    const response = await axios.get(`${caddyUrl}/config/apps/http/servers/${serverName}`);
    return response.data || defaultServerBlock;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { ...defaultServerBlock };
    }
    return { ...defaultServerBlock };
  }
}

function findMaxGroupNumber(config: ServerBlock): number {
  let maxGroup = 0;
  try {
    config.routes?.forEach(route => {
      route.handle?.forEach(handle => {
        handle.routes?.forEach(subroute => {
          if (subroute.group) {
            const groupNum = parseInt(subroute.group.replace('group', ''), 10);
            if (!isNaN(groupNum) && groupNum > maxGroup) {
              maxGroup = groupNum;
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('Error finding max group number:', error);
  }
  return maxGroup;
}

function createServerBlock(
    port: string,
    orgId: string,
    containerName: string,
    groupNum: number
): ServerBlock {
  const portNumber = port.replace(':', '');
  return {
    automatic_https: {
      disable: true
    },
    listen: [`${port.startsWith(':') ? port : `:${port}`}`],
    routes: [
      {
        handle: [
          {
            handler: 'subroute',
            routes: [
              {
                group: `group${groupNum}`,
                handle: [
                  {
                    handler: 'subroute',
                    routes: [
                      {
                        handle: [
                          {
                            handler: 'reverse_proxy',
                            upstreams: [
                              {
                                dial: `${containerName}:${portNumber}`
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ],
                match: [
                  {
                    host: [`${orgId}.app.trysift.dev`]
                  }
                ]
              }
            ]
          }
        ],
        terminal: true
      }
    ]
  };
}

export async function addCaddyPorts(
    detectedPorts: string[],
    orgId: string,
    containerName: string
): Promise<void> {
  try {
    if (!Array.isArray(detectedPorts) || detectedPorts.length === 0) {
      console.error('No ports provided');
    }

    if (!orgId || !containerName) {
      console.error('Missing orgId or containerName');
    }

    // Process each port as a separate server block
    for (const port of detectedPorts) {
      const serverName = `srv${port.replace(':', '')}`;
      const portWithColon = port.startsWith(':') ? port : `:${port}`;

      // Get existing configuration for this server
      const existingConfig = await getExistingConfig(serverName);

      // Find max group number
      const maxGroup = findMaxGroupNumber(existingConfig);
      const nextGroup = maxGroup + 2; // Keep odd numbering pattern

      if (!existingConfig.routes?.[0]?.handle?.[0]?.routes?.length) {
        // Create new server block
        const newConfig = createServerBlock(portWithColon, orgId, containerName, nextGroup);
        await axios.put(
            `${caddyUrl}/config/apps/http/servers/${serverName}`,
            newConfig
        );
      } else {
        // Check if domain already exists
        const mainDomain = `${orgId}.app.trysift.dev`;
        const existingRoutes = existingConfig.routes[0].handle[0].routes || [];

        const domainExists = existingRoutes.some(route =>
            route.match?.some(match =>
                match.host.includes(mainDomain)
            )
        );

        if (!domainExists) {
          // Add new route
          const newBlock = createServerBlock(portWithColon, orgId, containerName, nextGroup);
          const newRoute = newBlock.routes[0].handle[0].routes![0];
          existingRoutes.push(newRoute);
          existingConfig.routes[0].handle[0].routes = existingRoutes;

          await axios.patch(
              `${caddyUrl}/config/apps/http/servers/${serverName}`,
              existingConfig
          );
        }
      }
    }
  } catch (error: any) {
    console.error(
        'Error updating Caddy config:',
        error.response?.data || error.message
    );
  }
}
export async function removeCaddyPorts(
    detectedPorts: string[],
    orgId: string,
    containerName: string
): Promise<void> {
  try {
    if (!Array.isArray(detectedPorts) || detectedPorts.length === 0) {
      console.error('No ports provided');
    }

    if (!orgId || !containerName) {
      console.error('Missing orgId or containerName');
    }

    for (const port of detectedPorts) {
      const serverName = `srv${port.replace(':', '')}`;
      try {
        const config = await getExistingConfig(serverName);

        if (config.routes?.[0]?.handle?.[0]?.routes) {
          // Get the current routes
          const currentRoutes = config.routes[0].handle[0].routes;

          // Filter out routes for this org and container
          const mainDomain = `${orgId}.app.trysift.dev`;

          const filteredRoutes = currentRoutes.filter(route => {
            // Check if this route should be kept
            const isDifferentDomain = !route.match?.[0]?.host?.[0]?.includes(mainDomain);
            const isDifferentContainer = !route.handle?.[0]?.upstreams?.[0]?.dial?.includes(containerName);
            // Keep the route only if it's for a different domain AND different container
            return isDifferentDomain && isDifferentContainer;
          });

          if (filteredRoutes.length === 0) {
            try {
              await axios.delete(`${caddyUrl}/config/apps/http/servers/${serverName}`);
            } catch (deleteError: any) {
              console.error(`Failed to delete server block ${serverName}:`, deleteError.response?.data || deleteError.message);
            }
          } else {
            // Update with filtered routes
            config.routes[0].handle[0].routes = filteredRoutes;
            try {
              await axios.patch(
                  `${caddyUrl}/config/apps/http/servers/${serverName}`,
                  config
              );
            } catch (patchError: any) {
              console.error(`Failed to update server block ${serverName}:`, patchError.response?.data || patchError.message);
            }
          }
        }
      } catch (serverError: any) {
        console.error(`Error processing server ${serverName}:`, serverError.response?.data || serverError.message);
      }
    }
  } catch (error: any) {
    console.error(
        'Error removing Caddy config:',
        error.response?.data || error.message
    );
  }
}