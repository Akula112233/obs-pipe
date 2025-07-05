import { useState, useEffect } from 'react';
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    created_at: string;
}

interface ApiKeySelectorProps {
    onKeySelect: (key: string) => void;
    selectedKey?: string;
    className?: string;
}

export function ApiKeySelector({ onKeySelect, selectedKey, className = '' }: ApiKeySelectorProps) {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadApiKeys() {
            try {
                const response = await fetch('/api/api-keys');
                const data = await response.json();
                const keys = data.keys;
                setApiKeys(keys);
            } catch (error) {
                console.error('Failed to fetch API keys:', error);
                setError('Failed to load API keys');
                setApiKeys([]);
            }
        }
        loadApiKeys();
    }, []);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            setError('Please enter a key name');
            return;
        }

        setIsCreatingKey(true);
        setError(null);

        try {
            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newKeyName }),
            });

            if (!response.ok) {
                throw new Error('Failed to create API key');
            }

            const newKey = await response.json();
            setApiKeys([...apiKeys, newKey]);
            onKeySelect(newKey.key);
            setIsCreateKeyOpen(false);
            setNewKeyName('');
        } catch (error) {
            setError('Failed to create API key');
        } finally {
            setIsCreatingKey(false);
        }
    };

    return (
        <div className={`rounded-lg border border-yellow-300 bg-yellow-100/50 p-6 shadow-sm ${className}`}>
            <Label htmlFor="api-key" className="text-lg font-semibold text-blue-800">Select API Key</Label>
            <div className="flex gap-2 mt-3">
                <select
                    id="api-key"
                    value={selectedKey || ""}
                    onChange={(e) => onKeySelect(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-blue-200 bg-white/90 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option key="default" value="">Select an API key</option>
                    {Array.isArray(apiKeys) && apiKeys.map((key) => (
                        <option key={`${key.id}-${key.key}`} value={key.key}>
                            {key.name || `Key ending in ...${key.key.slice(-6)}`}
                        </option>
                    ))}
                </select>
                <Button onClick={() => setIsCreateKeyOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    Create New Key
                </Button>
            </div>

            {error && (
                <p className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded-md">{error}</p>
            )}

            <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New API Key</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new API key. This will be used to identify the key in your list of keys.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="key-name">Key Name</Label>
                            <Input
                                id="key-name"
                                placeholder="Enter key name..."
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateKeyOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateKey}
                            disabled={isCreatingKey}
                        >
                            {isCreatingKey ? 'Creating...' : 'Create Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 