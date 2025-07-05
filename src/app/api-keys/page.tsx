'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Card, CardContent } from '@/components/card';
import { Label } from '@/components/label';
import { Copy, Plus, Power, User, Calendar, Clock, Check, ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_enabled: boolean;
  description: string | null;
  created_by: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [isDisabledKeysOpen, setIsDisabledKeysOpen] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }
      const { keys } = await response.json();
      setKeys(keys || []);
      
      // Load creator information
      const creatorIds = [...new Set(keys.map((key: ApiKey) => key.created_by))];
      const creatorInfo: Record<string, string> = {};
      
      for (const id of creatorIds) {
        const userResponse = await fetch(`/api/users/${id}`);
        if (userResponse.ok) {
          const data = await userResponse.json();
          if (data.user && typeof data.user.email === 'string') {
            creatorInfo[id as string] = data.user.email;
          }
        }
      }
      
      setCreators(creatorInfo);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const { key } = await response.json();
      setNewlyCreatedKey(key);
      setNewKeyName('');
      setNewKeyDescription('');
      loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const disableApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys/${id}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to disable API key');
      }

      loadApiKeys();
    } catch (error) {
      console.error('Failed to disable API key:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const activeKeys = keys.filter(k => k.is_enabled);
  const disabledKeys = keys.filter(k => !k.is_enabled);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setIsDialogOpen(true);
              setNewlyCreatedKey(null);
              setHasCopiedKey(false);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!newlyCreatedKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key to authenticate your applications.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production Server"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Used by production server for logging"
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                    Create Key
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription className="text-red-500">
                    Save this API key now. You won't be able to see it again!
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono break-all">{newlyCreatedKey}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(newlyCreatedKey)}
                      className="ml-2"
                    >
                      {hasCopiedKey ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Make sure to store this key securely. For security reasons, we can't show it again once you close this dialog.
                  </p>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={() => {
                    setNewlyCreatedKey(null);
                    setIsDialogOpen(false);
                  }}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Active Keys</h2>
          <div className="grid gap-4">
            {activeKeys.map((key) => (
              <Card key={key.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{key.name}</h3>
                        {key.description && (
                          <span className="text-sm text-gray-500">- {key.description}</span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(key.created_at)}</span>
                        </div>
                        {key.last_used_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last used {formatDate(key.last_used_at)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{creators[key.created_by] || 'Unknown user'}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => disableApiKey(key.id)}
                      className="flex items-center gap-1"
                    >
                      <Power className="h-3 w-3" />
                      Disable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {activeKeys.length === 0 && (
              <p className="text-gray-500 text-center py-4">No active API keys</p>
            )}
          </div>
        </section>

        {disabledKeys.length > 0 && (
          <section>
            <Collapsible open={isDisabledKeysOpen} onOpenChange={setIsDisabledKeysOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 mb-4 cursor-pointer group">
                  <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform ${isDisabledKeysOpen ? 'rotate-90' : ''}`} />
                  <h2 className="text-lg font-semibold text-gray-500 group-hover:text-gray-700">
                    Disabled Keys ({disabledKeys.length})
                  </h2>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {disabledKeys.map((key) => (
                    <Card key={key.id} className="bg-gray-50/80 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-600 mb-1">{key.name}</h3>
                            {key.description && (
                              <p className="text-sm text-gray-500">{key.description}</p>
                            )}
                          </div>
                          <div className="space-y-2.5 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Created {formatDate(key.created_at)}</span>
                            </div>
                            {key.last_used_at && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Last used {formatDate(key.last_used_at)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{creators[key.created_by] || 'Unknown user'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <span className="inline-flex items-center px-2.5 py-1 rounded bg-gray-100 text-sm text-gray-500 font-medium">
                            Disabled
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        )}
      </div>
    </div>
  );
} 