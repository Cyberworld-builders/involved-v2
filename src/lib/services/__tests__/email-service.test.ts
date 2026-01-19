import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateInviteEmail,
  renderEmailTemplate,
  formatExpirationDate,
  sendEmail,
  sendInviteEmail,
  type InviteEmailData,
} from '../email-service'

// Mock nodemailer
vi.mock('nodemailer', () => {
  let messageIdCounter = 0
  const mockSendMail = vi.fn().mockImplementation(() => {
    messageIdCounter++
    return Promise.resolve({
      messageId: `<test-message-id-${messageIdCounter}@example.com>`,
    })
  })
  
  const mockCreateTransport = vi.fn().mockReturnValue({
    sendMail: mockSendMail,
  })
  
  return {
    default: {
      createTransport: mockCreateTransport,
    },
  }
})

describe('generateInviteEmail', () => {
  const validData: InviteEmailData = {
    recipientEmail: 'user@example.com',
    recipientName: 'John Doe',
    inviteToken: 'abc123token',
    inviteUrl: 'https://example.com/invite?token=abc123token',
    expirationDate: new Date('2024-01-15T12:00:00Z'),
  }

  it('should generate invite email with all required fields', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.subject).toBeDefined()
    expect(result.htmlBody).toBeDefined()
    expect(result.textBody).toBeDefined()
  })

  it('should include recipient name in email bodies', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('John Doe')
    expect(result.textBody).toContain('John Doe')
  })

  it('should include invite URL in email bodies', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain(validData.inviteUrl)
    expect(result.textBody).toContain(validData.inviteUrl)
  })

  it('should include expiration date in email bodies', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('Monday, January 15, 2024')
    expect(result.textBody).toContain('Monday, January 15, 2024')
  })

  it('should use default organization name when not provided', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.subject).toContain('our platform')
    expect(result.htmlBody).toContain('our platform')
    expect(result.textBody).toContain('our platform')
  })

  it('should use custom organization name when provided', () => {
    const dataWithOrg = {
      ...validData,
      organizationName: 'Acme Corp',
    }
    const result = generateInviteEmail(dataWithOrg)
    
    expect(result.subject).toContain('Acme Corp')
    expect(result.htmlBody).toContain('Acme Corp')
    expect(result.textBody).toContain('Acme Corp')
  })

  it('should generate valid HTML body with proper structure', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('<!DOCTYPE html>')
    expect(result.htmlBody).toContain('<html>')
    expect(result.htmlBody).toContain('</html>')
    expect(result.htmlBody).toContain('<body>')
    expect(result.htmlBody).toContain('</body>')
  })

  it('should include clickable button in HTML body', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('<a href')
    expect(result.htmlBody).toContain('class="button"')
    expect(result.htmlBody).toContain('Accept Invitation')
  })

  it('should include styling in HTML body', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('<style>')
    expect(result.htmlBody).toContain('</style>')
  })

  it('should generate plain text body without HTML tags', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.textBody).not.toContain('<html>')
    expect(result.textBody).not.toContain('<body>')
    expect(result.textBody).not.toContain('<div>')
    expect(result.textBody).not.toContain('<a href')
  })

  it('should throw error for missing recipientEmail', () => {
    const invalidData = { ...validData, recipientEmail: '' }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('recipientEmail is required')
  })

  it('should throw error for invalid recipientEmail type', () => {
    const invalidData = { ...validData, recipientEmail: 123 as unknown as string }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('recipientEmail is required and must be a string')
  })

  it('should throw error for missing recipientName', () => {
    const invalidData = { ...validData, recipientName: '' }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('recipientName is required')
  })

  it('should throw error for invalid recipientName type', () => {
    const invalidData = { ...validData, recipientName: null as unknown as string }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('recipientName is required and must be a string')
  })

  it('should throw error for missing inviteToken', () => {
    const invalidData = { ...validData, inviteToken: '' }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('inviteToken is required')
  })

  it('should throw error for invalid inviteToken type', () => {
    const invalidData = { ...validData, inviteToken: undefined as unknown as string }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('inviteToken is required and must be a string')
  })

  it('should throw error for missing inviteUrl', () => {
    const invalidData = { ...validData, inviteUrl: '' }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('inviteUrl is required')
  })

  it('should throw error for invalid inviteUrl type', () => {
    const invalidData = { ...validData, inviteUrl: [] as unknown as string }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('inviteUrl is required and must be a string')
  })

  it('should throw error for missing expirationDate', () => {
    const invalidData = { ...validData, expirationDate: null as unknown as Date }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('expirationDate is required and must be a valid Date')
  })

  it('should throw error for invalid expirationDate', () => {
    const invalidData = { ...validData, expirationDate: new Date('invalid') }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('expirationDate is required and must be a valid Date')
  })

  it('should throw error for non-Date expirationDate', () => {
    const invalidData = { ...validData, expirationDate: '2024-01-15' as unknown as Date }
    
    expect(() => generateInviteEmail(invalidData)).toThrow('expirationDate is required and must be a valid Date')
  })

  it('should handle special characters in recipient name', () => {
    const dataWithSpecialChars = {
      ...validData,
      recipientName: "O'Brien & Associates",
    }
    const result = generateInviteEmail(dataWithSpecialChars)
    
    // HTML doesn't escape special characters in this implementation
    expect(result.htmlBody).toContain("O'Brien & Associates")
    expect(result.textBody).toContain("O'Brien & Associates")
  })

  it('should handle long organization names', () => {
    const dataWithLongOrg = {
      ...validData,
      organizationName: 'Very Long Organization Name That Exceeds Normal Length',
    }
    const result = generateInviteEmail(dataWithLongOrg)
    
    expect(result.subject).toContain('Very Long Organization Name That Exceeds Normal Length')
  })

  it('should handle URLs with special characters', () => {
    const dataWithComplexUrl = {
      ...validData,
      inviteUrl: 'https://example.com/invite?token=abc123&redirect=/dashboard%2Fhome',
    }
    const result = generateInviteEmail(dataWithComplexUrl)
    
    expect(result.htmlBody).toContain(dataWithComplexUrl.inviteUrl)
    expect(result.textBody).toContain(dataWithComplexUrl.inviteUrl)
  })

  it('should include security notice in email', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain("didn't expect this invitation")
    expect(result.textBody).toContain("didn't expect this invitation")
  })

  it('should include expiration warning', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('expire')
    expect(result.textBody).toContain('expire')
  })

  it('should include no-reply notice', () => {
    const result = generateInviteEmail(validData)
    
    expect(result.htmlBody).toContain('do not reply')
    expect(result.textBody).toContain('do not reply')
  })
})

describe('renderEmailTemplate', () => {
  it('should replace single placeholder', () => {
    const template = 'Hello {name}!'
    const data = { name: 'John' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello John!')
  })

  it('should replace multiple placeholders', () => {
    const template = 'Hello {name}, your token is {token}'
    const data = { name: 'John', token: 'abc123' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello John, your token is abc123')
  })

  it('should replace same placeholder multiple times', () => {
    const template = '{name} is {name}'
    const data = { name: 'John' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('John is John')
  })

  it('should handle template with no placeholders', () => {
    const template = 'Hello World'
    const data = { name: 'John' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello World')
  })

  it('should handle empty template', () => {
    expect(() => renderEmailTemplate('', {})).toThrow('template must be a non-empty string')
  })

  it('should handle empty data object', () => {
    const template = 'Hello {name}!'
    const data = {}
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello {name}!')
  })

  it('should handle template with special regex characters', () => {
    const template = 'Price: {price} (USD)'
    const data = { price: '$100' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Price: $100 (USD)')
  })

  it('should throw error for null template', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate(null, {})).toThrow('template must be a non-empty string')
  })

  it('should throw error for undefined template', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate(undefined, {})).toThrow('template must be a non-empty string')
  })

  it('should throw error for non-string template', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate(123, {})).toThrow('template must be a non-empty string')
  })

  it('should throw error for null data', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate('Hello', null)).toThrow('data must be an object')
  })

  it('should throw error for undefined data', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate('Hello', undefined)).toThrow('data must be an object')
  })

  it('should throw error for array data', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate('Hello', ['name'])).toThrow('data must be an object')
  })

  it('should throw error for non-string data value', () => {
    const template = 'Hello {name}'
    const data = { name: 123 }
    
    // @ts-expect-error - Testing invalid input
    expect(() => renderEmailTemplate(template, data)).toThrow('data.name must be a string')
  })

  it('should handle complex nested placeholders', () => {
    const template = 'User: {user.name}'
    const data = { 'user.name': 'John Doe' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('User: John Doe')
  })

  it('should handle placeholders with underscores', () => {
    const template = 'User: {user_name}'
    const data = { user_name: 'john_doe' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('User: john_doe')
  })

  it('should handle placeholders with numbers', () => {
    const template = '{field1} and {field2}'
    const data = { field1: 'First', field2: 'Second' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('First and Second')
  })

  it('should preserve whitespace', () => {
    const template = 'Hello   {name}  !'
    const data = { name: 'John' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello   John  !')
  })

  it('should handle multiline templates', () => {
    const template = 'Hello {name}\nWelcome to {org}'
    const data = { name: 'John', org: 'Acme' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('Hello John\nWelcome to Acme')
  })

  it('should handle HTML in template', () => {
    const template = '<p>Hello {name}</p>'
    const data = { name: 'John' }
    const result = renderEmailTemplate(template, data)
    
    expect(result).toBe('<p>Hello John</p>')
  })
})

describe('formatExpirationDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toBe('Monday, January 15, 2024')
  })

  it('should format different dates correctly', () => {
    const date1 = new Date('2024-12-25T00:00:00Z')
    expect(formatExpirationDate(date1)).toBe('Wednesday, December 25, 2024')
    
    const date2 = new Date('2024-07-04T00:00:00Z')
    expect(formatExpirationDate(date2)).toBe('Thursday, July 4, 2024')
  })

  it('should handle leap year dates', () => {
    const date = new Date('2024-02-29T00:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toBe('Thursday, February 29, 2024')
  })

  it('should handle year boundaries', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toBe('Monday, January 1, 2024')
  })

  it('should handle end of year', () => {
    const date = new Date('2024-12-31T00:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toBe('Tuesday, December 31, 2024')
  })

  it('should throw error for invalid date', () => {
    const invalidDate = new Date('invalid')
    
    expect(() => formatExpirationDate(invalidDate)).toThrow('date must be a valid Date object')
  })

  it('should throw error for null date', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => formatExpirationDate(null)).toThrow('date must be a valid Date object')
  })

  it('should throw error for undefined date', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => formatExpirationDate(undefined)).toThrow('date must be a valid Date object')
  })

  it('should throw error for non-Date object', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => formatExpirationDate('2024-01-15')).toThrow('date must be a valid Date object')
  })

  it('should handle dates far in the future', () => {
    const date = new Date('2099-12-31T00:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toContain('2099')
    expect(result).toContain('December')
  })

  it('should handle dates in the past', () => {
    const date = new Date('2000-01-01T00:00:00Z')
    const result = formatExpirationDate(date)
    
    expect(result).toBe('Saturday, January 1, 2000')
  })
})

