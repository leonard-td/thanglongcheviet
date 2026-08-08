export type EmployeeRole = {
  id: string
  name: string
}

export type Employee = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  metadata: Record<string, unknown> | null
  blocked: boolean
  roles: EmployeeRole[]
  created_at: string
  updated_at: string
}

export type EmployeesResponse = {
  employees: Employee[]
  count: number
  limit: number
  offset: number
}

export type EmployeeResponse = {
  employee: Employee
}

export type RbacRolesResponse = {
  roles: EmployeeRole[]
  count: number
}
