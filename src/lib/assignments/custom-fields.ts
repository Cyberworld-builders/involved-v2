/**
 * Replace custom field placeholders in content with actual values
 * 
 * Custom fields format: {type: ['name', 'email', 'role'], value: ['John Doe', 'john@example.com', 'Manager']}
 * Placeholders in content: [name], [email], [role]
 */
export function replaceCustomFields(
  content: string,
  customFields: { type: string[]; value: string[] } | null
): string {
  if (!customFields || !customFields.type || !customFields.value) {
    return content
  }

  let result = content

  // Special handling: if role is 'self', replace [name] with 'yourself'
  const roleIndex = customFields.type.findIndex((t) => t === 'role')
  const nameIndex = customFields.type.findIndex((t) => t === 'name')

  if (
    roleIndex !== -1 &&
    nameIndex !== -1 &&
    customFields.value[roleIndex]?.toLowerCase() === 'self'
  ) {
    result = result.replace(/\[name\]/gi, 'yourself')
  }

  // Replace all custom field placeholders
  customFields.type.forEach((fieldType, index) => {
    const fieldValue = customFields.value[index] || ''
    const placeholder = new RegExp(`\\[${fieldType}\\]`, 'gi')
    result = result.replace(placeholder, fieldValue)
  })

  // Also handle [job] placeholder if job_id is available (would need to be passed separately)
  // This is handled in the assignment context where job information is available

  return result
}