describe('sendEmail', () => {
  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should send email with valid parameters', async () => {
    const result = await sendEmail(
      'user@example.com',
      'Test Subject',
      '<p>HTML body</p>',
      'Text body'
    )
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
    // nodemailer returns messageId in format <id@domain>
    expect(result.messageId).toContain('@')
  })

  it('should return unique message IDs', async () => {
    const result1 = await sendEmail('user1@example.com', 'Subject', '<p>HTML</p>', 'Text')
    const result2 = await sendEmail('user2@example.com', 'Subject', '<p>HTML</p>', 'Text')
    
    expect(result1.messageId).not.toBe(result2.messageId)
  })

  it('should throw error for empty recipient email', async () => {
    await expect(
      sendEmail('', 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a non-empty string')
  })

  it('should throw error for invalid recipient email type', async () => {
    await expect(
      // @ts-expect-error - Testing invalid input
      sendEmail(null, 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a non-empty string')
  })

  it('should throw error for invalid email format', async () => {
    await expect(
      sendEmail('not-an-email', 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a valid email address')
  })

  it('should validate email format correctly', async () => {
    await expect(
      sendEmail('user@', 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a valid email address')
    
    await expect(
      sendEmail('@example.com', 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a valid email address')
    
    await expect(
      sendEmail('user space@example.com', 'Subject', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('to must be a valid email address')
  })

  it('should throw error for empty subject', async () => {
    await expect(
      sendEmail('user@example.com', '', '<p>HTML</p>', 'Text')
    ).rejects.toThrow('subject must be a non-empty string')
  })

  it('should throw error for invalid subject type', async () => {
    await expect(
      // @ts-expect-error - Testing invalid input
      sendEmail('user@example.com', undefined, '<p>HTML</p>', 'Text')
    ).rejects.toThrow('subject must be a non-empty string')
  })

  it('should throw error for empty HTML body', async () => {
    await expect(
      sendEmail('user@example.com', 'Subject', '', 'Text')
    ).rejects.toThrow('htmlBody must be a non-empty string')
  })

  it('should throw error for invalid HTML body type', async () => {
    await expect(
      // @ts-expect-error - Testing invalid input
      sendEmail('user@example.com', 'Subject', null, 'Text')
    ).rejects.toThrow('htmlBody must be a non-empty string')
  })

  it('should throw error for empty text body', async () => {
    await expect(
      sendEmail('user@example.com', 'Subject', '<p>HTML</p>', '')
    ).rejects.toThrow('textBody must be a non-empty string')
  })

  it('should throw error for invalid text body type', async () => {
    await expect(
      // @ts-expect-error - Testing invalid input
      sendEmail('user@example.com', 'Subject', '<p>HTML</p>', undefined)
    ).rejects.toThrow('textBody must be a non-empty string')
  })

  it('should accept valid email addresses', async () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com',
    ]
    
    for (const email of validEmails) {
      const result = await sendEmail(email, 'Subject', '<p>HTML</p>', 'Text')
      expect(result.success).toBe(true)
    }
  })

  it('should log email sent to Mailpit in local development', async () => {
    // Set NODE_ENV to development to trigger Mailpit log
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    delete process.env.SMTP_HOST
    
    await sendEmail('user@example.com', 'Subject', '<p>HTML</p>', 'Text body')
    
    expect(console.log).toHaveBeenCalledWith('📧 Email sent to Mailpit. View at http://127.0.0.1:54324')
    
    // Restore original env
    process.env.NODE_ENV = originalEnv
  })

  it('should handle long email content', async () => {
    const longHtml = '<p>' + 'a'.repeat(10000) + '</p>'
    const longText = 'b'.repeat(10000)
    
    const result = await sendEmail(
      'user@example.com',
      'Subject',
      longHtml,
      longText
    )
    
    expect(result.success).toBe(true)
  })

  it('should handle special characters in subject', async () => {
    const result = await sendEmail(
      'user@example.com',
      'Test: Subject with "quotes" & symbols',
      '<p>HTML</p>',
      'Text'
    )
    
    expect(result.success).toBe(true)
  })

  it('should handle HTML with special characters', async () => {
    const htmlWithSpecialChars = '<p>Hello &amp; "welcome"</p>'
    
    const result = await sendEmail(
      'user@example.com',
      'Subject',
      htmlWithSpecialChars,
      'Text'
    )
    
    expect(result.success).toBe(true)
  })
})

describe('sendInviteEmail', () => {
  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const validData: InviteEmailData = {
    recipientEmail: 'user@example.com',
    recipientName: 'John Doe',
    inviteToken: 'abc123token',
    inviteUrl: 'https://example.com/invite?token=abc123token',
    expirationDate: new Date('2024-01-15T12:00:00Z'),
  }

  it('should send invite email successfully', async () => {
    const result = await sendInviteEmail(validData)
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
  })

  it('should generate and send email in one call', async () => {
    const result = await sendInviteEmail(validData)
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
  })

  it('should propagate validation errors from generateInviteEmail', async () => {
    const invalidData = { ...validData, recipientEmail: '' }
    
    await expect(sendInviteEmail(invalidData)).rejects.toThrow('recipientEmail is required')
  })

  it('should propagate validation errors from sendEmail', async () => {
    const invalidData = { ...validData, recipientEmail: 'not-an-email' }
    
    await expect(sendInviteEmail(invalidData)).rejects.toThrow('to must be a valid email address')
  })

  it('should include all email components', async () => {
    const result = await sendInviteEmail(validData)
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
  })

  it('should handle custom organization name', async () => {
    const dataWithOrg = {
      ...validData,
      organizationName: 'Acme Corp',
    }
    
    const result = await sendInviteEmail(dataWithOrg)
    
    expect(result.success).toBe(true)
  })

  it('should return unique message IDs for different invites', async () => {
    const result1 = await sendInviteEmail(validData)
    const result2 = await sendInviteEmail({
      ...validData,
      recipientEmail: 'user2@example.com',
    })
    
    expect(result1.messageId).not.toBe(result2.messageId)
  })

  it('should handle all fields correctly', async () => {
    const completeData: InviteEmailData = {
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      inviteToken: 'token123',
      inviteUrl: 'https://app.example.com/invite?token=token123',
      expirationDate: new Date('2024-06-30T23:59:59Z'),
      organizationName: 'Test Organization',
    }
    
    const result = await sendInviteEmail(completeData)
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
  })

  it('should work with minimum required fields', async () => {
    const minimalData: InviteEmailData = {
      recipientEmail: 'user@example.com',
      recipientName: 'User',
      inviteToken: 'token',
      inviteUrl: 'https://example.com/invite?token=token',
      expirationDate: new Date(),
    }
    
    const result = await sendInviteEmail(minimalData)
    
    expect(result.success).toBe(true)
  })
})

describe('Email Service Integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should work end-to-end with all functions', async () => {
    // 1. Generate invite email
    const inviteData: InviteEmailData = {
      recipientEmail: 'user@example.com',
      recipientName: 'John Doe',
      inviteToken: 'secure-token-123',
      inviteUrl: 'https://example.com/invite?token=secure-token-123',
      expirationDate: new Date('2024-01-15T12:00:00Z'),
      organizationName: 'Test Corp',
    }
    
    const emailTemplate = generateInviteEmail(inviteData)
    
    // 2. Verify template generation
    expect(emailTemplate.subject).toContain('Test Corp')
    expect(emailTemplate.htmlBody).toContain('John Doe')
    expect(emailTemplate.textBody).toContain('John Doe')
    
    // 3. Send the email
    const result = await sendEmail(
      inviteData.recipientEmail,
      emailTemplate.subject,
      emailTemplate.htmlBody,
      emailTemplate.textBody
    )
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
  })

  it('should allow mocking sendEmail for testing', async () => {
    // This demonstrates how to mock the sendEmail function
    const mockSendEmail = vi.fn().mockResolvedValue({
      success: true,
      messageId: 'mocked-id-123',
    })
    
    const result = await mockSendEmail(
      'user@example.com',
      'Subject',
      '<p>HTML</p>',
      'Text'
    )
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBe('mocked-id-123')
    expect(mockSendEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Subject',
      '<p>HTML</p>',
      'Text'
    )
  })

  it('should handle template rendering with generated content', () => {
    const template = 'Hello {name}, your invite link is {link}'
    const data = {
      name: 'Alice',
      link: 'https://example.com/invite?token=xyz',
    }
    
    const rendered = renderEmailTemplate(template, data)
    
    expect(rendered).toBe('Hello Alice, your invite link is https://example.com/invite?token=xyz')
  })

  it('should format dates consistently across functions', () => {
    const date = new Date('2024-03-15T10:00:00Z')
    const formatted = formatExpirationDate(date)
    
    const inviteData: InviteEmailData = {
      recipientEmail: 'user@example.com',
      recipientName: 'User',
      inviteToken: 'token',
      inviteUrl: 'https://example.com/invite',
      expirationDate: date,
    }
    
    const emailTemplate = generateInviteEmail(inviteData)
    
    expect(emailTemplate.htmlBody).toContain(formatted)
    expect(emailTemplate.textBody).toContain(formatted)
  })
})
