import { describe, it, expect } from 'vitest'
import {
  parseCSVLine,
  parseCSV,
  validateColumns,
  validateEmail,
  validateNumber,
  parseUserSpreadsheet,
  parseGroupSpreadsheet,
  parseBenchmarkSpreadsheet,
} from '../spreadsheet-parsing'

describe('parseCSVLine', () => {
  it('should parse simple CSV line', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('should parse CSV line with quoted values', () => {
    expect(parseCSVLine('"a","b","c"')).toEqual(['a', 'b', 'c'])
  })

  it('should handle commas within quotes', () => {
    expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })

  it('should handle multiple commas within quotes', () => {
    expect(parseCSVLine('"a,b","c,d,e",f')).toEqual(['a,b', 'c,d,e', 'f'])
  })

  it('should trim whitespace from values', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('should handle empty values', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })

  it('should handle single value', () => {
    expect(parseCSVLine('single')).toEqual(['single'])
  })

  it('should handle empty string', () => {
    expect(parseCSVLine('')).toEqual([''])
  })

  it('should handle line with only commas', () => {
    expect(parseCSVLine(',,,,')).toEqual(['', '', '', '', ''])
  })

  it('should handle quotes at beginning and end', () => {
    expect(parseCSVLine('"start",middle,"end"')).toEqual(['start', 'middle', 'end'])
  })

  it('should handle nested quotes', () => {
    expect(parseCSVLine('a,"b""c",d')).toEqual(['a', 'bc', 'd'])
  })
})

describe('parseCSV', () => {
  it('should parse multiple CSV rows', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6'
    const result = parseCSV(csv)
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6']
    ])
  })

  it('should filter out empty lines', () => {
    const csv = 'a,b,c\n\n1,2,3\n\n\n4,5,6\n'
    const result = parseCSV(csv)
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6']
    ])
  })

  it('should remove quotes from values', () => {
    const csv = '"a","b","c"\n"1","2","3"'
    const result = parseCSV(csv)
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3']
    ])
  })

  it('should handle CSV with quoted commas', () => {
    const csv = 'name,value\n"Smith, John","1,000"'
    const result = parseCSV(csv)
    expect(result).toEqual([
      ['name', 'value'],
      ['Smith, John', '1,000']
    ])
  })

  it('should handle empty CSV', () => {
    expect(parseCSV('')).toEqual([])
  })

  it('should handle single row CSV', () => {
    const csv = 'a,b,c'
    const result = parseCSV(csv)
    expect(result).toEqual([['a', 'b', 'c']])
  })

  it('should handle CSV with only headers', () => {
    const csv = 'Name,Email,Industry'
    const result = parseCSV(csv)
    expect(result).toEqual([['Name', 'Email', 'Industry']])
  })

  it('should handle whitespace-only lines', () => {
    const csv = 'a,b,c\n   \n1,2,3\n\t\t\n4,5,6'
    const result = parseCSV(csv)
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6']
    ])
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(parseCSV(null)).toEqual([])
    // @ts-expect-error - Testing invalid input
    expect(parseCSV(undefined)).toEqual([])
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(parseCSV(123)).toEqual([])
    // @ts-expect-error - Testing invalid input
    expect(parseCSV({})).toEqual([])
  })
})

