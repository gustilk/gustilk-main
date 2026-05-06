import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#060612" }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8" style={{ color: "#d4608a" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#fdf8f0" }}>404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm" style={{ color: "rgba(253,248,240,0.5)" }}>
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
