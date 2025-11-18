import { AIChat } from '@/components/AIChat';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">Lovable AI - דוגמה</h1>
          <p className="text-xl text-muted-foreground">
            Edge Function מוכן לשימוש עם google/gemini-2.5-flash
          </p>
        </div>
        <AIChat />
      </div>
    </div>
  );
};

export default Index;
