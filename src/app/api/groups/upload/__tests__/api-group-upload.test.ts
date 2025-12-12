import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as uploadGroups } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('POST /api/groups/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create groups from valid CSV content', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock clients fetch
    const mockClients = [
      { id: 'client-1', name: 'Acme Corp' },
      { id: 'client-2', name: 'TechCo' },
    ]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const fromMockClients = vi.fn().mockReturnValue({
      select: selectMock,
    })

    // Mock groups insert
    const mockCreatedGroups = [
      { id: 'group-1', name: 'Engineering Team', client_id: 'client-1', description: 'Dev team' },
      { id: 'group-2', name: 'Sales Team', client_id: 'client-2', description: null },
    ]

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMockGroups = vi.fn().mockReturnValue({
      insert: insertMock,
    })

    // Set up the from mock to return different values based on table name
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'clients') return fromMockClients()
      if (table === 'groups') return fromMockGroups()
      return {}
    })

    const csvContent = 'Name,Description,Client Name\nEngineering Team,Dev team,Acme Corp\nSales Team,,TechCo'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.groups).toEqual(mockCreatedGroups)
    expect(data.count).toBe(2)
    expect(data.message).toContain('Successfully created 2 groups')
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const csvContent = 'Name,Client Name\nTest Group,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if csvContent is missing', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('CSV content is required')
  })

  it('should return 400 if csvContent is empty string', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent: '   ' }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('CSV content is required')
  })

  it('should return 400 if CSV is missing required columns', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const csvContent = 'Description\nSome description'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('CSV parsing failed')
    expect(data.details).toContain('Missing required columns: name')
  })

  it('should return 400 if CSV has no valid groups', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const csvContent = 'Name,Description,Client Name\n,Some description,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('CSV parsing failed')
  })

  it('should return 400 if client name is not provided', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock clients fetch
    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'client-1', name: 'Acme Corp' }],
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: selectMock,
    })

    const csvContent = 'Name,Description\nEngineering Team,Dev team'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details[0]).toContain('Client name is required')
  })

  it('should return 400 if client name does not match any existing client', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock clients fetch with different names
    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'client-1', name: 'Acme Corp' }],
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: selectMock,
    })

    const csvContent = 'Name,Description,Client Name\nEngineering Team,Dev team,NonExistentCorp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details[0]).toContain("Client 'NonExistentCorp' not found")
  })

  it('should handle case-insensitive client name matching', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockClients = [{ id: 'client-1', name: 'Acme Corp' }]
    const mockCreatedGroups = [{ id: 'group-1', name: 'Engineering Team', client_id: 'client-1' }]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = 'Name,Client Name\nEngineering Team,acme corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.count).toBe(1)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'client-1', name: 'Acme Corp' }],
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = 'Name,Client Name\nEngineering Team,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create groups')
  })

  it('should return 409 for duplicate group names', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'client-1', name: 'Acme Corp' }],
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = 'Name,Client Name\nExisting Group,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('already exist')
  })

  it('should handle multiple groups from different clients', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockClients = [
      { id: 'client-1', name: 'Acme Corp' },
      { id: 'client-2', name: 'TechCo' },
      { id: 'client-3', name: 'FinanceCorp' },
    ]

    const mockCreatedGroups = [
      { id: 'group-1', name: 'Engineering Team', client_id: 'client-1' },
      { id: 'group-2', name: 'Sales Team', client_id: 'client-2' },
      { id: 'group-3', name: 'Finance Team', client_id: 'client-3' },
    ]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = `Name,Client Name,Description
Engineering Team,Acme Corp,Development team
Sales Team,TechCo,Sales and marketing
Finance Team,FinanceCorp,Finance department`

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.count).toBe(3)
    expect(insertMock).toHaveBeenCalledWith([
      { name: 'Engineering Team', client_id: 'client-1', description: 'Development team' },
      { name: 'Sales Team', client_id: 'client-2', description: 'Sales and marketing' },
      { name: 'Finance Team', client_id: 'client-3', description: 'Finance department' },
    ])
  })

  it('should handle CSV with quoted values containing commas', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockClients = [{ id: 'client-1', name: 'Acme Corp' }]
    const mockCreatedGroups = [{ id: 'group-1', name: 'Engineering Team', client_id: 'client-1' }]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = 'Name,Description,Client Name\n"Engineering Team","Team for development, testing, and deployment",Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    await response.json()

    expect(response.status).toBe(201)
    expect(insertMock).toHaveBeenCalledWith([
      { 
        name: 'Engineering Team', 
        client_id: 'client-1', 
        description: 'Team for development, testing, and deployment' 
      },
    ])
  })

  it('should skip empty rows in CSV', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockClients = [{ id: 'client-1', name: 'Acme Corp' }]
    const mockCreatedGroups = [
      { id: 'group-1', name: 'Engineering Team', client_id: 'client-1' },
      { id: 'group-2', name: 'Sales Team', client_id: 'client-1' },
    ]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = `Name,Client Name
Engineering Team,Acme Corp

Sales Team,Acme Corp`

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.count).toBe(2)
  })

  it('should handle client_name column with underscore', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockClients = [{ id: 'client-1', name: 'Acme Corp' }]
    const mockCreatedGroups = [{ id: 'group-1', name: 'Engineering Team', client_id: 'client-1' }]

    const selectMock = vi.fn().mockResolvedValue({
      data: mockClients,
      error: null,
    })

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCreatedGroups,
        error: null,
      }),
    })

    const fromMock = vi.fn((table: string) => {
      if (table === 'clients') return { select: selectMock }
      if (table === 'groups') return { insert: insertMock }
      return {}
    })

    mockSupabaseClient.from = fromMock

    const csvContent = 'Name,client_name\nEngineering Team,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.count).toBe(1)
  })

  it('should return 500 if client fetch fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const selectMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    mockSupabaseClient.from.mockReturnValue({
      select: selectMock,
    })

    const csvContent = 'Name,Client Name\nEngineering Team,Acme Corp'

    const request = new NextRequest('http://localhost:3000/api/groups/upload', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    })

    const response = await uploadGroups(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch clients for mapping')
  })
})
