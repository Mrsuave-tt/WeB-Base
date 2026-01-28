import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            Requisition Management System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Streamline your procurement process with our easy-to-use item management 
            and requisition form system.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Add New Item</CardTitle>
              <CardDescription>
                Create new items with unique IDs, pricing, and descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/items/new">
                  Add Item
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>View Items</CardTitle>
              <CardDescription>
                Browse and manage your inventory of registered items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/items">
                  View Items
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Create Requisition</CardTitle>
              <CardDescription>
                Submit a new purchase requisition form with items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/requisition">
                  New Requisition
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="bg-card rounded-xl border p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Register Items</h3>
                <p className="text-sm text-muted-foreground">
                  Add items to your inventory with names, units, descriptions, and prices.
                  Each item gets a unique ID automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Create Requisition</h3>
                <p className="text-sm text-muted-foreground">
                  Fill out the requisition form with department info, dates, and select items
                  from your inventory.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Submit for Approval</h3>
                <p className="text-sm text-muted-foreground">
                  Add preparer, reviewer, and approver names, then submit your requisition
                  for processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
