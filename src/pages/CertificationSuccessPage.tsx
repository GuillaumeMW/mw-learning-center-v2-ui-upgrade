import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Download, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CertificationSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const level = searchParams.get("level");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getCertificationDetails = (level: string | null) => {
    switch (level) {
      case "1":
        return {
          title: "Level 1 Certification",
          description: "Moving Waldo Certified Professional - Level 1",
          color: "bg-emerald-500",
          benefits: [
            "Access to Level 1 course materials",
            "Certificate of completion",
            "Professional recognition",
            "Access to community forums"
          ]
        };
      case "2":
        return {
          title: "Level 2 Certification",
          description: "Moving Waldo Certified Professional - Level 2",
          color: "bg-blue-500",
          benefits: [
            "Access to Level 2 advanced course materials",
            "Advanced certificate of completion",
            "Professional recognition",
            "Priority support access"
          ]
        };
      default:
        return {
          title: "Certification",
          description: "Moving Waldo Certified Professional",
          color: "bg-primary",
          benefits: [
            "Access to course materials",
            "Certificate of completion",
            "Professional recognition"
          ]
        };
    }
  };

  const certDetails = getCertificationDetails(level);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className={`rounded-full p-3 ${certDetails.color}`}>
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary mb-2">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-lg">
            Congratulations! You're now enrolled in {certDetails.title}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {certDetails.description}
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              What's included:
            </h3>
            <ul className="space-y-2">
              {certDetails.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {sessionId && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Transaction ID: {sessionId}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate(`/course/1`)} 
              className="flex-1 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Start Learning
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex-1 flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificationSuccessPage;