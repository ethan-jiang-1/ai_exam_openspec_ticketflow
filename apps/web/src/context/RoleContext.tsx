import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'ticketflow-role'
const VALID_ROLES = ['submitter', 'dispatcher', 'completer'] as const

export type Role = (typeof VALID_ROLES)[number]

interface RoleContextValue {
  role: Role | null
  setRole: (role: Role) => void
  clearRole: () => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

function readRoleFromStorage(): Role | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && VALID_ROLES.includes(stored as Role)) {
    return stored as Role
  }
  return null
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(readRoleFromStorage)

  const setRole = (r: Role) => {
    localStorage.setItem(STORAGE_KEY, r)
    setRoleState(r)
  }

  const clearRole = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRoleState(null)
  }

  useEffect(() => {
    const stored = readRoleFromStorage()
    if (stored) setRoleState(stored)
  }, [])

  return (
    <RoleContext value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
