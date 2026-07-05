import pkg from '../package.json' with { type: 'json' }
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getMcpConnectionStatus, listMcpConnections, runMcpCommand } from '@/lib/mcp/mcpTools'
import { loadState } from '@/lib/storage'
import { MCP_GET_CONNECTION_STATUS, MCP_LIST_CONNECTIONS, MCP_RUN_COMMAND } from '@/constants'

const server = new McpServer({ name: 'termlink', version: pkg.version })

server.registerTool(
  MCP_LIST_CONNECTIONS,
  {
    title: 'List SSH connections',
    description:
      'Lists the SSH connections the user has explicitly opted into MCP access, along with the commands allowed on each. Connections not opted in (and all RDP connections) are never listed.',
  },
  async () => {
    const { state } = await loadState()
    return {
      content: [{ type: 'text', text: JSON.stringify(listMcpConnections(state)) }],
    }
  },
)

server.registerTool(
  MCP_RUN_COMMAND,
  {
    title: 'Run a command over SSH',
    description:
      'Runs a command on an opted-in SSH connection. The command must exactly match (or match a "*"-suffixed prefix of) one of that connection\'s allowedCommands from list_connections; anything else is rejected before it reaches the remote host.',
    inputSchema: {
      connectionId: z.string(),
      command: z.string(),
    },
  },
  async ({ connectionId, command }) => {
    const { state } = await loadState()
    const outcome = await runMcpCommand(state, connectionId, command)
    if (!outcome.ok) {
      return {
        content: [{ type: 'text', text: outcome.reason }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(outcome.result) }],
      isError: outcome.result.code !== 0,
    }
  },
)

server.registerTool(
  MCP_GET_CONNECTION_STATUS,
  {
    title: 'Check SSH connection status',
    description:
      'Checks whether an opted-in SSH connection is currently reachable, via a fixed non-interactive probe (no allowedCommands entry needed). Also reports when a human last connected via the termlink TUI, if ever.',
    inputSchema: {
      connectionId: z.string(),
    },
  },
  async ({ connectionId }) => {
    const { state } = await loadState()
    const outcome = await getMcpConnectionStatus(state, connectionId)
    if (!outcome.ok) {
      return {
        content: [{ type: 'text', text: outcome.reason }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(outcome.status) }],
    }
  },
)

await server.connect(new StdioServerTransport())
