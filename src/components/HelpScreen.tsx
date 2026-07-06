import type { ReactNode } from 'react'
import { Box, Text } from 'ink'
import { ACCENT_COLOR } from '@/constants'
import { SSH_CONFIG_DISPLAY_PATH } from '@/lib/ssh/sshConfig'

export const HELP_KEYS: [string, string][] = [
  ['↑/↓ or j/k', 'Move selection'],
  ['←/→', 'Fold/unfold a group'],
  ['K/J', 'Reorder the selected item or group (shift+k/j)'],
  ['enter', 'Connect to the selected host'],
  ['a', 'Add a connection'],
  ['c', 'Clone the selected connection'],
  ['e', 'Edit the selected connection'],
  ['d', 'Delete the selected connection'],
  ['i', `Import hosts from ${SSH_CONFIG_DISPLAY_PATH}`],
  ['r', 'Recheck reachability'],
  ['/', 'Search'],
  ['?', 'This help'],
  ['q/esc', 'Quit'],
]

export function HelpScreen({ header }: { header: ReactNode }) {
  return (
    <Box flexDirection="column">
      {header}
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
        <Text bold color="magenta">
          Keyboard shortcuts
        </Text>
        <Box height={1} />
        {HELP_KEYS.map(([key, action]) => (
          <Box key={key}>
            <Box width={14}>
              <Text color={ACCENT_COLOR} bold>
                {key}
              </Text>
            </Box>
            <Text>{action}</Text>
          </Box>
        ))}
        <Box height={1} />
        <Text dimColor>press any key to close</Text>
      </Box>
    </Box>
  )
}
