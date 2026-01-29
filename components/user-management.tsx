"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, Plus, Users } from "lucide-react";

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newUsername || !newPassword) {
      setError("Username and password are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setCreating(true);

    try {
      // Check if username already exists
      const existingUsers = users.filter(u => u.username === newUsername);
      if (existingUsers.length > 0) {
        setError("Username already exists");
        setCreating(false);
        return;
      }

      await addDoc(collection(db, "users"), {
        username: newUsername,
        password: newPassword, // In production, this should be hashed!
        createdAt: new Date(),
      });

      setSuccess(`User '${newUsername}' created successfully!`);
      setNewUsername("");
      setNewPassword("");
      await fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      setError("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = useCallback(async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;
    
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers(users.filter((user) => user.id !== id));
      setSuccess(`User '${username}' deleted successfully!`);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user");
    } finally {
      setDeleting(null);
    }
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New User
          </CardTitle>
          <CardDescription>Add a new user account to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUsername">Username</Label>
                <Input
                  id="newUsername"
                  type="text"
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={creating}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={creating}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={creating || !newUsername || !newPassword}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Accounts ({users.length})
          </CardTitle>
          <CardDescription>Manage user accounts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users created yet</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Username</TableHead>
                    <TableHead className="font-semibold">Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.createdAt?.toDate?.()?.toLocaleDateString?.() || "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={deleting === user.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deleting === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
