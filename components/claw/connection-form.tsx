"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Plus,
  Plug,
  Unplug,
  Loader2,
  Server,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ConnectionInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  gatewayPort: number;
  isDefault: boolean;
}

interface ConnectState {
  connected: boolean;
  connectionId: string | null;
  host?: string;
  username?: string;
}

interface ConnectionFormProps {
  onConnectionChange: (state: ConnectState) => void;
}

export function ConnectionForm({ onConnectionChange }: ConnectionFormProps) {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [connectState, setConnectState] = useState<ConnectState>({
    connected: false,
    connectionId: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: "22",
    username: "root",
    authMethod: "key" as "password" | "key",
    password: "",
    privateKey: "",
    passphrase: "",
    gatewayPort: "18789",
  });

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/claw/connections");
      const data = await res.json();
      if (Array.isArray(data)) setConnections(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnect = async (id: string) => {
    setConnecting(true);
    try {
      const res = await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      const data = await res.json();
      const state: ConnectState = {
        connected: data.connected,
        connectionId: data.connected ? id : null,
        host: data.host,
        username: data.username,
      };
      setConnectState(state);
      onConnectionChange(state);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (connectState.connectionId) {
      await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: connectState.connectionId,
          action: "disconnect",
        }),
      });
    }
    const state: ConnectState = { connected: false, connectionId: null };
    setConnectState(state);
    onConnectionChange(state);
  };

  const handleAddConnection = async () => {
    try {
      await fetch("/api/claw/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          host: formData.host,
          port: parseInt(formData.port),
          username: formData.username,
          authMethod: formData.authMethod,
          password: formData.authMethod === "password" ? formData.password : undefined,
          privateKey: formData.authMethod === "key" ? formData.privateKey : undefined,
          passphrase: formData.passphrase || undefined,
          gatewayPort: parseInt(formData.gatewayPort),
        }),
      });
      setAddOpen(false);
      setFormData({
        name: "",
        host: "",
        port: "22",
        username: "root",
        authMethod: "key",
        password: "",
        privateKey: "",
        passphrase: "",
        gatewayPort: "18789",
      });
      loadConnections();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/claw/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (connectState.connectionId === id) {
      handleDisconnect();
    }
    loadConnections();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SSH Connection
          </div>
          <div className="flex items-center gap-2">
            {connectState.connected ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                <Wifi className="h-3 w-3 mr-1" />
                {connectState.username}@{connectState.host}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-1">
              <Button
                size="sm"
                variant={
                  connectState.connectionId === conn.id ? "default" : "outline"
                }
                onClick={() =>
                  connectState.connectionId === conn.id
                    ? handleDisconnect()
                    : handleConnect(conn.id)
                }
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : connectState.connectionId === conn.id ? (
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Plug className="h-3.5 w-3.5 mr-1.5" />
                )}
                {conn.name}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(conn.id)}
              >
                &times;
              </Button>
            </div>
          ))}

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add SSH Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="My Cloud Server"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Host</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={formData.host}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, host: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      value={formData.port}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, port: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, username: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Method</Label>
                    <Select
                      value={formData.authMethod}
                      onValueChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          authMethod: v as "password" | "key",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">SSH Key</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.authMethod === "password" ? (
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Private Key (PEM)</Label>
                      <Textarea
                        className="font-mono text-xs"
                        rows={5}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                        value={formData.privateKey}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            privateKey: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Passphrase (optional)</Label>
                      <Input
                        type="password"
                        value={formData.passphrase}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            passphrase: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Gateway Port</Label>
                  <Input
                    value={formData.gatewayPort}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, gatewayPort: e.target.value }))
                    }
                  />
                </div>
                <Button className="w-full" onClick={handleAddConnection}>
                  Add Connection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
