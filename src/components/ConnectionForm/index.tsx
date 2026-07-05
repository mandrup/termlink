import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { FormFieldRow } from '@/components/ConnectionForm/FormFieldRow'
import { NotesPane } from '@/components/ConnectionForm/NotesPane'
import { resolveFormKeyAction, toFormValues, trimFormValues, validate, visibleFields, type ConnectionFormValues } from '@/lib/connections/connectionForm'
import type { ConnectionModel } from '@/models/connection'

export function ConnectionForm({
  title,
  initialConnection,
  initialUsername,
  initialHasPassword = false,
  onSubmit,
  onCancel,
}: {
  title: string
  initialConnection: ConnectionModel | null
  initialUsername: string
  initialHasPassword?: boolean
  onSubmit: (values: ConnectionFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<ConnectionFormValues>(
    toFormValues(initialConnection, initialUsername),
  )
  const [fieldIndex, setFieldIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fields = visibleFields(values.protocol)
  const clampedIndex = Math.min(fieldIndex, fields.length - 1)
  const field = fields[clampedIndex]

  function trySubmit() {
    const validationError = validate(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(trimFormValues(values))
  }

  useInput((input, key) => {
    const action = resolveFormKeyAction({
      values,
      field,
      fieldIndex: clampedIndex,
      fieldsLength: fields.length,
      input,
      key,
    })
    switch (action.type) {
      case 'cancel':
        onCancel()
        break
      case 'submit':
        trySubmit()
        break
      case 'setFieldIndex':
        setFieldIndex(action.index)
        break
      case 'setValues':
        setValues(action.values)
        if (action.clearsError) setError(null)
        break
      case 'none':
        break
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="magenta">
        {title}
      </Text>
      <Box height={1} />
      <Box>
        <Box flexDirection="column" flexGrow={1}>
          {fields
            .filter((key) => key !== 'notes')
            .map((key) => (
              <FormFieldRow
                key={key}
                field={key}
                isActive={key === field}
                values={values}
                initialHasPassword={initialHasPassword}
                onChange={(val) => {
                  setError(null)
                  setValues((v) => ({
                    ...v,
                    [key]: val,
                    ...(key === 'password' ? { passwordTouched: true } : {}),
                  }))
                }}
              />
            ))}
        </Box>
        <NotesPane notes={values.notes} isActive={field === 'notes'} />
      </Box>
      <Box height={1} />
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>
        tab/↓ next field · ↑ previous · ←/→ toggle protocol/MCP access · enter newline in notes ·
        ctrl+s save · esc cancel
      </Text>
    </Box>
  )
}
