/**
 * Database Query Builders
 * 
 * This module provides reusable query builder functions for Supabase database operations.
 * These functions can be used across the application and are designed to be easily testable.
 * 
 * Related Issues:
 * - #18-22: Client CRUD operations
 * - #26-30: User CRUD operations
 * - #37-41: Group CRUD operations
 * - #53-57: Industry CRUD operations
 * - #59-63: Benchmark CRUD operations
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Type definitions
type Tables = Database['public']['Tables']
type ClientRow = Tables['clients']['Row']
type ClientInsert = Tables['clients']['Insert']
type ClientUpdate = Tables['clients']['Update']
type ProfileRow = Tables['profiles']['Row']
type ProfileInsert = Tables['profiles']['Insert']
type ProfileUpdate = Tables['profiles']['Update']
type GroupRow = Tables['groups']['Row']
type GroupInsert = Tables['groups']['Insert']
type GroupUpdate = Tables['groups']['Update']
type IndustryRow = Tables['industries']['Row']
type IndustryInsert = Tables['industries']['Insert']
type IndustryUpdate = Tables['industries']['Update']
type BenchmarkRow = Tables['benchmarks']['Row']
type BenchmarkInsert = Tables['benchmarks']['Insert']
type BenchmarkUpdate = Tables['benchmarks']['Update']

// Query result types
export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

export interface QueryListResult<T> {
  data: T[] | null
  error: Error | null
}

// Sorting and filtering options
export interface SortOptions {
  column: string
  ascending?: boolean
}

export interface FilterOptions {
  column: string
  value: unknown
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'
}

/**
 * CLIENT CRUD OPERATIONS
 */

/**
 * Fetch all clients with optional sorting
 */
