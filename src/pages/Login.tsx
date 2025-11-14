import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Integrate with Lovable Cloud authentication
    // For now, demo login logic
    setTimeout(() => {
      if (username && password) {
        // Demo: admin goes to admin dashboard, others to client dashboard
        if (username === "admin") {
          navigate("/admin");
        } else {
          navigate("/client");
        }
        toast({
          title: "התחברות הצליחה",
          description: `ברוך הבא, ${username}!`,
        });
      } else {
        toast({
          title: "שגיאה",
          description: "נא למלא את כל השדות",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-whatsapp-dark via-whatsapp-green to-primary flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">BoomBot</CardTitle>
          <CardDescription className="text-base">
            מערכת ניהול בוטים ווטסאפ מתקדמת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">שם משתמש</Label>
              <Input
                id="username"
                type="text"
                placeholder="הזן שם משתמש"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="הזן סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-right"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "מתחבר..." : "התחבר"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
