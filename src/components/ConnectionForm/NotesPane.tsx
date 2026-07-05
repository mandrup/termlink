import { Box, Text } from 'ink'
import { ACCENT_COLOR, CONNECTION_FORM_NOTES_HEIGHT, CONNECTION_FORM_NOTES_WIDTH } from '@/constants'
import { FIELD_LABELS, notesCursorRow, visibleNotesLines } from '@/lib/connections/connectionForm'

export function NotesPane({ notes, isActive }: { notes: string; isActive: boolean }) {
  return (
    <Box
      flexDirection="column"
      width={CONNECTION_FORM_NOTES_WIDTH}
      paddingLeft={2}
      borderStyle="single"
      borderColor="gray"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
    >
      <Box>
        <Text color={ACCENT_COLOR} bold>
          {isActive ? '❯ ' : '  '}
        </Text>
        <Text color={isActive ? ACCENT_COLOR : undefined} bold={isActive}>
          {FIELD_LABELS.notes}
        </Text>
      </Box>
      {visibleNotesLines(notes, CONNECTION_FORM_NOTES_HEIGHT).map((line, i) => (
        <Text key={i} wrap="truncate-end">
          {line}
          {isActive && i === notesCursorRow(notes, CONNECTION_FORM_NOTES_HEIGHT) ? (
            <Text inverse> </Text>
          ) : (
            !line && ' '
          )}
        </Text>
      ))}
    </Box>
  )
}
