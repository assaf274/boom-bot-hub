import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search } from "lucide-react";
import * as api from "@/lib/api";

interface GroupSelectorProps {
  externalBotId: string;
  onClose: () => void;
}

export const GroupSelector = ({ externalBotId, onClose }: GroupSelectorProps) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<api.WhatsAppGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<api.WhatsAppGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, [externalBotId]);

  // Filter groups based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGroups(groups);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGroups(
        groups.filter((group) =>
          group.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, groups]);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const fetchedGroups = await api.getBotGroups(externalBotId);
      setGroups(fetchedGroups);
      setFilteredGroups(fetchedGroups);
      toast({
        title: "קבוצות נטענו בהצלחה",
        description: `נמצאו ${fetchedGroups.length} קבוצות`,
      });
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "שגיאה בטעינת קבוצות",
        description: "לא ניתן לטעון את הקבוצות. ודא שהבוט מחובר.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.length === filteredGroups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(filteredGroups.map((g) => g.id));
    }
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSend = async () => {
    if (selectedGroupIds.length === 0) {
      toast({
        title: "בחר קבוצות",
        description: "אנא בחר לפחות קבוצה אחת",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "הודעה ריקה",
        description: "אנא הזן הודעה לשליחה",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await api.sendToGroups(externalBotId, {
        groupIds: selectedGroupIds,
        message: message.trim(),
      });

      toast({
        title: "הודעה נשלחה!",
        description: `נשלח ל-${result.sent} קבוצות מתוך ${result.total}${
          result.failed > 0 ? ` (${result.failed} נכשלו)` : ""
        }`,
      });

      // Reset form on success
      setSelectedGroupIds([]);
      setMessage("");

      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error sending messages:", error);
      toast({
        title: "שגיאה בשליחה",
        description: "לא ניתן לשלוח את ההודעה. נסה שוב.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>בחר קבוצות ושלח הודעה</CardTitle>
        <CardDescription>
          בחר את הקבוצות שברצונך לשלוח אליהן הודעה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">חפש קבוצה</Label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="הזן שם קבוצה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="mr-2">טוען קבוצות...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>קבוצות ({filteredGroups.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedGroupIds.length === filteredGroups.length
                  ? "בטל בחירת הכל"
                  : "בחר הכל"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-4">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  לא נמצאו קבוצות
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-accent rounded-md"
                    >
                      <Checkbox
                        id={group.id}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => handleToggleGroup(group.id)}
                      />
                      <Label
                        htmlFor={group.id}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              נבחרו {selectedGroupIds.length} קבוצות
            </div>
          </div>
        )}

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">הודעה</Label>
          <Textarea
            id="message"
            placeholder="הזן את ההודעה שברצונך לשלוח..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || selectedGroupIds.length === 0 || !message.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="ml-2 h-4 w-4" />
                שלח הודעה
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
