"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc, addDoc } from "firebase/firestore";
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
import { Loader2, Trash2, Package, Plus, Upload } from "lucide-react";
import Link from "next/link";
import type { Item } from "@/lib/types";

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");

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

  const handleDelete = useCallback(async (id: string) => {
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
  }, [items]);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      alert("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setImporting(true);
    setImportProgress("Reading file...");

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string;
          
          // Parse CSV or text data
          const lines = data.split("\n");
          const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
          
          // Find column indices with more flexible matching
          const itemNameIndex = headers.findIndex(h => 
            h.includes("item name") || (h.includes("item") && h.includes("name")) || h.includes("name")
          );
          const uomIndex = headers.findIndex(h => 
            h.includes("uom") || h.includes("unit of measure") || h.includes("unit")
          );
          const descIndex = headers.findIndex(h => 
            h.includes("description") || h.includes("desc")
          );
          const priceIndex = headers.findIndex(h => 
            h.includes("unit price") || h.includes("price")
          );
          
          if (itemNameIndex === -1 || priceIndex === -1) {
            alert("Excel file must contain 'Item Name' and 'Unit Price' columns.\n\nExpected columns:\n- Item Name\n- Unit Price\n- UOM (optional)\n- Description (optional)");
            setImporting(false);
            setImportProgress("");
            event.target.value = "";
            return;
          }

          const newItems: any[] = [];
          let successCount = 0;
          let errorCount = 0;

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(",").map(v => v.trim());
            const itemName = values[itemNameIndex];
            const unitPrice = parseFloat(values[priceIndex]);

            if (!itemName || isNaN(unitPrice)) {
              errorCount++;
              continue;
            }

            newItems.push({
              itemName,
              unitOfMeasure: uomIndex !== -1 ? values[uomIndex] : "Unit",
              description: descIndex !== -1 ? values[descIndex] : "",
              unitPrice,
            });
          }

          if (newItems.length === 0) {
            alert("No valid items found in the file");
            setImporting(false);
            setImportProgress("");
            event.target.value = "";
            return;
          }

          // Generate unique item IDs and save to Firebase
          setImportProgress(`Adding ${newItems.length} items...`);
          
          for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            
            try {
              // Generate unique item ID
              const itemId = `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
              
              await addDoc(collection(db, "items"), {
                ...item,
                itemId,
                createdAt: new Date(),
              });
              
              successCount++;
              setImportProgress(`Adding ${successCount}/${newItems.length} items...`);
            } catch (err) {
              errorCount++;
              console.error("Error adding item:", err);
            }
          }

          // Refresh items list
          await fetchItems();
          
          setImportProgress("");
          alert(`✅ Successfully imported ${successCount} items${errorCount > 0 ? ` (${errorCount} errors)` : ""}`);
        } catch (error) {
          console.error("Error processing file:", error);
          alert("Error processing file. Please ensure it's a valid Excel or CSV file.");
        } finally {
          setImporting(false);
          setImportProgress("");
          // Reset file input
          event.target.value = "";
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing items:", error);
      alert("Failed to import items");
      setImporting(false);
      setImportProgress("");
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
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/items/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => document.getElementById("excel-import")?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "Importing..." : "Import Excel"}
            </Button>
            <input
              id="excel-import"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              disabled={importing}
              style={{ display: "none" }}
            />
          </div>
        </div>
        {importProgress && (
          <div className="mt-3 text-sm text-muted-foreground">
            {importProgress}
          </div>
        )}
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
