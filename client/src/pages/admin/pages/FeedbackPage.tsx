import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import type { User } from "@shared/schema";

export default function FeedbackPage({ user }: { user: User }) {
  const { data } = useQuery<{ feedback: any[] }>({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => (await fetch("/api/admin/feedback", { credentials: "include" })).json(),
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-xl text-gold font-bold">User Feedback</h1>
        <p className="text-cream/40 text-xs mt-0.5">In-app feedback and suggestions from users</p>
      </div>
      <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(200,0,14,0.2)" }}>
        <MessageSquare size={32} color="rgba(200,0,14,0.4)" className="mx-auto mb-3" />
        <div className="text-cream/50 text-sm font-medium">No Feedback Yet</div>
        <div className="text-cream/30 text-xs mt-2">Add an in-app feedback form to collect user suggestions and bug reports.</div>
      </div>
    </div>
  );
}
