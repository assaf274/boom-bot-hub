import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Bot, MessageSquare, FolderKanban, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

// Input validation schema
const searchSchema = z.string().trim().max(200, "החיפוש ארוך מדי");

interface SearchResult {
  id: string;
  type: "client" | "bot" | "message" | "group";
  title: string;
  subtitle?: string;
  metadata?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Open search with Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query.trim()) return <>{text}</>;
    
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-primary/30 text-foreground font-semibold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    // Validate input
    const validationResult = searchSchema.safeParse(searchQuery);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];

    try {
      const sanitizedQuery = searchQuery.trim().toLowerCase();

      // Search clients (admin only)
      if (isAdmin) {
        const { data: clients } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .or(
            `full_name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%,phone.ilike.%${sanitizedQuery}%`
          )
          .limit(5);

        clients?.forEach((client) => {
          searchResults.push({
            id: client.id,
            type: "client",
            title: client.full_name,
            subtitle: client.email,
            metadata: client.phone || undefined,
          });
        });
      }

      // Search bots
      const { data: bots } = await supabase
        .from("bots")
        .select("id, bot_name, phone_number, status")
        .or(`bot_name.ilike.%${sanitizedQuery}%,phone_number.ilike.%${sanitizedQuery}%`)
        .limit(5);

      bots?.forEach((bot) => {
        searchResults.push({
          id: String(bot.id),
          type: "bot",
          title: bot.bot_name,
          subtitle: bot.phone_number || "ללא מספר",
          metadata: bot.status === "connected" ? "מחובר" : bot.status === "disconnected" ? "מנותק" : "ממתין",
        });
      });

      // Search groups
      const { data: groups } = await supabase
        .from("groups")
        .select("id, group_name, whatsapp_id, participants_count")
        .ilike("group_name", `%${sanitizedQuery}%`)
        .limit(5);

      groups?.forEach((group) => {
        searchResults.push({
          id: group.id,
          type: "group",
          title: group.group_name,
          subtitle: group.whatsapp_id || "ללא WhatsApp ID",
          metadata: `${group.participants_count || 0} משתתפים`,
        });
      });

      // Search messages
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, status, created_at")
        .ilike("content", `%${sanitizedQuery}%`)
        .order("created_at", { ascending: false })
        .limit(5);

      messages?.forEach((message) => {
        searchResults.push({
          id: message.id,
          type: "message",
          title: message.content.substring(0, 60) + (message.content.length > 60 ? "..." : ""),
          subtitle: new Date(message.created_at).toLocaleDateString("he-IL"),
          metadata: message.status === "sent" ? "נשלח" : message.status === "failed" ? "נכשל" : "ממתין",
        });
      });

      setResults(searchResults);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("שגיאה בחיפוש");
    } finally {
      setIsSearching(false);
    }
  }, [isAdmin]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);

    const basePath = isAdmin ? "/admin" : "/client";

    switch (result.type) {
      case "client":
        if (isAdmin) {
          navigate("/admin/clients");
          toast.success(`מעבר לניהול לקוחות`);
        }
        break;
      case "bot":
        navigate(`${basePath}/bots`);
        toast.success(`מעבר לניהול בוטים`);
        break;
      case "group":
        navigate(`${basePath}/groups`);
        toast.success(`מעבר לקבוצות`);
        break;
      case "message":
        if (isAdmin) {
          navigate("/admin/messages");
          toast.success(`מעבר להודעות`);
        }
        break;
    }
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "client":
        return <Users className="h-4 w-4 ml-2" />;
      case "bot":
        return <Bot className="h-4 w-4 ml-2" />;
      case "message":
        return <MessageSquare className="h-4 w-4 ml-2" />;
      case "group":
        return <FolderKanban className="h-4 w-4 ml-2" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "client":
        return "לקוחות";
      case "bot":
        return "בוטים";
      case "message":
        return "הודעות";
      case "group":
        return "קבוצות";
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResult["type"], SearchResult[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors w-full md:w-64"
      >
        <Search className="h-4 w-4" />
        <span>חיפוש...</span>
        <kbd className="mr-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="חפש לקוחות, בוטים, הודעות, קבוצות..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isSearching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>

              {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup
                  key={type}
                  heading={getTypeLabel(type as SearchResult["type"])}
                >
                  {items.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.title}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1">
                        <div className="font-medium">
                          {highlightMatch(result.title, query)}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-muted-foreground">
                            {highlightMatch(result.subtitle, query)}
                          </div>
                        )}
                      </div>
                      {result.metadata && (
                        <span className="text-xs text-muted-foreground">
                          {result.metadata}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
