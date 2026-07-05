import { Box, Text } from 'ink'
import { ACCENT_COLOR } from '@/constants'

const HINTS: { key: string; label: string }[] = [
  { key: '↑↓', label: 'move' },
  { key: '←→', label: 'fold' },
  { key: 'enter', label: 'connect' },
  { key: 'a', label: 'add' },
  { key: 'c', label: 'clone' },
  { key: 'e', label: 'edit' },
  { key: 'd', label: 'delete' },
  { key: '/', label: 'search' },
  { key: 'q', label: 'quit' },
]

export function StatusBar({ message }: { message?: string }) {
  return (
    <Box paddingX={1} borderStyle="single" borderColor="gray">
      <Text wrap="truncate-end">
        {message ? (
          <Text dimColor>{message}</Text>
        ) : (
          HINTS.map(({ key, label }, i) => (
            <Text key={key}>
              {i > 0 && <Text dimColor> · </Text>}
              <Text bold color={ACCENT_COLOR}>
                {key}
              </Text>
              <Text dimColor> {label}</Text>
            </Text>
          ))
        )}
      </Text>
    </Box>
  )
}
