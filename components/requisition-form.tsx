"use client";

import React, { useCallback, useMemo } from "react"

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
import { Loader2, Plus, Trash2, Send, FileText, Printer, Archive, ArchiveRestore } from "lucide-react";
import type { Item, RequisitionItem } from "@/lib/types";
import { getCachedQuery, setCachedQuery } from "@/lib/utils";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";

export function RequisitionForm() {
  const [view, setView] = useState<"form" | "records" | "print">("form");
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [requisitionItems, setRequisitionItems] = useState<RequisitionItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submittedRequisition, setSubmittedRequisition] = useState<{
    requisitionNumber: string;
    formData: typeof formData;
    items: RequisitionItem[];
  } | null>(null);
  const [submittedRequisitions, setSubmittedRequisitions] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRequisitionId, setEditingRequisitionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    requestDate: new Date().toISOString().split("T")[0],
    needDate: "",
    department: "",
    unitSection: "",
    remarks: "",
    preparedBy: "",
    notedBy: "",
    approvedBy: "",
    approvedByCOO: "",
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Check cache first
        const cached = getCachedQuery<Item[]>("items_list");
        if (cached) {
          setAvailableItems(cached);
          setItemsLoading(false);
          return;
        }

        const q = query(collection(db, "items"), orderBy("itemName"));
        const snapshot = await getDocs(q);
        const itemsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        
        // Cache the results
        setCachedQuery("items_list", itemsData);
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
      
      if (snapshot.empty) {
        return `FL.RF.01`;
      }
      const lastReq = snapshot.docs[0].data();
      const lastNumber = parseInt(lastReq.requisitionNumber.split(".")[2]) || 0;
      return `FL.RF.${String(lastNumber + 1).padStart(2, "0")}`;
    } catch {
      return `FL.RF.01`;
    }
  };

  const handleAddItem = useCallback(() => {
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
  }, [selectedItemId, quantity, availableItems, requisitionItems]);

  const handleRemoveItem = useCallback((index: number) => {
    setRequisitionItems(requisitionItems.filter((_, i) => i !== index));
  }, [requisitionItems]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requisitionItems.length === 0) {
      alert("Please add at least one item to the requisition.");
      return;
    }

    setLoading(true);
    try {
      const requisitionNumber = await generateRequisitionNumber();
      
      // Save to database
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

      // Set view to print
      setView("print");
      setIsEditing(false);
      setEditingRequisitionId(null);
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
    setView("form");
    setRequisitionItems([]);
    setIsEditing(false);
    setEditingRequisitionId(null);
    setFormData({
      requestDate: new Date().toISOString().split("T")[0],
      needDate: "",
      department: "",
      unitSection: "",
      remarks: "",
      preparedBy: "",
      notedBy: "",
      approvedBy: "",
      approvedByCOO: "",
    });
  };

  const fetchSubmittedRequisitions = async () => {
    setRecordsLoading(true);
    try {
      const q = query(collection(db, "requisitions"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const requisitionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubmittedRequisitions(requisitionsData);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleViewRecords = () => {
    setView("records");
    fetchSubmittedRequisitions();
  };

  const handleViewPrint = (req: any) => {
    setSubmittedRequisition({
      requisitionNumber: req.requisitionNumber,
      formData: req,
      items: req.items || [],
    });
    setView("print");
  };

  const handleEditRequisition = (req: any) => {
    setIsEditing(true);
    setEditingRequisitionId(req.id);
    setRequisitionItems(req.items || []);
    setFormData({
      requestDate: req.requestDate || "",
      needDate: req.needDate || "",
      department: req.department || "",
      unitSection: req.unitSection || "",
      remarks: req.remarks || "",
      preparedBy: req.preparedBy || "",
      notedBy: req.notedBy || "",
      approvedBy: req.approvedBy || "",
      approvedByCOO: req.approvedByCOO || "",
    });
    setView("form");
  };

  const handleDeleteRequisition = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this requisition? This action cannot be undone.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "requisitions", id));
      setSubmittedRequisitions(submittedRequisitions.filter((req) => req.id !== id));
    } catch (error) {
      console.error("Error deleting requisition:", error);
      alert("Failed to delete requisition.");
    }
  };

  const handleArchiveRequisition = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "archived" ? "pending" : "archived";
    
    try {
      await updateDoc(doc(db, "requisitions", id), {
        status: newStatus,
      });
      
      setSubmittedRequisitions(submittedRequisitions.map((req) => 
        req.id === id ? { ...req, status: newStatus } : req
      ));
    } catch (error) {
      console.error("Error updating requisition status:", error);
      alert("Failed to update requisition status.");
    }
  };

  const totalAmount = useMemo(() => 
    requisitionItems.reduce((sum, item) => sum + item.totalPrice, 0),
    [requisitionItems]
  );

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
  if (view === "print" && submittedRequisition) {
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
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .print-area {
              font-family: Arial, sans-serif;
              font-size: 11pt;
            }
            .print-area table {
              border-collapse: collapse;
              width: 100%;
            }
            .print-area td, .print-area th {
              border: 1px solid #000;
              padding: 4px;
            }
          }
        `}</style>

        {/* Action Buttons - Hidden during print */}
        <div className="no-print max-w-5xl mx-auto mb-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={handleViewRecords}>
            View Records
          </Button>
          <Button variant="outline" onClick={handleNewRequisition}>
            Create New Requisition
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Requisition
          </Button>
        </div>

        {/* Printable Requisition Form */}
        <div className="print-area max-w-5xl mx-auto bg-white p-4" style={{fontFamily: "Arial, sans-serif", fontSize: "11pt"}}>
          {/* Header with logo */}
          <div style={{display: "flex", justifyContent: "flex-start", alignItems: "flex-start", marginBottom: "12px"}}>
            <div>
              <img 
                src="/visayasmed logo_circular-02.png" 
                alt="Logo" 
                style={{height: "80px", width: "auto"}}
              />
            </div>
          </div>
          
          <div className="text-center mb-3">
            <h1 style={{fontSize: "16pt", fontWeight: "bold", marginBottom: "4px"}}>Requisition Form</h1>
            <p style={{fontSize: "13pt", fontWeight: "bold", color: "#0066cc", marginBottom: "0"}}>
              {submittedRequisition.requisitionNumber}
            </p>
          </div>

          {/* Form Details in 2x2 grid */}
          <div className="mb-3" style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px"}}>
            <div style={{display: "flex"}}>
              <span style={{fontWeight: "bold", width: "100px", flexShrink: 0}}>Request Date:</span>
              <span>{formatDate(submittedRequisition.formData.requestDate)}</span>
            </div>
            <div style={{display: "flex"}}>
              <span style={{fontWeight: "bold", width: "100px", flexShrink: 0}}>Need Date:</span>
              <span>{formatDate(submittedRequisition.formData.needDate)}</span>
            </div>
            <div style={{display: "flex"}}>
              <span style={{fontWeight: "bold", width: "100px", flexShrink: 0}}>Department:</span>
              <span>{submittedRequisition.formData.department}</span>
            </div>
            <div style={{display: "flex"}}>
              <span style={{fontWeight: "bold", width: "100px", flexShrink: 0}}>Unit/Section:</span>
              <span>{submittedRequisition.formData.unitSection || "N/A"}</span>
            </div>
          </div>

          {/* Items Table - Excel style */}
          <table style={{borderCollapse: "collapse", width: "100%", marginBottom: "8px"}}>
            <thead>
              <tr style={{backgroundColor: "#e0e0e0"}}>
                <th style={{border: "1px solid #000", padding: "4px", fontWeight: "bold", width: "40px", textAlign: "center"}}>Qty</th>
                <th style={{border: "1px solid #000", padding: "4px", fontWeight: "bold", width: "50px", textAlign: "center"}}>UOM</th>
                <th style={{border: "1px solid #000", padding: "4px", fontWeight: "bold", textAlign: "left"}}>Description</th>
                <th style={{border: "1px solid #000", padding: "4px", fontWeight: "bold", width: "80px", textAlign: "right"}}>Unit Price</th>
                <th style={{border: "1px solid #000", padding: "4px", fontWeight: "bold", width: "80px", textAlign: "center"}}>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {submittedRequisition.items.map((item, index) => (
                <tr key={index}>
                  <td style={{border: "1px solid #000", padding: "4px", textAlign: "center"}}>{item.quantity}</td>
                  <td style={{border: "1px solid #000", padding: "4px", textAlign: "center"}}>{item.unitOfMeasure}</td>
                  <td style={{border: "1px solid #000", padding: "4px"}}>
                    <div style={{fontWeight: "500"}}>{item.itemName}</div>
                    {item.description && (
                      <div style={{fontSize: "9pt", color: "#666"}}>{item.description}</div>
                    )}
                  </td>
                  <td style={{border: "1px solid #000", padding: "4px", textAlign: "right"}}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{border: "1px solid #000", padding: "4px", textAlign: "right"}}>{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
              <tr style={{backgroundColor: "#f0f0f0", fontWeight: "bold"}}>
                <td colSpan={4} style={{border: "1px solid #000", padding: "4px", textAlign: "right"}}>Grand Total:</td>
                <td style={{border: "1px solid #000", padding: "4px", textAlign: "right", fontWeight: "bold"}}>
                  {formatCurrency(printTotalAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Remarks */}
          {submittedRequisition.formData.remarks && (
            <div className="mb-3">
              <span style={{fontWeight: "bold"}}>Remarks:</span>
              <p style={{marginTop: "2px", padding: "3px", backgroundColor: "#f5f5f5", border: "1px solid #ddd"}}>
                {submittedRequisition.formData.remarks}
              </p>
            </div>
          )}

          {/* Signature Section - Underline style */}
          <div style={{marginTop: "40px", paddingTop: "16px", borderTop: "2px solid #000"}}>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px"}}>
              <div style={{textAlign: "center"}}>
                <span style={{fontSize: "11pt", fontWeight: "bold", display: "block", marginBottom: "4px"}}>Prepared By:</span>
                <div style={{borderBottom: "1.5px solid #000", height: "24px", marginBottom: "6px", display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
                  <span style={{fontSize: "10pt", marginBottom: "2px"}}>{submittedRequisition.formData.preparedBy}</span>
                </div>
              </div>
              <div style={{textAlign: "center"}}>
                <span style={{fontSize: "11pt", fontWeight: "bold", display: "block", marginBottom: "4px"}}>Noted By:</span>
                <div style={{borderBottom: "1.5px solid #000", height: "24px", marginBottom: "6px", display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
                  <span style={{fontSize: "10pt", marginBottom: "2px"}}>{submittedRequisition.formData.notedBy}</span>
                </div>
                <span style={{fontSize: "9pt", color: "#333", fontWeight: "500"}}>Department Head</span>
              </div>
              <div style={{textAlign: "center"}}>
                <span style={{fontSize: "11pt", fontWeight: "bold", display: "block", marginBottom: "4px"}}>Approved By:</span>
                <div style={{borderBottom: "1.5px solid #000", height: "24px", marginBottom: "6px", display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
                  <span style={{fontSize: "10pt", marginBottom: "2px"}}>{submittedRequisition.formData.approvedBy}</span>
                </div>
                <span style={{fontSize: "9pt", color: "#333", fontWeight: "500"}}>CFO</span>
              </div>
              <div style={{textAlign: "center"}}>
                <span style={{fontSize: "11pt", fontWeight: "bold", display: "block", marginBottom: "4px"}}>Approved By:</span>
                <div style={{borderBottom: "1.5px solid #000", height: "24px", marginBottom: "6px", display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
                  <span style={{fontSize: "10pt", marginBottom: "2px"}}>{submittedRequisition.formData.approvedByCOO}</span>
                </div>
                <span style={{fontSize: "9pt", color: "#333", fontWeight: "500"}}>COO</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show records view
  if (view === "records") {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="border-b bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Requisition Records</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  View all submitted requisitions
                </p>
              </div>
            </div>
            <Button onClick={handleNewRequisition}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Requisition
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filter Toggle */}
          <div className="mb-4 flex gap-2">
            <Button
              variant={!showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(false)}
              size="sm"
            >
              Active Requisitions
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(true)}
              size="sm"
            >
              Archived Requisitions
            </Button>
          </div>

          {recordsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading records...</span>
            </div>
          ) : submittedRequisitions.filter((req) => (showArchived ? req.status === "archived" : req.status !== "archived")).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {showArchived ? "No archived requisitions found." : "No active requisitions found."}
              </p>
              {!showArchived && (
                <Button onClick={handleNewRequisition} className="mt-4">
                  Create a new requisition
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Requisition #</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Request Date</TableHead>
                    <TableHead className="font-semibold">Need Date</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Total Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submittedRequisitions.filter((req) => (showArchived ? req.status === "archived" : req.status !== "archived")).map((req) => {
                    const totalAmount = (req.items || []).reduce((sum: number, item: any) => sum + item.totalPrice, 0);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold text-primary">{req.requisitionNumber}</TableCell>
                        <TableCell>{req.department}</TableCell>
                        <TableCell>{formatDate(req.requestDate)}</TableCell>
                        <TableCell>{formatDate(req.needDate)}</TableCell>
                        <TableCell className="text-center">{(req.items || []).length}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(totalAmount)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            req.status === "archived" 
                              ? "bg-gray-100 text-gray-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {req.status === "archived" ? "archived" : "pending"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPrint(req)}
                              title="View details"
                            >
                              <Printer className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRequisition(req)}
                              title="Edit"
                              className="text-blue-600"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveRequisition(req.id, req.status)}
                              title={req.status === "archived" ? "Restore from archive" : "Archive"}
                              className={req.status === "archived" ? "text-blue-600" : "text-amber-600"}
                            >
                              {req.status === "archived" ? (
                                <ArchiveRestore className="w-3 h-3" />
                              ) : (
                                <Archive className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRequisition(req.id)}
                              title="Delete"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader className="border-b bg-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {isEditing ? "Edit Requisition" : "Requisition Form"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditing 
                  ? "Edit and save as new requisition with incremented number" 
                  : "Create a new purchase requisition"}
              </p>
            </div>
          </div>
          {isEditing && (
            <Button 
              type="button"
              variant="outline" 
              onClick={handleNewRequisition}
            >
              Cancel
            </Button>
          )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t">
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
              <Label htmlFor="approvedBy">Approved By (CFO)</Label>
              <Input
                id="approvedBy"
                placeholder="Name of CFO"
                value={formData.approvedBy}
                onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approvedByCOO">Approved By (COO)</Label>
              <Input
                id="approvedByCOO"
                placeholder="Name of COO"
                value={formData.approvedByCOO}
                onChange={(e) => setFormData({ ...formData, approvedByCOO: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={isEditing ? handleNewRequisition : handleViewRecords}
              size="lg"
            >
              {isEditing ? "Cancel" : "View Records"}
            </Button>
            <Button type="submit" size="lg" disabled={loading || requisitionItems.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Saving..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isEditing ? "Save as New Requisition" : "Submit Requisition"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
