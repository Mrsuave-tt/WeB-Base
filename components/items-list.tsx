"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Package, Plus } from "lucide-react";
import Link from "next/link";
import type { Item } from "@/lib/types";

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const itemsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Item[];
      setItems(itemsData);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "items", id));
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="w-6 h-6" />
              Items Inventory
            </CardTitle>
            <CardDescription>
              Manage your items and their pricing information
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/items/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No items found</p>
            <Button asChild>
              <Link href="/items/new">Add your first item</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Item ID</TableHead>
                  <TableHead className="font-semibold">Item Name</TableHead>
                  <TableHead className="font-semibold">UOM</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {item.itemId}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.unitOfMeasure}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deleting === item.id ? (
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
  );
}
