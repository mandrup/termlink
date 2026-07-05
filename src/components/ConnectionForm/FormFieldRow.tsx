import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { ACCENT_COLOR, PROTOCOL_COLOR, RDP, SSH } from '@/constants'
import { FIELD_LABELS, type ConnectionFormValues, type FieldKey } from '@/lib/connections/connectionForm'

export function FormFieldRow({
  field,
  isActive,
  values,
  initialHasPassword,
  onChange,
}: {
  field: Exclude<FieldKey, 'notes'>
  isActive: boolean
  values: ConnectionFormValues
  initialHasPassword: boolean
  onChange: (value: string) => void
}) {
  return (
    <Box alignItems="flex-start">
      <Text color={ACCENT_COLOR} bold>
        {isActive ? '❯ ' : '  '}
      </Text>
      <Box width={18}>
        <Text color={isActive ? ACCENT_COLOR : undefined} bold={isActive}>
          {FIELD_LABELS[field]}
        </Text>
      </Box>
      {field === 'protocol' ? (
        <Box>
          {([SSH, RDP] as const).map((p, j) => {
            const isChosen = values.protocol === p
            return (
              <Text key={p}>
                {j > 0 && ' '}
                <Text
                  backgroundColor={isChosen ? PROTOCOL_COLOR[p] : undefined}
                  color={isChosen ? 'black' : 'gray'}
                  bold={isChosen}
                >
                  {` ${p.toUpperCase()} `}
                </Text>
              </Text>
            )
          })}
          {isActive && <Text dimColor> ←/→</Text>}
        </Box>
      ) : field === 'mcpEnabled' ? (
        <Box>
          <Text
            backgroundColor={values.mcpEnabled ? 'green' : undefined}
            color={values.mcpEnabled ? 'black' : 'gray'}
            bold={values.mcpEnabled}
          >
            {values.mcpEnabled ? ' Enabled ' : ' Disabled '}
          </Text>
          {isActive && <Text dimColor> ←/→</Text>}
        </Box>
      ) : isActive ? (
        <TextInput
          value={values[field]}
          mask={field === 'password' ? '•' : undefined}
          placeholder={
            field === 'password' && initialHasPassword && !values.passwordTouched
              ? '(unchanged — type to replace)'
              : field === 'mcpAllowedCommands'
                ? 'comma-separated, e.g. "uptime, systemctl status *"'
                : field === 'extraArgs'
                  ? 'e.g. "-J bastion.example.com"'
                  : undefined
          }
          onChange={onChange}
        />
      ) : field === 'password' ? (
        <Text dimColor={!values.password}>
          {values.password
            ? '•'.repeat(values.password.length)
            : initialHasPassword && !values.passwordTouched
              ? '(set)'
              : ' '}
        </Text>
      ) : (
        <Text>{values[field] || ' '}</Text>
      )}
    </Box>
  )
}
