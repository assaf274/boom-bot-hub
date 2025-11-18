import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: updatedMessages,
          model: 'google/gemini-2.5-flash'
        }
      });

      if (error) throw error;

      if (data?.choices?.[0]?.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        setMessages([...updatedMessages, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error calling AI:', error);
      
      if (error.message?.includes('429')) {
        toast({
          title: 'שגיאה',
          description: 'חרגת ממגבלת הקריאות. נסה שוב מאוחר יותר.',
          variant: 'destructive',
        });
      } else if (error.message?.includes('402')) {
        toast({
          title: 'שגיאה',
          description: 'נדרש תשלום. הוסף קרדיט ל-workspace.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: 'שגיאה בקריאה ל-AI',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Chat - דוגמה לשימוש ב-Lovable AI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 min-h-[300px] max-h-[400px] overflow-y-auto p-4 border rounded-lg">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                  : 'bg-muted max-w-[80%]'
              }`}
            >
              <div className="text-sm font-semibold mb-1">
                {msg.role === 'user' ? 'אתה' : 'AI'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              התחל שיחה עם ה-AI
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="כתוב הודעה..."
            disabled={loading}
            className="resize-none"
            rows={3}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שלח'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          משתמש במודל: google/gemini-2.5-flash
        </div>
      </CardContent>
    </Card>
  );
};
