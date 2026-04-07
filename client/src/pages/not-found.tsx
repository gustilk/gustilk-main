import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#E30613" }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,215,0,0.15)" }}>
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8" style={{ color: "#FFD700" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
