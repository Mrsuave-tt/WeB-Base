export interface Item {
  id: string;
  itemId: string; // Unique ID like ITEM-001
  itemName: string;
  unitOfMeasure: string;
  description: string;
  unitPrice: number;
  createdAt: Date;
}

export interface RequisitionItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  description: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Requisition {
  id: string;
  requisitionNumber: string; // FL.RF.01.012026 format
  requestDate: string;
  needDate: string;
  department: string;
  unitSection: string;
  items: RequisitionItem[];
  remarks: string;
  preparedBy: string;
  notedBy: string;
  approvedBy: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}