describe('validateColumns', () => {
  it('should validate all required columns are present', () => {
    const headers = ['Name', 'Email', 'Industry']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('should be case-insensitive', () => {
    const headers = ['NAME', 'EMAIL', 'INDUSTRY']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(true)
  })

  it('should detect missing columns', () => {
    const headers = ['Name', 'Email']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(false)
    expect(result.missing).toEqual(['industry'])
  })

  it('should detect multiple missing columns', () => {
    const headers = ['Name']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(false)
    expect(result.missing).toEqual(['email', 'industry'])
  })

  it('should allow extra columns', () => {
    const headers = ['Name', 'Email', 'Industry', 'Phone', 'Address']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(true)
  })

  it('should handle empty headers array', () => {
    const headers: string[] = []
    const required = ['name', 'email']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(false)
    expect(result.missing).toEqual(['name', 'email'])
  })

  it('should handle empty required columns', () => {
    const headers = ['Name', 'Email']
    const required: string[] = []
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('should trim whitespace from headers', () => {
    const headers = ['  Name  ', '  Email  ', '  Industry  ']
    const required = ['name', 'email', 'industry']
    const result = validateColumns(headers, required)
    expect(result.valid).toBe(true)
  })

  it('should handle null or undefined headers gracefully', () => {
    const required = ['name', 'email']
    // @ts-expect-error - Testing invalid input
    let result = validateColumns(null, required)
    expect(result.valid).toBe(false)
    // @ts-expect-error - Testing invalid input
    result = validateColumns(undefined, required)
    expect(result.valid).toBe(false)
  })
})

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('john.doe@company.co.uk')).toBe(true)
    expect(validateEmail('test+tag@domain.com')).toBe(true)
    expect(validateEmail('user123@test-domain.org')).toBe(true)
  })

  it('should reject invalid email addresses', () => {
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('missing@domain')).toBe(false)
    expect(validateEmail('@nodomain.com')).toBe(false)
    expect(validateEmail('noatsign.com')).toBe(false)
    expect(validateEmail('spaces in@email.com')).toBe(false)
  })

  it('should handle empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('should trim whitespace before validating', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true)
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateEmail(null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateEmail(undefined)).toBe(false)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateEmail(123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateEmail({})).toBe(false)
  })
})

describe('validateNumber', () => {
  it('should validate numeric values', () => {
    expect(validateNumber(123)).toBe(true)
    expect(validateNumber(0)).toBe(true)
    expect(validateNumber(-456)).toBe(true)
    expect(validateNumber(3.14)).toBe(true)
  })

  it('should validate numeric strings', () => {
    expect(validateNumber('123')).toBe(true)
    expect(validateNumber('0')).toBe(true)
    expect(validateNumber('-456')).toBe(true)
    expect(validateNumber('3.14')).toBe(true)
  })

  it('should reject non-numeric strings', () => {
    expect(validateNumber('abc')).toBe(false)
    expect(validateNumber('abc12')).toBe(false)
  })

  it('should handle partial numeric strings', () => {
    // parseFloat will parse the numeric part
    expect(validateNumber('12abc')).toBe(true) // parseFloat('12abc') = 12
  })

  it('should reject NaN', () => {
    expect(validateNumber(NaN)).toBe(false)
  })

  it('should reject Infinity', () => {
    expect(validateNumber(Infinity)).toBe(false)
    expect(validateNumber(-Infinity)).toBe(false)
  })

  it('should handle empty string', () => {
    expect(validateNumber('')).toBe(false)
  })

  it('should trim whitespace before validating', () => {
    expect(validateNumber('  123  ')).toBe(true)
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateNumber(null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateNumber(undefined)).toBe(false)
  })
})

