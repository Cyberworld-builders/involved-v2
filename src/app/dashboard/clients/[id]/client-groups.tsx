'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/database'

type GroupRow = Database['public']['Tables']['groups']['Row']
type GroupMemberRow = Database['public']['Tables']['group_members']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type GroupInsert = Database['public']['Tables']['groups']['Insert']
type GroupUpdate = Database['public']['Tables']['groups']['Update']

interface GroupMember {
  id?: string
  profile_id: string
  position: string
  leader: boolean
  profile?: {
    id: string
    name: string
    email: string
    username?: string
  }
}

interface Group {
  id: string
  name: string
  description: string | null
  target_id: string | null
  target?: {
    id: string
    name: string
    email: string
  }
  created_at: string
  updated_at: string
  members?: GroupMember[]
}

interface ClientGroupsProps {
  clientId: string
}

export default function ClientGroups({ clientId }: ClientGroupsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [existingGroups, setExistingGroups] = useState<Group[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  type UserOption = { id: string; name: string; email: string; username?: string }
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([])
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '',
    target_id: ''
  })
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [showAddUsersModal, setShowAddUsersModal] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, username')
      .eq('client_id', clientId)
      .order('name')

    if (!error && data) {
      setAvailableUsers((data || []) as UserOption[])
    }
  }

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(
          id,
          profile_id,
          position,
          leader,
          profiles(id, name, email, username)
        )
      `)
      .eq('client_id', clientId)
      .order('name')

    if (!error && data) {
      // Load targets separately if target_id exists
      const targetIds = data.filter((g: GroupRow & { target_id?: string | null }) => g.target_id).map((g: GroupRow & { target_id?: string | null }) => g.target_id)
      type TargetProfile = { id: string; name: string; email: string }
      let targets: Record<string, TargetProfile> = {}
      
      if (targetIds.length > 0) {
        const { data: targetData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', targetIds)
        
        if (targetData) {
          targets = targetData.reduce((acc, t) => {
            acc[t.id] = t
            return acc
          }, {} as Record<string, TargetProfile>)
        }
      }

      const transformed = data.map((group: GroupRow & { target_id?: string | null; group_members?: Array<GroupMemberRow & { profiles?: Profile }> }) => ({
        ...group,
        target: group.target_id ? (targets[group.target_id] || null) : null,
        members: group.group_members?.map((gm: GroupMemberRow & { profiles?: Profile }) => ({
          id: gm.id,
          profile_id: gm.profile_id,
          position: gm.role || '',
          leader: false, // This field doesn't exist in the database schema
          profile: gm.profiles
        })) || []
      }))
      setExistingGroups(transformed as Group[])
    } else if (error) {
      console.error('Error loading groups:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      setMessage('Group name is required')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Create group - only include target_id if it's set
      const groupData: GroupInsert & { target_id?: string } = {
        client_id: clientId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      }
      
      if (formData.target_id && formData.target_id.trim()) {
        groupData.target_id = formData.target_id.trim()
      }
      
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert(groupData)
        .select('id')
        .single()

      if (groupError) {
        if (groupError.message.includes('duplicate') || groupError.message.includes('unique')) {
          throw new Error('A group with this name already exists for this client')
        }
        throw groupError
      }

      // Add members
      if (groupMembers.length > 0) {
        const membersToInsert = groupMembers.map(member => ({
          group_id: newGroup.id,
          profile_id: member.profile_id,
          position: member.position || '',
          leader: member.leader || false,
        }))

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      setMessage('Group created successfully!')
      setFormData({ name: '', description: '', target_id: '' })
      setGroupMembers([])
      setShowCreateForm(false)
      setTimeout(() => {
        loadGroups()
        setMessage('')
      }, 1500)
    } catch (error) {
      console.error('Error creating group:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group'
      setMessage(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup || !formData.name.trim()) {
      setMessage('Group name is required')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Update group - only include target_id if it's set
      const updateData: GroupUpdate & { target_id?: string | null } = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        updated_at: new Date().toISOString(),
      }
      
      if (formData.target_id && formData.target_id.trim()) {
        updateData.target_id = formData.target_id.trim()
      } else {
        updateData.target_id = null
      }
      
      const { error: groupError } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', editingGroup.id)

      if (groupError) {
        if (groupError.message.includes('duplicate') || groupError.message.includes('unique')) {
          throw new Error('A group with this name already exists for this client')
        }
        throw groupError
      }

      // Delete existing members
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', editingGroup.id)

      if (deleteError) throw deleteError

      // Insert updated members
      if (groupMembers.length > 0) {
        const membersToInsert = groupMembers.map(member => ({
          group_id: editingGroup.id,
          profile_id: member.profile_id,
          position: member.position || '',
          leader: member.leader || false,
        }))

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      setMessage('Group updated successfully!')
      setEditingGroup(null)
      setFormData({ name: '', description: '', target_id: '' })
      setGroupMembers([])
      setTimeout(() => {
        loadGroups()
        setMessage('')
      }, 1500)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete ${groupName}? This will also remove all members from the group.`)) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete group')
      }

      setMessage('Group deleted successfully!')
      setTimeout(() => {
        loadGroups()
        setMessage('')
      }, 1500)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete group')
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (group: Group) => {
    setEditingGroup(group)
    setFormData({ 
      name: group.name, 
      description: group.description || '',
      target_id: group.target_id || ''
    })
    setGroupMembers(group.members || [])
    setShowCreateForm(false)
  }

  const cancelEdit = () => {
    setEditingGroup(null)
    setFormData({ name: '', description: '', target_id: '' })
    setGroupMembers([])
  }

  const handleAddUsersFromModal = () => {
    const usersToAdd = availableUsers
      .filter(user => selectedUserIds.includes(user.id))
      .filter(user => !groupMembers.some(m => m.profile_id === user.id))
      .map(user => ({
        profile_id: user.id,
        position: '',
        leader: false,
        profile: user
      }))

    setGroupMembers([...groupMembers, ...usersToAdd])
    setSelectedUserIds([])
    setShowAddUsersModal(false)
  }

  const handleRemoveMember = (index: number) => {
    setGroupMembers(groupMembers.filter((_, i) => i !== index))
  }

  const handleUpdateMemberPosition = (index: number, position: string) => {
    const updated = [...groupMembers]
    updated[index].position = position
    setGroupMembers(updated)
  }

  const handleUpdateMemberLeader = (index: number, leader: boolean) => {
    const updated = [...groupMembers]
    updated[index].leader = leader
    setGroupMembers(updated)
  }

  const downloadTemplate = () => {
    const csvContent = [
      'Group Name,Target Name,Target Email,Name,Email,Role',
      '"Engineering Team","John Doe","john.doe@example.com","Jane Smith","jane.smith@example.com","Developer"',
      '"Engineering Team","John Doe","john.doe@example.com","Bob Johnson","bob.johnson@example.com","Manager"'
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

      const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const targetGroups = new Map<string, {
        target: { id: string; name: string; email: string }
        group_name: string
        users: Array<{ id: string; name: string; email: string; role: string }>
      }>()

      // Process rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Parse CSV with quoted values
        const values: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''))
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''))

        if (values.length < 6) continue

        const rowData: Record<string, string> = {}
        header.forEach((h, idx) => {
          rowData[h] = values[idx] || ''
        })

        const groupName = rowData['Group Name'] || ''
        const targetName = rowData['Target Name'] || ''
        const targetEmail = rowData['Target Email']?.trim() || ''
        const userName = rowData['Name'] || ''
        const userEmail = rowData['Email']?.trim() || ''
        const userRole = rowData['Role'] || ''

        if ((!userName && !userEmail) || (!targetName && !targetEmail)) continue

        // Find user
        const user = availableUsers.find(u => 
          u.email.toLowerCase() === userEmail.toLowerCase() || 
          u.name === userName
        )

        // Find target
        const target = availableUsers.find(u => 
          u.email.toLowerCase() === targetEmail.toLowerCase() || 
          u.name === targetName
        )

        if (user && target) {
          const targetKey = target.id
          
          if (!targetGroups.has(targetKey)) {
            const generatedGroupName = groupName || `${target.name} Rating Group`
            targetGroups.set(targetKey, {
              target,
              group_name: generatedGroupName,
              users: []
            })
          }

          targetGroups.get(targetKey)!.users.push({
            id: user.id,
            name: user.name,
            email: user.email,
            role: userRole
          })
        }
      }

      // Create groups
      const createdGroups = []
      for (const [targetId, groupData] of targetGroups) {
        const { data: newGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            client_id: clientId,
            name: groupData.group_name,
            description: `CSV imported group for ${groupData.target.name}`,
            target_id: targetId,
          })
          .select('id')
          .single()

        if (groupError) {
          console.error(`Failed to create group ${groupData.group_name}:`, groupError)
          continue
        }

        // Add members
        const membersToInsert = groupData.users.map(user => ({
          group_id: newGroup.id,
          profile_id: user.id,
          position: user.role || '',
          leader: false,
        }))

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(membersToInsert)

        if (membersError) {
          console.error(`Failed to add members to group ${groupData.group_name}:`, membersError)
        } else {
          createdGroups.push({
            id: newGroup.id,
            name: groupData.group_name,
            target_name: groupData.target.name,
            users_count: groupData.users.length
          })
        }
      }

      setMessage(`Successfully created ${createdGroups.length} groups!`)
      setShowImportModal(false)
      setTimeout(() => {
        loadGroups()
        router.refresh()
        setMessage('')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
          <p className="text-sm text-gray-600">Organize the users into logical groupings for this client.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={downloadTemplate}>
            📥 Download Template
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            📤 Import Groups
          </Button>
          <Button onClick={() => {
            setShowCreateForm(true)
            setEditingGroup(null)
            setFormData({ name: '', description: '', target_id: '' })
            setGroupMembers([])
          }}>
            + Create New Group
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('Successfully') || message.includes('created') || message.includes('updated') || message.includes('deleted')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingGroup) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</CardTitle>
            <CardDescription>
              {editingGroup ? `Edit the group ${editingGroup.name} for this client.` : 'Create a new grouping for this client\'s users.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter group name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="An optional description to describe what this group is about."
              />
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target
              </label>
              <select
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">None</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Specify an optional group target. This can be used to easily assign assessments where a user must rate someone other than themselves.
              </p>
            </div>

            {/* Add Users Button */}
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUserIds([])
                  setShowAddUsersModal(true)
                }}
              >
                + Add Users To This Group
              </Button>
            </div>

            {/* Group Members */}
            {groupMembers.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900">Users In Group</h4>
                {groupMembers.map((member, index) => {
                  const user = member.profile || availableUsers.find(u => u.id === member.profile_id)
                  if (!user) return null

                  return (
                    <div key={index} className="border rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900">{user.name}</h5>
                          <p className="text-xs text-gray-500">User ID: {user.username || user.id}</p>
                          <p className="text-xs text-gray-500">Email: {user.email}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Position In Group
                          </label>
                          <input
                            type="text"
                            value={member.position}
                            onChange={(e) => handleUpdateMemberPosition(index, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="e.g., Developer, Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Leadership Position?
                          </label>
                          <select
                            value={member.leader ? '1' : '0'}
                            onChange={(e) => handleUpdateMemberLeader(index, e.target.value === '1')}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
              <Button
                variant="outline"
                onClick={editingGroup ? cancelEdit : () => setShowCreateForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Users Modal */}
      {showAddUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Add Users</CardTitle>
                  <CardDescription>Select users to add to this group</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAddUsersModal(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <select
                  multiple
                  value={selectedUserIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value)
                    setSelectedUserIds(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-h-[200px]"
                  size={10}
                >
                  {availableUsers
                    .filter(user => !groupMembers.some(m => m.profile_id === user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Hold Ctrl (Cmd on Mac) to select multiple users
                </p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAddUsersFromModal} disabled={selectedUserIds.length === 0}>
                  Add Users
                </Button>
                <Button variant="outline" onClick={() => setShowAddUsersModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Import Groups</CardTitle>
                  <CardDescription>
                    Upload a CSV file of groups for faster entry. The first row in the CSV file will be counted as the header.
                    Please make sure you have <strong>Group Name</strong>, <strong>Target Name</strong>, <strong>Target Email</strong>, <strong>Name</strong>, <strong>Email</strong>, and <strong>Role</strong> as column headers in your first row.
                    Accepted file types: <strong>.csv</strong>
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
                  ✕
                </Button>
              </div>
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
                  {isProcessing ? 'Processing...' : '📤 Upload CSV File'}
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  📥 Download CSV Template
                </Button>
                <Button variant="outline" onClick={() => setShowImportModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Existing Groups List */}
      {existingGroups.length > 0 && !showCreateForm && !editingGroup && (
        <Card>
          <CardHeader>
            <CardTitle>Groups ({existingGroups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users In Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settings</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {existingGroups.map((group) => (
                    <tr key={group.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {group.target ? group.target.name : '---'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 space-y-1">
                          {group.members && group.members.length > 0 ? (
                            group.members.map((member) => {
                              const user = member.profile || availableUsers.find(u => u.id === member.profile_id)
                              if (!user) return null
                              return (
                                <div key={member.id || member.profile_id}>
                                  {user.name}
                                  {member.position && (
                                    <span className={member.position.toLowerCase() === 'self' ? 'text-green-600' : ''}>
                                      {' '}({member.position})
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <span>No users</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(group)}
                          className="mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {existingGroups.length === 0 && !showCreateForm && !editingGroup && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No groups created yet.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
