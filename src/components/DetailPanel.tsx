import type { ReactNode } from 'react'
import { Box, Text } from 'ink'
import { CONNECTION_RESULT_COLOR, DEFAULT_PORT, DETAIL_PANEL_FIELDS_HEIGHT, DETAIL_PANEL_HEIGHT, DETAIL_PANEL_LABEL_WIDTH, DETAIL_PANEL_NOTES_WIDTH, PROTOCOL_COLOR, SSH } from '@/constants'
import type { ConnectionModel, CredentialModel } from '@/models/connection'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString()
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Box width={DETAIL_PANEL_LABEL_WIDTH}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text bold>{children}</Text>
    </Box>
  )
}

function notesPreviewLines(notes: string, height: number): string[] {
  const lines = notes.split('\n').slice(0, height)
  return [...lines, ...Array(height - lines.length).fill('')]
}

export function DetailPanel({
  connection,
  credential,
}: {
  connection: ConnectionModel | null
  credential: CredentialModel | null
}) {
  if (!connection) {
    return (
      <Box flexDirection="column" paddingX={1} height={DETAIL_PANEL_HEIGHT}>
        <Text dimColor>No connection selected</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1} height={DETAIL_PANEL_HEIGHT}>
      <Box>
        <Text bold>{connection.name}</Text>
        <Text> </Text>
        <Text backgroundColor={PROTOCOL_COLOR[connection.protocol]} color="black" bold>
          {` ${connection.protocol.toUpperCase()} `}
        </Text>
      </Box>
      <Text dimColor>{'─'.repeat(connection.name.length)}</Text>
      <Box height={1} />
      <Box>
        <Box flexDirection="column" flexGrow={1}>
          <Field label="Host">{connection.hostname}</Field>
          <Field label="Port">{connection.port ?? DEFAULT_PORT[connection.protocol]}</Field>
          <Field label="Group">{connection.group ?? 'Ungrouped'}</Field>
          <Field label="User">{credential?.username ?? '—'}</Field>
          {connection.protocol === SSH ? (
            <Field label="Identity File">{connection.identityFile ?? '—'}</Field>
          ) : (
            <Box height={1} />
          )}
          {connection.protocol === SSH && connection.extraArgs ? (
            <Field label="Extra Args">{connection.extraArgs}</Field>
          ) : (
            <Box height={1} />
          )}
          <Box height={1} />
          <Field label="Created">
            {connection.createdAt ? formatTimestamp(connection.createdAt) : '—'}
          </Field>
          <Field label="Updated">
            {connection.modifiedAt ? formatTimestamp(connection.modifiedAt) : '—'}
          </Field>
          <Field label="Last connected">
            {connection.lastConnectedAt ? (
              <>
                <Text color={CONNECTION_RESULT_COLOR[connection.lastConnectedResult ?? 'ok']}>
                  {'● '}
                </Text>
                {formatTimestamp(connection.lastConnectedAt)}
              </>
            ) : (
              'Never'
            )}
          </Field>
        </Box>
        {connection.notes && (
          <Box
            flexDirection="column"
            width={DETAIL_PANEL_NOTES_WIDTH}
            paddingLeft={2}
            borderStyle="single"
            borderColor="gray"
            borderTop={false}
            borderRight={false}
            borderBottom={false}
          >
            <Text dimColor>Notes</Text>
            {notesPreviewLines(connection.notes, DETAIL_PANEL_FIELDS_HEIGHT - 1).map((line, i) => (
              <Text key={i} wrap="truncate-end">
                {line || ' '}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
