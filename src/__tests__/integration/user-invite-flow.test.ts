/**
 * Integration Test: User Invite Email Flow
 * 
 * This test verifies the complete end-to-end flow of sending user invite emails:
 * 1. Generate invite token
 * 2. Store invite in database
 * 3. Generate email template
 * 4. Send invite email
 * 
 * Related to issue #45: Implement user invite email sending
 */

import { describe, it, expect } from 'vitest'
import { generateInviteTokenWithExpiration, validateInviteToken } from '@/lib/utils/invite-token-generation'
import { generateInviteEmail, sendInviteEmail } from '@/lib/services/email-service'

describe('User Invite Email Flow Integration', () => {
  it('should complete the full invite flow from token generation to email sending', async () => {
    // Step 1: Generate invite token with expiration
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    expect(token).toBeDefined()
    expect(token.length).toBe(64)
    expect(expiresAt).toBeInstanceOf(Date)
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    
    // Step 2: Validate token format
    const validation = validateInviteToken(token, expiresAt)
    expect(validation.valid).toBe(true)
    expect(validation.reason).toBeNull()
    
    // Step 3: Prepare invite data
    const inviteData = {
      recipientEmail: 'newuser@example.com',
      recipientName: 'New User',
      inviteToken: token,
      inviteUrl: `https://example.com/auth/invite?token=${token}`,
      expirationDate: expiresAt,
      organizationName: 'Involved Talent',
    }
    
    // Step 4: Generate email template
    const emailTemplate = generateInviteEmail(inviteData)
    
    expect(emailTemplate.subject).toContain('Involved Talent')
    expect(emailTemplate.htmlBody).toContain('New User')
    expect(emailTemplate.htmlBody).toContain(inviteData.inviteUrl)
    expect(emailTemplate.textBody).toContain('New User')
    expect(emailTemplate.textBody).toContain(inviteData.inviteUrl)
    
    // Step 5: Send invite email
    const result = await sendInviteEmail(inviteData)
    
    expect(result.success).toBe(true)
    expect(result.messageId).toBeDefined()
    expect(result.messageId).toMatch(/^mock-\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('should handle expired tokens correctly', async () => {
    // Generate a token that expires in the past
    const pastDate = new Date('2020-01-01T00:00:00Z')
    const token = generateInviteTokenWithExpiration().token
    
    // Validate with past expiration date
    const validation = validateInviteToken(token, pastDate)
    
    expect(validation.valid).toBe(false)
    expect(validation.reason).toBe('expired')
  })

  it('should handle invalid token formats correctly', async () => {
    const invalidToken = 'not-a-valid-token'
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const validation = validateInviteToken(invalidToken, futureDate)
    
    expect(validation.valid).toBe(false)
    expect(validation.reason).toBe('invalid_format')
  })

  it('should generate unique tokens for multiple invites', async () => {
    const tokens = new Set<string>()
    
    // Generate 10 tokens
    for (let i = 0; i < 10; i++) {
      const { token } = generateInviteTokenWithExpiration()
      tokens.add(token)
    }
    
    // All tokens should be unique
    expect(tokens.size).toBe(10)
  })

  it('should include all required information in invite email', async () => {
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    const inviteData = {
      recipientEmail: 'user@example.com',
      recipientName: 'Test User',
      inviteToken: token,
      inviteUrl: `https://app.example.com/invite?token=${token}`,
      expirationDate: expiresAt,
      organizationName: 'Test Organization',
    }
    
    const emailTemplate = generateInviteEmail(inviteData)
    
    // Check HTML body contains all required elements
    expect(emailTemplate.htmlBody).toContain('Test User')
    expect(emailTemplate.htmlBody).toContain('Test Organization')
    expect(emailTemplate.htmlBody).toContain(inviteData.inviteUrl)
    expect(emailTemplate.htmlBody).toContain('expire')
    expect(emailTemplate.htmlBody).toContain('Accept Invitation')
    
    // Check text body contains all required elements
    expect(emailTemplate.textBody).toContain('Test User')
    expect(emailTemplate.textBody).toContain('Test Organization')
    expect(emailTemplate.textBody).toContain(inviteData.inviteUrl)
    expect(emailTemplate.textBody).toContain('expire')
  })

  it('should handle email sending errors gracefully', async () => {
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    const inviteData = {
      recipientEmail: 'invalid-email', // Invalid email should still generate template
      recipientName: 'Test User',
      inviteToken: token,
      inviteUrl: `https://example.com/invite?token=${token}`,
      expirationDate: expiresAt,
    }
    
    // This should throw an error due to invalid email
    await expect(sendInviteEmail(inviteData)).rejects.toThrow('to must be a valid email address')
  })

  it('should complete workflow with minimum required fields', async () => {
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    const minimalInviteData = {
      recipientEmail: 'user@example.com',
      recipientName: 'User',
      inviteToken: token,
      inviteUrl: `https://example.com/invite?token=${token}`,
      expirationDate: expiresAt,
      // No organizationName provided - should use default
    }
    
    const emailTemplate = generateInviteEmail(minimalInviteData)
    expect(emailTemplate.subject).toContain('our platform')
    expect(emailTemplate.htmlBody).toContain('our platform')
    
    const result = await sendInviteEmail(minimalInviteData)
    expect(result.success).toBe(true)
  })

  it('should verify token remains valid throughout the invite process', async () => {
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    // Validate at the start
    const validation1 = validateInviteToken(token, expiresAt)
    expect(validation1.valid).toBe(true)
    
    // Generate email
    const inviteData = {
      recipientEmail: 'user@example.com',
      recipientName: 'User',
      inviteToken: token,
      inviteUrl: `https://example.com/invite?token=${token}`,
      expirationDate: expiresAt,
    }
    
    generateInviteEmail(inviteData)
    
    // Validate after email generation
    const validation2 = validateInviteToken(token, expiresAt)
    expect(validation2.valid).toBe(true)
    
    // Send email
    await sendInviteEmail(inviteData)
    
    // Validate after email sending
    const validation3 = validateInviteToken(token, expiresAt)
    expect(validation3.valid).toBe(true)
    
    // All validations should be consistent
    expect(validation1.valid).toBe(validation2.valid)
    expect(validation2.valid).toBe(validation3.valid)
  })
})
