'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS'

const roleDescriptions = {
  OWNER: 'Full system access, multi-shed management, all reports',
  MANAGER: 'Shift management, audits, tanks, POS, credit operations',
  ACCOUNTS: 'POS reconciliation, credit management, safe operations, reports'
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('')
  const router = useRouter()

  const handleLogin = () => {
    if (selectedRole) {
      localStorage.setItem('userRole', selectedRole)
      router.push('/')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-purple-700">
          Petrol Shed Management
        </CardTitle>
        <CardDescription>
          Select your role to access the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Role</label>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNER">
                <div className="flex items-center gap-2">
                  <span>Owner</span>
                  <Badge variant="secondary">Full Access</Badge>
                </div>
              </SelectItem>
              <SelectItem value="MANAGER">
                <div className="flex items-center gap-2">
                  <span>Manager</span>
                  <Badge variant="outline">Operations</Badge>
                </div>
              </SelectItem>
              <SelectItem value="ACCOUNTS">
                <div className="flex items-center gap-2">
                  <span>Accounts</span>
                  <Badge variant="outline">Finance</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedRole && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Role Permissions:</h4>
            <p className="text-sm text-gray-600">
              {roleDescriptions[selectedRole]}
            </p>
          </div>
        )}

        <Button 
          onClick={handleLogin} 
          disabled={!selectedRole}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Login
        </Button>

        <div className="text-center text-xs text-gray-500">
          Mock authentication - select any role to continue
        </div>
      </CardContent>
    </Card>
  )
}
