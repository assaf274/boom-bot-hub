import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw, Trash2, CheckCircle, XCircle } from "lucide-react";

const BotsManagement = () => {
  return (
    <AppLayout>
      <div className="p-8 space-y-8" dir="rtl">
        <div>
          <h1 className="text-4xl font-bold mb-2">ניהול בוטים</h1>
          <p className="text-muted-foreground text-lg">
            נהל את כל הבוטים במערכת
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>בוט {i}</span>
                  {i <= 4 ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      מחובר
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 ml-1" />
                      מנותק
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>לקוח: ישראל כהן</p>
                  <p>קבוצות פעילות: 15</p>
                  <p>
                    התחבר לאחרונה:{" "}
                    {i <= 4 ? "לפני 5 דקות" : "לפני 2 שעות"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <QrCode className="h-4 w-4 ml-1" />
                    הצג QR
                  </Button>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default BotsManagement;
