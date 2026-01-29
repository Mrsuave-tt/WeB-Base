"use client";

import React, { useCallback } from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Loader2, Save } from "lucide-react";

export function ItemForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    unitOfMeasure: "",
    description: "",
    unitPrice: "",
  });

  const generateItemId = async () => {
    try {
      const q = query(collection(db, "items"), orderBy("createdAt", "desc"), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return "ITEM-001";
      }
      const lastItem = snapshot.docs[0].data();
      const lastNumber = parseInt(lastItem.itemId.split("-")[1]) || 0;
      return `ITEM-${String(lastNumber + 1).padStart(3, "0")}`;
    } catch {
      return `ITEM-${Date.now().toString().slice(-3)}`;
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemId = await generateItemId();
      await addDoc(collection(db, "items"), {
        itemId,
        itemName: formData.itemName,
        unitOfMeasure: formData.unitOfMeasure,
        description: formData.description,
        unitPrice: parseFloat(formData.unitPrice),
        createdAt: new Date(),
      });

      setFormData({
        itemName: "",
        unitOfMeasure: "",
        description: "",
        unitPrice: "",
      });

      router.push("/items");
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item. Please check your Firebase configuration.");
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Add New Item</CardTitle>
        <CardDescription>
          Create a new item entry. A unique ID will be automatically generated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              placeholder="Enter item name"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
            <Input
              id="unitOfMeasure"
              placeholder="e.g., Unit, Box, Piece, kg"
              value={formData.unitOfMeasure}
              onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Item Description</Label>
            <Textarea
              id="description"
              placeholder="Enter item description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Item
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
