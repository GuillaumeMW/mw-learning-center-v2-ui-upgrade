import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Course, CourseStatus, Section, Subsection } from "@/types/course";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CourseCard from "./CourseCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Loader2, GraduationCap, Target, BookOpen, ArrowRight, Lock, FileText, CheckCircle2, Clock, ClipboardCheck, FileSignature, CreditCard } from "lucide-react";
import certificateBadge from "@/assets/mw-certified-level-1-hori.png";
import CertificationWorkflowCards from "./CertificationWorkflowCards";

interface CourseWithNestedContent extends Course {
  sections?: (Section & { subsections?: Subsection[] })[];
  _totalItems: number;
  _hasStructuredContent: boolean;
}

interface CertificationWorkflow {
  id: string;
  current_step: string;
  exam_status: string;
  admin_approval_status: string;
  contract_status: string;
  subscription_status: string;
}

const CourseDashboard = () => {
  const [courses, setCourses] = useState<CourseWithNestedContent[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [certificationWorkflows, setCertificationWorkflows] = useState<Record<number, CertificationWorkflow>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchUserProgress();
    fetchCertificationWorkflows();
  }, [user]);

  // SEO: update when Level 1 is certified
  useEffect(() => {
    const wf = certificationWorkflows[1];
    const certified = !!(
      wf && (
        wf.current_step === 'completed' ||
        wf.subscription_status === 'active' ||
        wf.subscription_status === 'paid'
      )
    );
    if (certified) {
      document.title = 'Level 1 Certified - Dashboard';
      const desc = 'Level 1 certified. Start booking moves on MovingWaldo and explore Level 2.';
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', desc);
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', window.location.href);
    }
  }, [certificationWorkflows]);
  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections (
            id,
            title,
            order_index,
            subsections (
              id,
              subsection_type,
              duration_minutes
            )
          )
        `)
        .order('level', { ascending: true })
        .order('order_index', { foreignTable: 'sections', ascending: true })
        .order('order_index', { foreignTable: 'sections.subsections', ascending: true });

      if (error) throw error;

      const coursesWithTotals: CourseWithNestedContent[] = (data || []).map(course => {
        let totalItems = 0;
        let hasStructuredContent = false;

        if (course.sections && course.sections.length > 0) {
          hasStructuredContent = true;
          course.sections.forEach(section => {
            if (section.subsections) {
              totalItems += section.subsections.length;
            }
          });
        }

        return {
          ...course,
          sections: course.sections as (Section & { subsections: Subsection[] })[],
          _totalItems: totalItems,
          _hasStructuredContent: hasStructuredContent,
        };
      });

      setCourses(coursesWithTotals);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('course_id, subsection_id, lesson_id, completed_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserProgress(data || []);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const fetchCertificationWorkflows = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('certification_workflows')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const workflowsByLevel = data?.reduce((acc, workflow) => {
        acc[workflow.level] = workflow;
        return acc;
      }, {} as Record<number, CertificationWorkflow>) || {};
      
      setCertificationWorkflows(workflowsByLevel);
    } catch (error) {
      console.error('Error fetching certification workflows:', error);
    }
  };

  const getCourseStatus = (course: Course): CourseStatus => {
    const isWorkflowCompleted = (lvl: number) => {
      const wf = certificationWorkflows[lvl];
      return !!(
        wf && (
          wf.current_step === 'completed' ||
          wf.subscription_status === 'active' ||
          wf.subscription_status === 'paid'
        )
      );
    };

    // Coming soon always locked for users
    if (course.is_coming_soon) {
      return 'coming-soon';
    }

    // If this level already certified, mark completed
    if (isWorkflowCompleted(course.level)) {
      return 'completed';
    }

    // Level 1 availability
    if (course.level === 1) {
      return course.is_available ? 'available' : 'locked';
    }

    // Higher levels unlock when previous level completed
    const prevCompleted = isWorkflowCompleted(course.level - 1);
    return prevCompleted && course.is_available ? 'available' : 'locked';
  };

  const getCurrentCourse = () => {
    // Find the first available course or the first course
    const availableCourse = courses.find(c => getCourseStatus(c) === 'available');
    return availableCourse || courses[0];
  };

  const getCourseProgress = (course: CourseWithNestedContent) => {
    if (!course._totalItems || course._totalItems === 0) {
      return { percentage: 0, completed: 0, total: 0 };
    }

    const completedItemsIds = new Set(userProgress
      .filter(p => p.course_id === course.id && p.completed_at)
      .map(p => p.subsection_id || p.lesson_id)
      .filter(Boolean)
    );

    const completedCount = completedItemsIds.size;
    const totalCount = course._totalItems;

    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return { percentage, completed: completedCount, total: totalCount };
  };

  const hasStartedAnyCourse = () => {
    return userProgress.length > 0;
  };

  const handleStartCourse = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const handleContinueCourse = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const getCertificationStatus = (courseLevel: number) => {
    const workflow = certificationWorkflows[courseLevel];
    if (!workflow) return null;
    
    return {
      status: workflow.current_step,
      examStatus: workflow.exam_status,
      adminApproval: workflow.admin_approval_status,
      contractStatus: workflow.contract_status,
      subscriptionStatus: workflow.subscription_status,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading courses...</span>
        </div>
      </div>
    );
  }

  const currentCourse = getCurrentCourse();
  const courseProgress = currentCourse ? getCourseProgress(currentCourse) : { percentage: 0, completed: 0, total: 0 };
  const hasStarted = hasStartedAnyCourse();

  const level1Workflow = certificationWorkflows[1];
  const isLevel1Certified = !!(
    level1Workflow && (
      level1Workflow.current_step === 'completed' ||
      level1Workflow.subscription_status === 'active' ||
      level1Workflow.subscription_status === 'paid'
    )
  );
  const level2Course = courses.find(c => c.level === 2);


  // For first-time users (no progress), show the new design
  if (!hasStarted && !isLevel1Certified) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-left space-y-4">
          <h1 className="text-3xl font-bold text-black">
            MovingWaldo Certification Program
          </h1>
          <p className="text-black">
            Welcome to the MovingWaldo RS Certification Program! This program is designed to equip you with the knowledge and skills needed to become a certified advisor, helping clients coordinate their moves with confidence and expertise.
          </p>
        </div>

        {/* Certification Badge */}
        <div className="flex">
          <img 
            src={certificateBadge} 
            alt="Level 1 Certification Badge"
            className="w-auto h-24"
          />
        </div>

        {/* Certification Process */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Level 1 Certification Process</h2>
          
          <div className="space-y-4">
            {/* Training */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Training</h3>
                <p className="text-[#242526]">Complete the Level 1 training modules</p>
              </div>
            </div>

            {/* Exam */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/exam')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Exam</h3>
                <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
              </div>
            </div>

            {/* Contract */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/contract')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Contract</h3>
                <p className="text-[#242526]">Review and sign the advisor agreement.</p>
              </div>
            </div>

            {/* Subscription */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/payment')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Subscription</h3>
                <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Training Button */}
        <div className="flex">
          <Button 
            style={{ backgroundColor: '#fa372c' }}
            className="text-white hover:opacity-90 px-6 py-2 text-base font-medium"
            onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Start Level 1 Training
          </Button>
        </div>
      </div>
    );
  }

  // Show Level 1 completion dashboard if certified
  if (isLevel1Certified) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Congratulations{profile?.first_name ? `, ${profile.first_name}` : ''}!</h1>
          <p className="text-muted-foreground">
            You’ve successfully completed all requirements for Level 1 certification. You are now a certified MovingWaldo Relocation Specialist.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 items-center">
          <img src="/placeholder.svg" alt="Start booking moves on MovingWaldo platform" className="rounded-xl border" loading="lazy" />
          <article className="space-y-3">
            <Badge variant="secondary">Level 1 Certified</Badge>
            <h2 className="text-xl font-semibold">Start booking moves and earning commissions</h2>
            <p className="text-muted-foreground">
              Access the standalone platform to begin coordinating moves, managing your business, and maximizing your earning potential.
            </p>
            <Button
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90"
              onClick={() => window.open('https://platform.movingwaldo.com', '_blank')}
            >
              Go to Platform
            </Button>
          </article>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">Next Steps</h3>
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <article className="space-y-2">
              <h4 className="font-semibold">Upgrade to Level 2 Certification</h4>
              <p className="text-muted-foreground">
                Unlock advanced features, higher commission rates, and exclusive benefits by completing the Level 2 certification program.
              </p>
              <Button
                variant="outline"
                onClick={() => level2Course ? navigate(`/course/${level2Course.id}`) : navigate('/courses')}
              >
                Learn More
              </Button>
            </article>
            <img src="/placeholder.svg" alt="Level 2 certification information" className="rounded-xl border md:order-last" loading="lazy" />
          </div>
        </section>
      </div>
    );
  }

  // Check if training is completed (100% progress)
  const isTrainingCompleted = courseProgress.percentage === 100;
  
  // Check if exam is completed and admin approved
  const certificationStatus = getCertificationStatus(1);
  const isExamApproved = certificationStatus?.examStatus === 'passed' && certificationStatus?.adminApproval === 'approved';
  
  // Check if contract is signed and ready for subscription
  const isContractSigned = isExamApproved && certificationStatus?.contractStatus === 'signed';

  // Dashboard for contract signed, ready for subscription
  if (isContractSigned) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-left space-y-4">
          <h1 className="text-3xl font-bold text-black">
            MovingWaldo Certification Program
          </h1>
        </div>

        {/* Subscription Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-black">Activate Your Subscription</h2>
        </div>

        {/* Subscription Description */}
        <div className="space-y-4">
          <p className="text-black">
            Excellent! You've completed all the training requirements and signed your contract. The final step is to activate your monthly subscription plan to gain access to the live platform and receive your official certification. Choose your plan below to get started.
          </p>
          
          {/* Activate Subscription Button */}
          <div className="flex">
            <Button 
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90 px-6 py-2 text-base font-medium"
              onClick={() => navigate('/certification/1/payment')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Activate My Subscription
            </Button>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Next Steps</h2>
          
          <div className="space-y-4">
            {/* Subscription */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/payment')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Subscription</h3>
                <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Completed</h2>
          
          <div className="space-y-4">
            {/* Training Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Training</h3>
                <p className="text-[#242526]">Complete the Level 1 training modules</p>
              </div>
            </div>

            {/* Certification Exam Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/exam')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Certification Exam</h3>
                <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
              </div>
            </div>

            {/* Contract Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/contract')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Contract</h3>
                <p className="text-[#242526]">Review and sign the advisor agreement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for exam completed, ready for contract
  if (isExamApproved) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-left space-y-4">
          <h1 className="text-3xl font-bold text-black">
            MovingWaldo Certification Program
          </h1>
        </div>

        {/* Contract Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-black">Certified Relocation Specialist Contract</h2>
        </div>

        {/* Contract Description */}
        <div className="space-y-4">
          <p className="text-black">
            Congratulations! You passed the Level 1 Exam! You are now trained and ready to book well planned moves for your clients. To gain access to the live platform and get your certificate, all you need to do now is sign your contract with MovingWaldo and activate your monthly subscription plan.
          </p>
          
          {/* Sign Contract Button */}
          <div className="flex">
            <Button 
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90 px-6 py-2 text-base font-medium"
              onClick={() => navigate('/certification/1/contract')}
            >
              Sign my Contract
            </Button>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Next Steps</h2>
          
          <div className="space-y-4">
            {/* Contract */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/contract')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Contract</h3>
                <p className="text-[#242526]">Review and sign the advisor agreement.</p>
              </div>
            </div>

            {/* Subscription */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/payment')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Subscription</h3>
                <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Completed</h2>
          
          <div className="space-y-4">
            {/* Training Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Training</h3>
                <p className="text-[#242526]">Complete the Level 1 training modules</p>
              </div>
            </div>

            {/* Certification Exam Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/exam')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Certification Exam</h3>
                <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for training completed, ready for exam
  if (isTrainingCompleted) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-left space-y-4">
          <h1 className="text-3xl font-bold text-black">
            MovingWaldo Certification Program
          </h1>
        </div>

        {/* Certification Exam Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-black">Certification Exam Level 1</h2>
        </div>

        {/* Exam Description */}
        <div className="space-y-4">
          <p className="text-black">
            Congratulations on completing the training modules! You're now ready to take the Level 1 Exam. This exam assesses your understanding of the material covered in the training and is a crucial step towards becoming a certified MovingWaldo advisor. You have 3 attempts remaining to pass the exam.
          </p>
          
          {/* Start Certification Exam Button */}
          <div className="flex">
            <Button 
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90 px-6 py-2 text-base font-medium"
              onClick={() => navigate('/certification/1/exam')}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Start Certification Exam
            </Button>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Next Steps</h2>
          
          <div className="space-y-4">
            {/* Certification Exam */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/exam')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Certification Exam</h3>
                <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
              </div>
            </div>

            {/* Contract */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/contract')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Contract</h3>
                <p className="text-[#242526]">Review and sign the advisor agreement.</p>
              </div>
            </div>

            {/* Subscription */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => navigate('/certification/1/payment')}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Subscription</h3>
                <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-black">Completed</h2>
          
          <div className="space-y-4">
            {/* Training Completed */}
            <div 
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Training</h3>
                <p className="text-[#242526]">Complete the Level 1 training modules</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for users with progress (training started but not completed)
  return (
    <div className="max-w-[960px] mx-auto px-4 space-y-8">
      {/* Header Section */}
      <div className="text-left space-y-4">
        <h1 className="text-3xl font-bold text-black">
          MovingWaldo Certification Program
        </h1>
      </div>

      {/* Training Level Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-black">Training Level 1</h2>
      </div>

      {/* Progress Section */}
      {currentCourse && courseProgress.total > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-black">Training Progress</span>
              <span className="text-black font-semibold">{courseProgress.percentage}%</span>
            </div>
            <Progress value={courseProgress.percentage} className="h-2" />
            <span className="text-sm text-[#242526]">
              {courseProgress.completed}/{courseProgress.total} subsections completed
            </span>
          </div>
          
          {/* Continue Training Button */}
          <div className="flex">
            <Button 
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90 px-6 py-2 text-base font-medium"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue Level 1 Training
            </Button>
          </div>
        </div>
      )}

      {/* Next Steps Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-black">Next Steps</h2>
        
        <div className="space-y-4">
          {/* Certification Exam */}
          <div 
            className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
            onClick={() => navigate('/certification/1/exam')}
          >
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">Certification Exam</h3>
              <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
            </div>
          </div>

          {/* Contract */}
          <div 
            className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
            onClick={() => navigate('/certification/1/contract')}
          >
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSignature className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">Contract</h3>
              <p className="text-[#242526]">Review and sign the advisor agreement.</p>
            </div>
          </div>

          {/* Subscription */}
          <div 
            className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
            onClick={() => navigate('/certification/1/payment')}
          >
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">Subscription</h3>
              <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDashboard;
