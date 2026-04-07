import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#F9F9F9" }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(244,196,48,0.15)" }}>
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8" style={{ color: "#6BBF59" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#333333" }}>404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm" style={{ color: "rgba(51,51,51,0.5)" }}>
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
