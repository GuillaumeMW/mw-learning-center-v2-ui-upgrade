import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminRedirect from "@/components/AdminRedirect";
import AdminLayout from "@/components/admin/AdminLayout";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import CoursePage from "./pages/CoursePage";
// Legacy LessonPage removed
import { SubsectionPage } from "./pages/SubsectionPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import UserDetail from "./pages/admin/UserDetail";
import ContentManagement from "./pages/admin/ContentManagement";
import SubsectionEditor from "./pages/admin/SubsectionEditor";
import ProgressAnalytics from "./pages/admin/ProgressAnalytics";
import CertificationReview from "./pages/admin/CertificationReview";
import CertificationExamPage from "./pages/CertificationExamPage";
import ContractSigningPage from "./pages/ContractSigningPage";
import SubscriptionPaymentPage from "./pages/SubscriptionPaymentPage";
import CertificationSuccessPage from "./pages/CertificationSuccessPage";
import NotFound from "./pages/NotFound";
import StyleGuide from "./pages/StyleGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AdminRedirect>
                    <Layout>
                      <Index />
                    </Layout>
                  </AdminRedirect>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/course/:courseId" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <CoursePage />
                  </Layout>
                </ProtectedRoute>
              } 
            />
// Legacy lesson route removed
            <Route 
              path="/course/:courseId/subsection/:subsectionId" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SubsectionPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLayout>
                      <Routes>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<UsersManagement />} />
                        <Route path="users/:userId" element={<UserDetail />} />
                        <Route path="content" element={<ContentManagement />} />
                        <Route path="content/subsection/:sectionId" element={<SubsectionEditor />} />
                        <Route path="analytics" element={<ProgressAnalytics />} />
                        <Route path="certifications" element={<CertificationReview />} />
                        {/* Future admin routes will go here */}
                      </Routes>
                    </AdminLayout>
                  </AdminRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/account-settings" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <AccountSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/certification/:level/exam" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <CertificationExamPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/certification/:level/contract" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContractSigningPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/certification/:level/payment" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SubscriptionPaymentPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/certification-success" 
              element={
                <ProtectedRoute>
                  <CertificationSuccessPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/auth" element={<Layout showNavigation={false}><Auth /></Layout>} />
            <Route 
              path="/style-guide" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <StyleGuide />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
