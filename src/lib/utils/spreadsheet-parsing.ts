/**
 * Utility functions for parsing CSV and Excel spreadsheets
 * Used for bulk upload operations (users, groups, benchmarks)
 */

export interface UserRow {
  name: string
  email: string
  username: string
  industry: string
  client_name?: string
}

export interface GroupRow {
  name: string
  description?: string
  client_name?: string
}

export interface BenchmarkRow {
  dimension_name: string
  dimension_code: string
  benchmark_value: number
  industry?: string
}

export interface ParseResult<T> {
  data: T[]
  errors: string[]
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

/**
 * Parse a single CSV line handling quoted values correctly
 * Respects commas within quoted strings
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Parse complete CSV content into an array of string arrays
 * Filters out empty lines
 */
export function parseCSV(csvContent: string): string[][] {
  if (!csvContent || typeof csvContent !== 'string') {
    return []
  }

  const lines = csvContent.split('\n')
  const rows: string[][] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine) {
      const values = parseCSVLine(trimmedLine).map(v => v.replace(/^"|"$/g, '').trim())
      rows.push(values)
    }
  }
  
  return rows
}

/**
 * Validate that required columns exist in headers
 */
export function validateColumns(
  headers: string[],
  requiredColumns: string[]
): { valid: boolean; missing: string[] } {
  if (!headers || headers.length === 0) {
    return { valid: false, missing: requiredColumns }
  }

  const headerLower = headers.map(h => h.toLowerCase().trim())
  const missing: string[] = []
  
  for (const required of requiredColumns) {
    const requiredLower = required.toLowerCase()
    if (!headerLower.includes(requiredLower)) {
      missing.push(required)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Validate that a value is a valid number
 */
export function validateNumber(value: string | number): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value)
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.trim())
    return !isNaN(num) && isFinite(num)
  }
  return false
}

/**
 * Parse user bulk upload spreadsheet
 */
export function parseUserSpreadsheet(csvContent: string): ParseResult<UserRow> {
  const rows = parseCSV(csvContent)
  const errors: string[] = []
  const data: UserRow[] = []
  
  if (rows.length === 0) {
    errors.push('CSV file is empty')
    return { data, errors }
  }
  
  // Validate headers
  const headers = rows[0]
  const requiredColumns = ['name', 'email', 'industry']
  const validation = validateColumns(headers, requiredColumns)
  
  if (!validation.valid) {
    errors.push(`Missing required columns: ${validation.missing.join(', ')}`)
    return { data, errors }
  }
  
  // Map column indices
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.toLowerCase().trim()] = index
  })
  
  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    
    if (row.length === 0 || row.every(cell => !cell)) {
      continue // Skip empty rows
    }
    
    const name = row[headerMap['name']] || ''
    const email = row[headerMap['email']] || ''
    const username = row[headerMap['username']] || ''
    const industry = row[headerMap['industry']] || ''
    const client_name = row[headerMap['client name'] || headerMap['client_name']] || ''
    
    // Validate required fields
    if (!name) {
      errors.push(`Row ${rowNum}: Name is required`)
      continue
    }
    
    if (!email) {
      errors.push(`Row ${rowNum}: Email is required`)
      continue
    }
    
    if (!validateEmail(email)) {
      errors.push(`Row ${rowNum}: Invalid email format '${email}'`)
      continue
    }
    
    if (!industry) {
      errors.push(`Row ${rowNum}: Industry is required`)
      continue
    }
    
    // Generate username if not provided
    const finalUsername = username || name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20)
    
    data.push({
      name,
      email,
      username: finalUsername,
      industry,
      client_name: client_name || undefined
    })
  }
  
  return { data, errors }
}

/**
 * Parse group bulk upload spreadsheet
 */
export function parseGroupSpreadsheet(csvContent: string): ParseResult<GroupRow> {
  const rows = parseCSV(csvContent)
  const errors: string[] = []
  const data: GroupRow[] = []
  
  if (rows.length === 0) {
    errors.push('CSV file is empty')
    return { data, errors }
  }
  
  // Validate headers
  const headers = rows[0]
  const requiredColumns = ['name']
  const validation = validateColumns(headers, requiredColumns)
  
  if (!validation.valid) {
    errors.push(`Missing required columns: ${validation.missing.join(', ')}`)
    return { data, errors }
  }
  
  // Map column indices
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.toLowerCase().trim()] = index
  })
  
  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    
    if (row.length === 0 || row.every(cell => !cell)) {
      continue // Skip empty rows
    }
    
    const name = row[headerMap['name']] || ''
    const description = row[headerMap['description']] || ''
    const client_name = row[headerMap['client name'] || headerMap['client_name']] || ''
    
    // Validate required fields
    if (!name) {
      errors.push(`Row ${rowNum}: Name is required`)
      continue
    }
    
    data.push({
      name,
      description: description || undefined,
      client_name: client_name || undefined
    })
  }
  
  return { data, errors }
}

/**
 * Parse benchmark bulk upload spreadsheet
 */
export function parseBenchmarkSpreadsheet(csvContent: string): ParseResult<BenchmarkRow> {
  const rows = parseCSV(csvContent)
  const errors: string[] = []
  const data: BenchmarkRow[] = []
  
  if (rows.length === 0) {
    errors.push('CSV file is empty')
    return { data, errors }
  }
  
  // Normalize headers (replace spaces with underscores)
  const headers = rows[0]
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, '_'))
  
  // Validate headers
  const requiredColumns = ['dimension_name', 'dimension_code', 'benchmark_value']
  const validation = validateColumns(normalizedHeaders, requiredColumns)
  
  if (!validation.valid) {
    errors.push(`Missing required columns: ${validation.missing.join(', ')}`)
    return { data, errors }
  }
  
  // Map column indices
  const headerMap: Record<string, number> = {}
  normalizedHeaders.forEach((header, index) => {
    headerMap[header] = index
  })
  
  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    
    if (row.length === 0 || row.every(cell => !cell)) {
      continue // Skip empty rows
    }
    
    const dimension_name = row[headerMap['dimension_name']] || ''
    const dimension_code = row[headerMap['dimension_code']] || ''
    const benchmark_value_str = row[headerMap['benchmark_value']] || ''
    const industry = row[headerMap['industry']] || ''
    
    // Validate required fields
    if (!dimension_name) {
      errors.push(`Row ${rowNum}: Dimension name is required`)
      continue
    }
    
    if (!dimension_code) {
      errors.push(`Row ${rowNum}: Dimension code is required`)
      continue
    }
    
    if (!benchmark_value_str) {
      errors.push(`Row ${rowNum}: Benchmark value is required`)
      continue
    }
    
    if (!validateNumber(benchmark_value_str)) {
      errors.push(`Row ${rowNum}: Benchmark value must be a valid number, got '${benchmark_value_str}'`)
      continue
    }
    
    const benchmark_value = parseFloat(benchmark_value_str)
    
    data.push({
      dimension_name,
      dimension_code,
      benchmark_value,
      industry: industry || undefined
    })
  }
  
  return { data, errors }
}