describe('parseUserSpreadsheet', () => {
  it('should parse valid user CSV', () => {
    const csv = 'Name,Email,Username,Industry,Client Name\nJohn Doe,john@example.com,johndoe,Technology,Acme Corp'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data).toEqual([{
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      industry: 'Technology',
      client_name: 'Acme Corp'
    }])
  })

  it('should parse multiple users', () => {
    const csv = `Name,Email,Username,Industry
John Doe,john@example.com,johndoe,Technology
Jane Smith,jane@example.com,janesmith,Healthcare
Bob Johnson,bob@example.com,bobjohnson,Finance`
    const result = parseUserSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(3)
  })

  it('should generate username if not provided', () => {
    const csv = 'Name,Email,Username,Industry\nJohn Doe,john@example.com,,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data[0].username).toBe('johndoe')
  })

  it('should validate email format', () => {
    const csv = 'Name,Email,Username,Industry\nJohn Doe,invalid-email,johndoe,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Invalid email format')
    expect(result.data).toEqual([])
  })

  it('should require name field', () => {
    const csv = 'Name,Email,Username,Industry\n,john@example.com,johndoe,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Name is required')
  })

  it('should require email field', () => {
    const csv = 'Name,Email,Username,Industry\nJohn Doe,,johndoe,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Email is required')
  })

  it('should require industry field', () => {
    const csv = 'Name,Email,Username,Industry\nJohn Doe,john@example.com,johndoe,'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Industry is required')
  })

  it('should handle optional client_name field', () => {
    const csv = 'Name,Email,Username,Industry\nJohn Doe,john@example.com,johndoe,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data[0].client_name).toBeUndefined()
  })

  it('should skip empty rows', () => {
    const csv = `Name,Email,Username,Industry
John Doe,john@example.com,johndoe,Technology

Jane Smith,jane@example.com,janesmith,Healthcare`
    const result = parseUserSpreadsheet(csv)
    expect(result.data.length).toBe(2)
  })

  it('should handle empty CSV', () => {
    const result = parseUserSpreadsheet('')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('CSV file is empty')
  })

  it('should detect missing required columns', () => {
    const csv = 'Name,Email\nJohn Doe,john@example.com'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Missing required columns')
    expect(result.errors[0]).toContain('industry')
  })

  it('should handle case-insensitive column headers', () => {
    const csv = 'NAME,EMAIL,USERNAME,INDUSTRY\nJohn Doe,john@example.com,johndoe,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(1)
  })

  it('should handle client name with space or underscore', () => {
    const csv1 = 'Name,Email,Username,Industry,Client Name\nJohn Doe,john@example.com,johndoe,Technology,Acme'
    const result1 = parseUserSpreadsheet(csv1)
    expect(result1.data[0].client_name).toBe('Acme')

    const csv2 = 'Name,Email,Username,Industry,client_name\nJohn Doe,john@example.com,johndoe,Technology,Acme'
    const result2 = parseUserSpreadsheet(csv2)
    expect(result2.data[0].client_name).toBe('Acme')
  })

  it('should truncate generated username to 20 characters', () => {
    const csv = 'Name,Email,Username,Industry\nVery Long Name That Exceeds Twenty Characters,user@example.com,,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.data[0].username.length).toBeLessThanOrEqual(20)
  })

  it('should remove special characters from generated username', () => {
    const csv = 'Name,Email,Username,Industry\nJohn-Doe_123!@#,user@example.com,,Technology'
    const result = parseUserSpreadsheet(csv)
    expect(result.data[0].username).toMatch(/^[a-z0-9]+$/)
  })
})

describe('parseGroupSpreadsheet', () => {
  it('should parse valid group CSV', () => {
    const csv = 'Name,Description,Client Name\nEngineering Team,Development group,Acme Corp'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data).toEqual([{
      name: 'Engineering Team',
      description: 'Development group',
      client_name: 'Acme Corp'
    }])
  })

  it('should parse multiple groups', () => {
    const csv = `Name,Description
Engineering,Dev team
Marketing,Marketing team
Sales,Sales team`
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(3)
  })

  it('should require name field', () => {
    const csv = 'Name,Description\n,Some description'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Name is required')
  })

  it('should handle optional description field', () => {
    const csv = 'Name,Description\nEngineering Team,'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data[0].description).toBeUndefined()
  })

  it('should handle optional client_name field', () => {
    const csv = 'Name\nEngineering Team'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data[0].client_name).toBeUndefined()
  })

  it('should skip empty rows', () => {
    const csv = `Name,Description
Engineering,Dev team

Marketing,Marketing team`
    const result = parseGroupSpreadsheet(csv)
    expect(result.data.length).toBe(2)
  })

  it('should handle empty CSV', () => {
    const result = parseGroupSpreadsheet('')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('CSV file is empty')
  })

  it('should detect missing required columns', () => {
    const csv = 'Description\nSome description'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Missing required columns')
    expect(result.errors[0]).toContain('name')
  })

  it('should handle case-insensitive column headers', () => {
    const csv = 'NAME,DESCRIPTION\nEngineering,Dev team'
    const result = parseGroupSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(1)
  })

  it('should handle client name with space or underscore', () => {
    const csv1 = 'Name,Description,Client Name\nEngineering,Dev,Acme'
    const result1 = parseGroupSpreadsheet(csv1)
    expect(result1.data[0].client_name).toBe('Acme')

    const csv2 = 'Name,Description,client_name\nEngineering,Dev,Acme'
    const result2 = parseGroupSpreadsheet(csv2)
    expect(result2.data[0].client_name).toBe('Acme')
  })
})

