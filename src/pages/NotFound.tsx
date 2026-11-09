import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="text-center max-w-sm">
      <div className="flex justify-center mb-4">
        <div className="bg-primary/15 border border-primary/20 p-3 rounded-2xl">
          <Award className="w-8 h-8 text-primary" />
        </div>
      </div>
      <h1 className="text-4xl font-semibold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
      <div className="flex justify-center gap-2">
        <Button asChild><Link to="/demo">Design a diploma</Link></Button>
        <Button variant="outline" asChild><Link to="/">Home</Link></Button>
      </div>
    </div>
  </div>
);

export default NotFound;
