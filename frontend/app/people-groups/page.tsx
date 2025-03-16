"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SearchIcon,
  MoreHorizontal,
  PencilIcon,
  Trash2Icon,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Users,
  UserPlus2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  groups: string[]
  status: "active" | "inactive" | "pending"
  lastActive: string
  avatar?: string
  department?: string
}

interface Group {
  id: string
  name: string
  description: string
  permissions: string[]
  memberCount: number
}

export default function PeopleGroupsPage() {
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      groups: ["Admin"],
      status: "active",
      lastActive: "Just now",
      department: "Engineering",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      groups: ["Manager"],
      status: "active",
      lastActive: "5 minutes ago",
      department: "Marketing",
    },
    {
      id: "3",
      name: "Robert Johnson",
      email: "robert.johnson@example.com",
      groups: ["Viewer"],
      status: "inactive",
      lastActive: "2 days ago",
      department: "Sales",
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily.davis@example.com",
      groups: ["Manager", "Data Analyst"],
      status: "active",
      lastActive: "1 hour ago",
      department: "Product",
    },
    {
      id: "5",
      name: "Michael Wilson",
      email: "michael.wilson@example.com",
      groups: ["Viewer"],
      status: "pending",
      lastActive: "Never",
      department: "Finance",
    },
    {
      id: "6",
      name: "Sarah Brown",
      email: "sarah.brown@example.com",
      groups: ["Viewer", "Support"],
      status: "active",
      lastActive: "3 hours ago",
      department: "Customer Support",
    },
  ])

  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Admin",
      description: "Full access to all features and settings",
      permissions: ["manage_users", "manage_data", "manage_settings", "view_analytics"],
      memberCount: 1,
    },
    {
      id: "2",
      name: "Manager",
      description: "Can manage content and view analytics",
      permissions: ["manage_content", "view_analytics"],
      memberCount: 2,
    },
    {
      id: "3",
      name: "Viewer",
      description: "Read-only access to dashboards and content",
      permissions: ["view_dashboards", "view_content"],
      memberCount: 3,
    },
    {
      id: "4",
      name: "Data Analyst",
      description: "Can access and analyze data sources",
      permissions: ["view_data", "analyze_data"],
      memberCount: 1,
    },
    {
      id: "5",
      name: "Support",
      description: "Access to support tools and customer data",
      permissions: ["view_customers", "manage_support_tickets"],
      memberCount: 1,
    },
  ])

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false)
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false)
  const [isAssignGroupDialogOpen, setIsAssignGroupDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    groups: [] as string[],
    department: "",
  })
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const filteredUsers = users.filter((user) => {
    // Filter by search query
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.groups.some((group) => group.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  const filteredGroups = groups.filter((group) => {
    // Filter by search query
    return (
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      })
      return
    }

    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      groups: newUser.groups,
      status: "pending",
      lastActive: "Never",
      department: newUser.department,
    }

    setUsers([...users, user])
    setNewUser({ name: "", email: "", groups: [], department: "" })
    setIsAddUserDialogOpen(false)

    toast({
      title: "Success",
      description: "User added successfully",
    })
  }

  const handleAddGroup = () => {
    if (!newGroup.name) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      })
      return
    }

    const group: Group = {
      id: Date.now().toString(),
      name: newGroup.name,
      description: newGroup.description,
      permissions: newGroup.permissions,
      memberCount: 0,
    }

    setGroups([...groups, group])
    setNewGroup({ name: "", description: "", permissions: [] })
    setIsAddGroupDialogOpen(false)

    toast({
      title: "Success",
      description: "Group added successfully",
    })
  }

  const handleEditUser = () => {
    if (!selectedUser) return

    setUsers(users.map((user) => (user.id === selectedUser.id ? selectedUser : user)))
    setIsEditUserDialogOpen(false)
    setSelectedUser(null)

    toast({
      title: "Success",
      description: "User updated successfully",
    })
  }

  const handleEditGroup = () => {
    if (!selectedGroup) return

    setGroups(groups.map((group) => (group.id === selectedGroup.id ? selectedGroup : group)))
    setIsEditGroupDialogOpen(false)
    setSelectedGroup(null)

    toast({
      title: "Success",
      description: "Group updated successfully",
    })
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))

    toast({
      title: "Success",
      description: "User deleted successfully",
    })
  }

  const handleDeleteGroup = (groupId: string) => {
    // Check if any users are in this group
    const usersInGroup = users.filter((user) => user.groups.includes(groups.find((g) => g.id === groupId)?.name || ""))

    if (usersInGroup.length > 0) {
      toast({
        title: "Error",
        description: "Cannot delete group with members. Remove members first.",
        variant: "destructive",
      })
      return
    }

    setGroups(groups.filter((group) => group.id !== groupId))

    toast({
      title: "Success",
      description: "Group deleted successfully",
    })
  }

  const handleEditUserClick = (user: User) => {
    setSelectedUser(user)
    setIsEditUserDialogOpen(true)
  }

  const handleEditGroupClick = (group: Group) => {
    setSelectedGroup(group)
    setIsEditGroupDialogOpen(true)
  }

  const handleAssignGroupClick = (user: User) => {
    setSelectedUser(user)
    setIsAssignGroupDialogOpen(true)
  }

  const handleAssignGroup = () => {
    if (!selectedUser) return

    setUsers(users.map((user) => (user.id === selectedUser.id ? selectedUser : user)))

    // Update member counts for groups
    const updatedGroups = [...groups]
    groups.forEach((group, index) => {
      const wasInGroup = users.find((u) => u.id === selectedUser.id)?.groups.includes(group.name)
      const isInGroup = selectedUser.groups.includes(group.name)

      if (!wasInGroup && isInGroup) {
        updatedGroups[index] = { ...group, memberCount: group.memberCount + 1 }
      } else if (wasInGroup && !isInGroup) {
        updatedGroups[index] = { ...group, memberCount: Math.max(0, group.memberCount - 1) }
      }
    })
    setGroups(updatedGroups)

    setIsAssignGroupDialogOpen(false)
    setSelectedUser(null)

    toast({
      title: "Success",
      description: "User groups updated successfully",
    })
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Available permissions for groups
  const availablePermissions = [
    { value: "manage_users", label: "Manage Users" },
    { value: "manage_data", label: "Manage Data Sources" },
    { value: "manage_settings", label: "Manage Settings" },
    { value: "view_analytics", label: "View Analytics" },
    { value: "manage_content", label: "Manage Content" },
    { value: "view_dashboards", label: "View Dashboards" },
    { value: "view_content", label: "View Content" },
    { value: "view_data", label: "View Data" },
    { value: "analyze_data", label: "Analyze Data" },
    { value: "view_customers", label: "View Customers" },
    { value: "manage_support_tickets", label: "Manage Support Tickets" },
  ]

  return (
    <DashboardLayout userName="John Doe">
      <div className="mb-6">
        <div className="flex justify-between items-center"></div>
      </div>

      <Tabs defaultValue="people" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TabsList>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>
        </div>

        {/* People Tab */}
        <TabsContent value="people" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Person</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groups">Groups</Label>
                    <Select
                      value={newUser.groups[0] || ""}
                      onValueChange={(value) => setNewUser({ ...newUser, groups: [value] })}
                    >
                      <SelectTrigger id="groups">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddUser} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                    Add Person
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="overflow-hidden border border-border/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Groups</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Active</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.groups.map((group) => (
                            <Badge key={group} variant="outline" className="bg-secondary/50">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {user.status === "active" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                          ) : user.status === "inactive" ? (
                            <XCircle className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                          )}
                          <span
                            className={cn(
                              user.status === "active"
                                ? "text-emerald-600"
                                : user.status === "inactive"
                                  ? "text-gray-500"
                                  : "text-amber-600",
                            )}
                          >
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{user.department || "-"}</td>
                      <td className="py-3 px-4">{user.lastActive}</td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => handleEditUserClick(user)}>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Edit Person
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignGroupClick(user)}>
                              <Users className="h-4 w-4 mr-2" />
                              Manage Groups
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete Person
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No people found. Try adjusting your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]">
                  <UserPlus2 className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Description</Label>
                    <Input
                      id="groupDescription"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availablePermissions.map((permission) => (
                        <div key={permission.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`perm-${permission.value}`}
                            checked={newGroup.permissions.includes(permission.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewGroup({
                                  ...newGroup,
                                  permissions: [...newGroup.permissions, permission.value],
                                })
                              } else {
                                setNewGroup({
                                  ...newGroup,
                                  permissions: newGroup.permissions.filter((p) => p !== permission.value),
                                })
                              }
                            }}
                            className="rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                          />
                          <Label htmlFor={`perm-${permission.value}`} className="text-sm">
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddGroup} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                    Add Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="overflow-hidden border border-border/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Group</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Members</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Permissions</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{group.name}</div>
                      </td>
                      <td className="py-3 px-4">{group.description}</td>
                      <td className="py-3 px-4">{group.memberCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {group.permissions.slice(0, 2).map((permission) => (
                            <Badge key={permission} variant="outline" className="bg-secondary/50">
                              {availablePermissions.find((p) => p.value === permission)?.label || permission}
                            </Badge>
                          ))}
                          {group.permissions.length > 2 && (
                            <Badge variant="outline" className="bg-secondary/50">
                              +{group.permissions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => handleEditGroupClick(group)}>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteGroup(group.id)} className="text-destructive">
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filteredGroups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No groups found. Try adjusting your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value: "active" | "inactive" | "pending") =>
                    setSelectedUser({ ...selectedUser, status: value })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={selectedUser.department || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                />
              </div>
              <Button onClick={handleEditUser} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Group Name</Label>
                <Input
                  id="edit-group-name"
                  value={selectedGroup.name}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">Description</Label>
                <Input
                  id="edit-group-description"
                  value={selectedGroup.description}
                  onChange={(e) => setSelectedGroup({ ...selectedGroup, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-perm-${permission.value}`}
                        checked={selectedGroup.permissions.includes(permission.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroup({
                              ...selectedGroup,
                              permissions: [...selectedGroup.permissions, permission.value],
                            })
                          } else {
                            setSelectedGroup({
                              ...selectedGroup,
                              permissions: selectedGroup.permissions.filter((p) => p !== permission.value),
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <Label htmlFor={`edit-perm-${permission.value}`} className="text-sm">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleEditGroup} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Group Dialog */}
      <Dialog open={isAssignGroupDialogOpen} onOpenChange={setIsAssignGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Groups for {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Assigned Groups</Label>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`group-${group.id}`}
                        checked={selectedUser.groups.includes(group.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUser({
                              ...selectedUser,
                              groups: [...selectedUser.groups, group.name],
                            })
                          } else {
                            setSelectedUser({
                              ...selectedUser,
                              groups: selectedUser.groups.filter((g) => g !== group.name),
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <Label htmlFor={`group-${group.id}`} className="flex flex-col">
                        <span>{group.name}</span>
                        <span className="text-xs text-muted-foreground">{group.description}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleAssignGroup} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                Save Group Assignments
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

