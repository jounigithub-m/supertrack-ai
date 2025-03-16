"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { PlusIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string | null
}

export default function ApiConfigPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "Production API Key",
      key: "sk_prod_2023_abcdefghijklmnopqrstuvwxyz",
      createdAt: "2023-08-15",
      lastUsed: "2 hours ago",
    },
    {
      id: "2",
      name: "Development API Key",
      key: "sk_dev_2023_zyxwvutsrqponmlkjihgfedcba",
      createdAt: "2023-09-01",
      lastUsed: "1 day ago",
    },
    {
      id: "3",
      name: "Testing API Key",
      key: "sk_test_2023_123456789abcdefghijklmnop",
      createdAt: "2023-10-10",
      lastUsed: null,
    },
  ])

  const [newKeyName, setNewKeyName] = useState("")
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [webhookUrl, setWebhookUrl] = useState("https://example.com/webhook")
  const [webhookEnabled, setWebhookEnabled] = useState(true)

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for the API key",
        variant: "destructive",
      })
      return
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
    }

    setApiKeys([...apiKeys, newKey])
    setNewKeyName("")

    toast({
      title: "API Key Created",
      description: "Your new API key has been created successfully.",
    })
  }

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id))

    toast({
      title: "API Key Deleted",
      description: "The API key has been deleted successfully.",
    })
  }

  const toggleShowKey = (id: string) => {
    setShowKeys({
      ...showKeys,
      [id]: !showKeys[id],
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)

    toast({
      title: "Copied to Clipboard",
      description: "API key has been copied to clipboard.",
    })
  }

  const saveWebhookSettings = () => {
    toast({
      title: "Webhook Settings Saved",
      description: "Your webhook settings have been updated.",
    })
  }

  return (
    <DashboardLayout userName="John Doe">
      <div className="mb-6">
        <div className="flex justify-end items-center">
          <Button variant="default" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]" onClick={handleCreateKey}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        </div>
      </div>

      <Tabs defaultValue="keys" className="mb-6">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-6">
        {/* API Keys Tab Content */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create API Key</CardTitle>
              <CardDescription>Create a new API key to authenticate your applications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="keyName">API Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateKey} className="bg-[#6366f1] hover:bg-[#4f46e5]">
                    Create Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Manage your existing API keys. Keep these secure - they provide full access to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{apiKey.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          Created on {apiKey.createdAt}
                          {apiKey.lastUsed && ` • Last used ${apiKey.lastUsed}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleShowKey(apiKey.id)}>
                          {showKeys[apiKey.id] ? (
                            <EyeOffIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <EyeIcon className="h-4 w-4 mr-1" />
                          )}
                          {showKeys[apiKey.id] ? "Hide" : "Show"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(apiKey.key)}>
                          <CopyIcon className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteKey(apiKey.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="font-mono text-sm bg-muted p-2 rounded">
                      {showKeys[apiKey.id] ? apiKey.key : "•".repeat(Math.min(24, apiKey.key.length))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhooks Tab Content (Hidden by default) */}
        <div className="hidden">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhooks to receive real-time notifications when events occur in your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="webhook-enabled" checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
                <Label htmlFor="webhook-enabled">Enable webhooks</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveWebhookSettings} className="bg-[#6366f1] hover:bg-[#4f46e5]">
                Save Webhook Settings
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

