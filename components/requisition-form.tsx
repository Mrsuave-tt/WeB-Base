"use client";

import React from "react"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Send, FileText, Printer } from "lucide-react";
import type { Item, RequisitionItem } from "@/lib/types";

export function RequisitionForm() {
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [requisitionItems, setRequisitionItems] = useState<RequisitionItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submittedRequisition, setSubmittedRequisition] = useState<{
    requisitionNumber: string;
    formData: typeof formData;
    items: RequisitionItem[];
  } | null>(null);

  const [formData, setFormData] = useState({
    requestDate: new Date().toISOString().split("T")[0],
    needDate: "",
    department: "",
    unitSection: "",
    remarks: "",
    preparedBy: "",
    notedBy: "",
    approvedBy: "",
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const q = query(collection(db, "items"), orderBy("itemName"));
        const snapshot = await getDocs(q);
        const itemsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        setAvailableItems(itemsData);
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const generateRequisitionNumber = async () => {
    try {
      const q = query(collection(db, "requisitions"), orderBy("createdAt", "desc"), limit(1));
      const snapshot = await getDocs(q);
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      
      if (snapshot.empty) {
        return `FL.RF.01.${month}${year}`;
      }
      const lastReq = snapshot.docs[0].data();
      const lastNumber = parseInt(lastReq.requisitionNumber.split(".")[2]) || 0;
      return `FL.RF.${String(lastNumber + 1).padStart(2, "0")}.${month}${year}`;
    } catch {
      return `FL.RF.01.${new Date().toISOString().slice(0, 7).replace("-", "")}`;
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId || !quantity) return;

    const item = availableItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    const existingIndex = requisitionItems.findIndex((i) => i.itemId === item.itemId);
    if (existingIndex >= 0) {
      const updated = [...requisitionItems];
      updated[existingIndex].quantity += parseInt(quantity);
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * item.unitPrice;
      setRequisitionItems(updated);
    } else {
      const newItem: RequisitionItem = {
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: parseInt(quantity),
        unitOfMeasure: item.unitOfMeasure,
        description: item.description,
        unitPrice: item.unitPrice,
        totalPrice: parseInt(quantity) * item.unitPrice,
      };
      setRequisitionItems([...requisitionItems, newItem]);
    }

    setSelectedItemId("");
    setQuantity("1");
  };

  const handleRemoveItem = (index: number) => {
    setRequisitionItems(requisitionItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requisitionItems.length === 0) {
      alert("Please add at least one item to the requisition.");
      return;
    }

    setLoading(true);
    try {
      const requisitionNumber = await generateRequisitionNumber();
      await addDoc(collection(db, "requisitions"), {
        requisitionNumber,
        ...formData,
        items: requisitionItems,
        createdAt: new Date(),
        status: "pending",
      });

      // Store submitted data for printing
      setSubmittedRequisition({
        requisitionNumber,
        formData: { ...formData },
        items: [...requisitionItems],
      });

      alert(`Requisition ${requisitionNumber} submitted successfully! You can now print it.`);
    } catch (error) {
      console.error("Error submitting requisition:", error);
      alert("Failed to submit requisition. Please check your Firebase configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!submittedRequisition) return;
    window.print();
  };

  const handleNewRequisition = () => {
    setSubmittedRequisition(null);
    setRequisitionItems([]);
    setFormData({
      requestDate: new Date().toISOString().split("T")[0],
      needDate: "",
      department: "",
      unitSection: "",
      remarks: "",
      preparedBy: "",
      notedBy: "",
      approvedBy: "",
    });
  };

  const totalAmount = requisitionItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Show printable view after submission
  if (submittedRequisition) {
    const printTotalAmount = submittedRequisition.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return (
      <>
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}</style>

        {/* Action Buttons - Hidden during print */}
        <div className="no-print max-w-5xl mx-auto mb-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={handleNewRequisition}>
            Create New Requisition
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Requisition
          </Button>
        </div>

        {/* Printable Requisition Form */}
        <div className="print-area max-w-5xl mx-auto bg-card border rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">Requisition Form</h1>
            <p className="text-lg font-semibold text-primary mt-2">
              {submittedRequisition.requisitionNumber}
            </p>
          </div>

          {/* Form Details */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
            <div className="flex">
              <span className="font-semibold w-32">Request Date:</span>
              <span>{formatDate(submittedRequisition.formData.requestDate)}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Need Date:</span>
              <span>{formatDate(submittedRequisition.formData.needDate)}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Department:</span>
              <span>{submittedRequisition.formData.department}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Unit/Section:</span>
              <span>{submittedRequisition.formData.unitSection || "N/A"}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="font-bold text-foreground">Qty</TableHead>
                  <TableHead className="font-bold text-foreground">UOM</TableHead>
                  <TableHead className="font-bold text-foreground">Description</TableHead>
                  <TableHead className="font-bold text-foreground text-right">Unit Price</TableHead>
                  <TableHead className="font-bold text-foreground text-right">Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedRequisition.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unitOfMeasure}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.itemName}</span>
                      {item.description && (
                        <span className="text-sm text-muted-foreground block">{item.description}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="text-right font-bold">
                    Grand Total:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {formatCurrency(printTotalAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Remarks */}
          {submittedRequisition.formData.remarks && (
            <div className="mb-6">
              <span className="font-semibold">Remarks:</span>
              <p className="mt-1 p-3 bg-muted/30 rounded">{submittedRequisition.formData.remarks}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t">
            <div className="text-center">
              <div className="border-b border-foreground pb-1 mb-2 min-h-[60px] flex items-end justify-center">
                <span className="font-medium">{submittedRequisition.formData.preparedBy}</span>
              </div>
              <span className="text-sm font-semibold">Prepared By</span>
            </div>
            <div className="text-center">
              <div className="border-b border-foreground pb-1 mb-2 min-h-[60px] flex items-end justify-center">
                <span className="font-medium">{submittedRequisition.formData.notedBy}</span>
              </div>
              <span className="text-sm font-semibold">Noted By</span>
            </div>
            <div className="text-center">
              <div className="border-b border-foreground pb-1 mb-2 min-h-[60px] flex items-end justify-center">
                <span className="font-medium">{submittedRequisition.formData.approvedBy}</span>
              </div>
              <span className="text-sm font-semibold">Approved By</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="border-b bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Requisition Form</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new purchase requisition
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="requestDate">Request Date</Label>
              <Input
                id="requestDate"
                type="date"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="needDate">Need Date</Label>
              <Input
                id="needDate"
                type="date"
                value={formData.needDate}
                onChange={(e) => setFormData({ ...formData, needDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., IT, HR, Finance"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitSection">Unit/Section</Label>
              <Input
                id="unitSection"
                placeholder="Enter unit or section"
                value={formData.unitSection}
                onChange={(e) => setFormData({ ...formData, unitSection: e.target.value })}
              />
            </div>
          </div>

          {/* Add Items Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Add Items</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={itemsLoading ? "Loading items..." : "Select an item"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.itemId} - {item.itemName} ({formatCurrency(item.unitPrice)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-32">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <Button type="button" onClick={handleAddItem} disabled={!selectedItemId}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Qty</TableHead>
                  <TableHead className="font-semibold">UOM</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-right">Total Price</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitionItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No items added yet. Select an item above to add.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {requisitionItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.itemName}</span>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Grand Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Enter any additional remarks or notes"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
            />
          </div>

          {/* Approval Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="preparedBy">Prepared By</Label>
              <Input
                id="preparedBy"
                placeholder="Name of preparer"
                value={formData.preparedBy}
                onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notedBy">Noted By</Label>
              <Input
                id="notedBy"
                placeholder="Name of reviewer"
                value={formData.notedBy}
                onChange={(e) => setFormData({ ...formData, notedBy: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approvedBy">Approved By</Label>
              <Input
                id="approvedBy"
                placeholder="Name of approver"
                value={formData.approvedBy}
                onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={loading || requisitionItems.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Requisition
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
