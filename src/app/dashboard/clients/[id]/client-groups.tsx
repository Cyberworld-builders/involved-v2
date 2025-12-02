'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GroupData {
  'Group Name': string
  'Target Name': string
  'Target Email': string
  Name: string
  Email: string
  Role: string
}

interface ParsedGroup {
  groupName: string
  targetName: string
  targetEmail: string
  members: Array<{
    name: string
    email: string
    role: string
  }>
}

interface ClientGroupsProps {
  clientId: string
}

export default function ClientGroups({ clientId }: ClientGroupsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [parsedGroups, setParsedGroups] = useState<ParsedGroup[]>([])
  const [existingGroups, setExistingGroups] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [clientId])

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .eq('client_id', clientId)
      .order('name')

    if (!error && data) {
      setExistingGroups(data)
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      '"Group Name","Target Name","Target Email",Name,Email,Role',
      '"Engineering Team","John Doe","john.doe@example.com","Jane Smith","jane.smith@example.com","member"',
      '"Engineering Team","John Doe","john.doe@example.com","Bob Johnson","bob.johnson@example.com","leader"'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'groups_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setMessage('')

    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid')
      }

      const groupsMap = new Map<string, ParsedGroup>()
      
      // Parse CSV - handle quoted values
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // Simple CSV parser that handles quoted values
        const values: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Push last value
        
        if (values.length < 6) continue // Skip incomplete rows
        
        const groupData: GroupData = {
          'Group Name': values[0]?.replace(/^"|"$/g, '') || '',
          'Target Name': values[1]?.replace(/^"|"$/g, '') || '',
          'Target Email': values[2]?.replace(/^"|"$/g, '') || '',
          Name: values[3]?.replace(/^"|"$/g, '') || '',
          Email: values[4]?.replace(/^"|"$/g, '') || '',
          Role: values[5]?.replace(/^"|"$/g, '') || 'member'
        }
        
        // Validate required fields
        if (!groupData['Group Name'] || !groupData.Name || !groupData.Email) {
          throw new Error(`Row ${i + 1}: Group Name, Name, and Email are required`)
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(groupData.Email)) {
          throw new Error(`Row ${i + 1}: Invalid email format for '${groupData.Email}'`)
        }
        
        const groupName = groupData['Group Name']
        if (!groupsMap.has(groupName)) {
          groupsMap.set(groupName, {
            groupName,
            targetName: groupData['Target Name'],
            targetEmail: groupData['Target Email'],
            members: []
          })
        }
        
        const group = groupsMap.get(groupName)!
        group.members.push({
          name: groupData.Name,
          email: groupData.Email,
          role: groupData.Role
        })
      }
      
      const groups = Array.from(groupsMap.values())
      setParsedGroups(groups)
      setMessage(`Successfully parsed ${groups.length} groups with ${groups.reduce((sum, g) => sum + g.members.length, 0)} total members. Review and click "Create Groups" to proceed.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  const createGroups = async () => {
    if (parsedGroups.length === 0) return

    setIsLoading(true)
    setMessage('')

    try {
      // Get all profiles for this client
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('client_id', clientId)

      if (profilesError) throw profilesError

      const profileMap = new Map(profiles?.map(p => [p.email.toLowerCase(), p.id]) || [])

      // Create groups and add members
      for (const groupData of parsedGroups) {
        // Create or get group
        let groupId: string

        const { data: existingGroup } = await supabase
          .from('groups')
          .select('id')
          .eq('client_id', clientId)
          .eq('name', groupData.groupName)
          .single()

        if (existingGroup) {
          groupId = existingGroup.id
        } else {
          const { data: newGroup, error: groupError } = await supabase
            .from('groups')
            .insert({
              client_id: clientId,
              name: groupData.groupName,
              description: groupData.targetName ? `Target: ${groupData.targetName} (${groupData.targetEmail})` : null
            })
            .select('id')
            .single()

          if (groupError) {
            console.error(`Failed to create group ${groupData.groupName}:`, groupError)
            continue
          }

          groupId = newGroup.id
        }

        // Add members to group
        for (const member of groupData.members) {
          const profileId = profileMap.get(member.email.toLowerCase())
          
          if (!profileId) {
            console.warn(`Profile not found for email: ${member.email}`)
            continue
          }

          const { error: memberError } = await supabase
            .from('group_members')
            .insert({
              group_id: groupId,
              profile_id: profileId,
              role: member.role || 'member'
            })

          if (memberError && !memberError.message.includes('duplicate')) {
            console.error(`Failed to add member ${member.email} to group ${groupData.groupName}:`, memberError)
          }
        }
      }

      setMessage(`Successfully created/updated ${parsedGroups.length} groups!`)
      setTimeout(() => {
        loadGroups()
        router.refresh()
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
          <p className="text-sm text-gray-600">Manage user groups for this client</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          Download Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Groups</CardTitle>
          <CardDescription>
            Upload a CSV file to create groups and assign members. Format: Group Name,Target Name,Target Email,Name,Email,Role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
            >
              {isProcessing ? 'Processing...' : 'Upload CSV File'}
            </Button>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${
              message.includes('Successfully') || message.includes('created')
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {parsedGroups.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">
                  Preview ({parsedGroups.length} groups)
                </p>
                <Button
                  onClick={createGroups}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : `Create ${parsedGroups.length} Groups`}
                </Button>
              </div>
              <div className="space-y-4">
                {parsedGroups.map((group, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{group.groupName}</h3>
                    {group.targetName && (
                      <p className="text-sm text-gray-600 mb-2">
                        Target: {group.targetName} ({group.targetEmail})
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mb-2">{group.members.length} members</p>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-sm text-gray-700 space-y-1">
                        {group.members.slice(0, 5).map((member, mIdx) => (
                          <li key={mIdx}>
                            {member.name} ({member.email}) - {member.role}
                          </li>
                        ))}
                        {group.members.length > 5 && (
                          <li className="text-gray-500">... and {group.members.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {existingGroups.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Groups</h3>
              <div className="space-y-2">
                {existingGroups.map((group) => (
                  <div key={group.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-sm text-gray-600">{group.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {group.group_members?.[0]?.count || 0} members
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

