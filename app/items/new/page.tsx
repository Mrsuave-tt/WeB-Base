import { Navigation } from "@/components/navigation";
import { ItemForm } from "@/components/item-form";

export default function NewItemPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ItemForm />
      </main>
    </div>
  );
}