describe('parseBenchmarkSpreadsheet', () => {
  it('should parse valid benchmark CSV', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value,Industry\nLeadership,LEAD,85.5,Technology'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data).toEqual([{
      dimension_name: 'Leadership',
      dimension_code: 'LEAD',
      benchmark_value: 85.5,
      industry: 'Technology'
    }])
  })

  it('should parse multiple benchmarks', () => {
    const csv = `Dimension_Name,Dimension_Code,Benchmark_Value
Leadership,LEAD,85.5
Communication,COMM,78.2
Innovation,INNO,92.0`
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(3)
  })

  it('should require dimension_name field', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\n,LEAD,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Dimension name is required')
  })

  it('should require dimension_code field', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Dimension code is required')
  })

  it('should require benchmark_value field', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Benchmark value is required')
  })

  it('should validate benchmark_value is a number', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,not-a-number'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('must be a valid number')
  })

  it('should handle optional industry field', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data[0].industry).toBeUndefined()
  })

  it('should skip empty rows', () => {
    const csv = `Dimension_Name,Dimension_Code,Benchmark_Value
Leadership,LEAD,85.5

Communication,COMM,78.2`
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.data.length).toBe(2)
  })

  it('should handle empty CSV', () => {
    const result = parseBenchmarkSpreadsheet('')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('CSV file is empty')
  })

  it('should detect missing required columns', () => {
    const csv = 'Dimension_Name,Dimension_Code\nLeadership,LEAD'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Missing required columns')
    expect(result.errors[0]).toContain('benchmark_value')
  })

  it('should handle case-insensitive column headers', () => {
    const csv = 'DIMENSION_NAME,DIMENSION_CODE,BENCHMARK_VALUE\nLeadership,LEAD,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(1)
  })

  it('should handle column headers with underscores', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(1)
  })

  it('should normalize column headers with spaces to underscores', () => {
    const csv = 'Dimension Name,Dimension Code,Benchmark Value\nLeadership,LEAD,85.5'
    const result = parseBenchmarkSpreadsheet(csv)
    // The function requires exact matches with underscores
    // This test should show that space-separated headers work
    expect(result.errors).toEqual([])
    expect(result.data.length).toBe(1)
  })

  it('should parse integer benchmark values', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,85'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.data[0].benchmark_value).toBe(85)
  })

  it('should parse decimal benchmark values', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,85.75'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.data[0].benchmark_value).toBe(85.75)
  })

  it('should parse negative benchmark values', () => {
    const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,-10.5'
    const result = parseBenchmarkSpreadsheet(csv)
    expect(result.data[0].benchmark_value).toBe(-10.5)
  })
})

describe('Malformed data and edge cases', () => {
  describe('parseUserSpreadsheet - malformed data', () => {
    it('should handle rows with too few columns', () => {
      const csv = 'Name,Email,Username,Industry\nJohn Doe,john@example.com'
      const result = parseUserSpreadsheet(csv)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle multiple errors in different rows', () => {
      const csv = `Name,Email,Username,Industry
,john@example.com,johndoe,Technology
Jane Smith,,janesmith,Healthcare
Bob Johnson,invalid-email,bobjohnson,Finance`
      const result = parseUserSpreadsheet(csv)
      expect(result.errors.length).toBe(3)
      expect(result.data.length).toBe(0)
    })

    it('should continue parsing after errors', () => {
      const csv = `Name,Email,Username,Industry
,invalid@,johndoe,Technology
Jane Smith,jane@example.com,janesmith,Healthcare
Bob,bad-email,bobjohnson,Finance`
      const result = parseUserSpreadsheet(csv)
      expect(result.data.length).toBe(1)
      expect(result.data[0].name).toBe('Jane Smith')
    })
  })

  describe('parseGroupSpreadsheet - malformed data', () => {
    it('should handle rows with only whitespace in required fields', () => {
      const csv = 'Name,Description\n   ,Some description'
      const result = parseGroupSpreadsheet(csv)
      expect(result.errors.length).toBe(1)
      expect(result.errors[0]).toContain('Name is required')
    })
  })

  describe('parseBenchmarkSpreadsheet - malformed data', () => {
    it('should handle multiple validation errors in one row', () => {
      const csv = `Dimension_Name,Dimension_Code,Benchmark_Value
Leadership,,
,LEAD,
Leadership,LEAD,abc`
      const result = parseBenchmarkSpreadsheet(csv)
      expect(result.errors.length).toBe(3)
      expect(result.data.length).toBe(0)
    })

    it('should handle scientific notation', () => {
      const csv = 'Dimension_Name,Dimension_Code,Benchmark_Value\nLeadership,LEAD,1.5e2'
      const result = parseBenchmarkSpreadsheet(csv)
      expect(result.errors).toEqual([])
      expect(result.data[0].benchmark_value).toBe(150)
    })
  })
})
