import { Box, Text, useInput } from 'ink'

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useInput((input, key) => {
    if (input.toUpperCase() === 'Y') {
      onConfirm()
      return
    }
    if (input.toUpperCase() === 'N' || key.escape) {
      onCancel()
    }
  })

  return (
    <Box paddingX={1} borderStyle="round" borderColor="red">
      <Text color="red" bold>
        {message}
      </Text>
      <Text dimColor> · </Text>
      <Text bold color="red">
        y
      </Text>
      <Text dimColor> confirm · </Text>
      <Text bold>n</Text>
      <Text dimColor> cancel</Text>
    </Box>
  )
}