export async function selectClients(
  supabase: SupabaseClient<Database>,
  sort?: SortOptions
): Promise<QueryListResult<ClientRow>> {
  try {
    let query = supabase.from('clients').select('*')

    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single client by ID
 */
export async function selectClientById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<ClientRow>> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Insert a new client
 */
export async function insertClient(
  supabase: SupabaseClient<Database>,
  clientData: ClientInsert
): Promise<QueryResult<ClientRow>> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Update a client by ID
 */
export async function updateClient(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: ClientUpdate
): Promise<QueryResult<ClientRow>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Delete a client by ID
 */
export async function deleteClient(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * USER/PROFILE CRUD OPERATIONS
 */

/**
 * Fetch all users with optional sorting and filtering
 */
export async function selectUsers(
  supabase: SupabaseClient<Database>,
  sort?: SortOptions,
  filters?: FilterOptions[]
): Promise<QueryListResult<ProfileRow>> {
  try {
    let query = supabase.from('profiles').select('*')

    // Apply filters
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        const operator = filter.operator || 'eq'
        switch (operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value)
            break
          case 'neq':
            query = query.neq(filter.column, filter.value)
            break
          case 'gt':
            query = query.gt(filter.column, filter.value)
            break
          case 'gte':
            query = query.gte(filter.column, filter.value)
            break
          case 'lt':
            query = query.lt(filter.column, filter.value)
            break
          case 'lte':
            query = query.lte(filter.column, filter.value)
            break
          case 'like':
            query = query.like(filter.column, filter.value as string)
            break
          case 'ilike':
            query = query.ilike(filter.column, filter.value as string)
            break
        }
      })
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single user by ID
 */
export async function selectUserById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<ProfileRow>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single user by email
 */
export async function selectUserByEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<QueryResult<ProfileRow>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Insert a new user profile
 */
export async function insertUser(
  supabase: SupabaseClient<Database>,
  userData: ProfileInsert
): Promise<QueryResult<ProfileRow>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(userData)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Update a user profile by ID
 */
export async function updateUser(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: ProfileUpdate
): Promise<QueryResult<ProfileRow>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Delete a user profile by ID
 */
export async function deleteUser(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * GROUP CRUD OPERATIONS
 */

/**
 * Fetch all groups with optional sorting and filtering
 */
export async function selectGroups(
  supabase: SupabaseClient<Database>,
  sort?: SortOptions,
  filters?: FilterOptions[]
): Promise<QueryListResult<GroupRow>> {
  try {
    let query = supabase.from('groups').select('*')

    // Apply filters
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        const operator = filter.operator || 'eq'
        switch (operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value)
            break
          case 'neq':
            query = query.neq(filter.column, filter.value)
            break
          case 'gt':
            query = query.gt(filter.column, filter.value)
            break
          case 'gte':
            query = query.gte(filter.column, filter.value)
            break
          case 'lt':
            query = query.lt(filter.column, filter.value)
            break
          case 'lte':
            query = query.lte(filter.column, filter.value)
            break
          case 'like':
            query = query.like(filter.column, filter.value as string)
            break
          case 'ilike':
            query = query.ilike(filter.column, filter.value as string)
            break
        }
      })
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single group by ID
 */
export async function selectGroupById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<GroupRow>> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Insert a new group
 */
export async function insertGroup(
  supabase: SupabaseClient<Database>,
  groupData: GroupInsert
): Promise<QueryResult<GroupRow>> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Update a group by ID
 */
export async function updateGroup(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: GroupUpdate
): Promise<QueryResult<GroupRow>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Delete a group by ID
 */
export async function deleteGroup(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase.from('groups').delete().eq('id', id)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * INDUSTRY CRUD OPERATIONS
 */

/**
 * Fetch all industries with optional sorting
 */
export async function selectIndustries(
  supabase: SupabaseClient<Database>,
  sort?: SortOptions
): Promise<QueryListResult<IndustryRow>> {
  try {
    let query = supabase.from('industries').select('*')

    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single industry by ID
 */
export async function selectIndustryById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<IndustryRow>> {
  try {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Insert a new industry
 */
export async function insertIndustry(
  supabase: SupabaseClient<Database>,
  industryData: IndustryInsert
): Promise<QueryResult<IndustryRow>> {
  try {
    const { data, error } = await supabase
      .from('industries')
      .insert(industryData)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Update an industry by ID
 */
export async function updateIndustry(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: IndustryUpdate
): Promise<QueryResult<IndustryRow>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('industries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Delete an industry by ID
 */
export async function deleteIndustry(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase.from('industries').delete().eq('id', id)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * BENCHMARK CRUD OPERATIONS
 */

/**
 * Fetch all benchmarks with optional sorting and filtering
 */
export async function selectBenchmarks(
  supabase: SupabaseClient<Database>,
  sort?: SortOptions,
  filters?: FilterOptions[]
): Promise<QueryListResult<BenchmarkRow>> {
  try {
    let query = supabase.from('benchmarks').select('*')

    // Apply filters
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        const operator = filter.operator || 'eq'
        switch (operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value)
            break
          case 'neq':
            query = query.neq(filter.column, filter.value)
            break
          case 'gt':
            query = query.gt(filter.column, filter.value)
            break
          case 'gte':
            query = query.gte(filter.column, filter.value)
            break
          case 'lt':
            query = query.lt(filter.column, filter.value)
            break
          case 'lte':
            query = query.lte(filter.column, filter.value)
            break
          case 'like':
            query = query.like(filter.column, filter.value as string)
            break
          case 'ilike':
            query = query.ilike(filter.column, filter.value as string)
            break
        }
      })
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Fetch a single benchmark by ID
 */
export async function selectBenchmarkById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<BenchmarkRow>> {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Insert a new benchmark
 */
export async function insertBenchmark(
  supabase: SupabaseClient<Database>,
  benchmarkData: BenchmarkInsert
): Promise<QueryResult<BenchmarkRow>> {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .insert(benchmarkData)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Update a benchmark by ID
 */
export async function updateBenchmark(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: BenchmarkUpdate
): Promise<QueryResult<BenchmarkRow>> {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('benchmarks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Delete a benchmark by ID
 */
export async function deleteBenchmark(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase.from('benchmarks').delete().eq('id', id)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}
