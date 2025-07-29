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
import { Loader2, GraduationCap, Target, BookOpen, ArrowRight, Lock, FileText, CheckCircle2, Clock } from "lucide-react";
import certificateBadge from "@/assets/certificate-level1.png";
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
    // Level 1 is available if marked as available
    if (course.level === 1 && course.is_available) {
      return 'available';
    }
    
    // Other levels are either locked or coming soon
    if (course.level > 1) {
      if (course.is_coming_soon) {
        return 'locked'; // Locked because previous levels need completion
      }
      return 'locked';
    }
    
    // If not available and is coming soon
    if (course.is_coming_soon) {
      return 'coming-soon';
    }
    
    return 'locked';
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

  // For first-time users (no progress), show the new design
  if (!hasStarted) {
    return (
      <div className="max-w-[960px] mx-auto px-4 space-y-8">
        {/* Header Section */}
        <div className="text-left space-y-4">
          <h1 className="text-4xl font-bold text-black">
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
          <h2 className="text-2xl font-bold text-black">Level 1 Certification Process</h2>
          
          <div className="space-y-4">
            {/* Training */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Training</h3>
                <p className="text-[#242526]">Complete the Level 1 training modules</p>
              </div>
            </div>

            {/* Exam */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Exam</h3>
                <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
              </div>
            </div>

            {/* Contract */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Contract</h3>
                <p className="text-[#242526]">Review and sign the advisor agreement.</p>
              </div>
            </div>

            {/* Subscription */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Subscription</h3>
                <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Training Button */}
        <div className="flex">
          <Button 
            style={{ backgroundColor: '#fa372c' }}
            className="text-white hover:opacity-90 px-8 py-3 text-lg font-medium"
            onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
          >
            Start Level 1 Training
          </Button>
        </div>
      </div>
    );
  }

  // Dashboard for users with progress (training started)
  return (
    <div className="max-w-[960px] mx-auto px-4 space-y-8">
      {/* Header Section */}
      <div className="text-left space-y-4">
        <h1 className="text-4xl font-bold text-black">
          MovingWaldo Certification Program
        </h1>
      </div>

      {/* Training Level Subtitle */}
      <div>
        <h2 className="text-2xl font-bold text-black">Training Level 1</h2>
      </div>

      {/* Progress Section */}
      {currentCourse && courseProgress.total > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-black">Training Progress</span>
              <span className="text-black font-semibold">{courseProgress.percentage}%</span>
            </div>
            <Progress value={courseProgress.percentage} className="h-3" />
            <span className="text-sm text-[#242526]">
              {courseProgress.completed}/{courseProgress.total} subsections completed
            </span>
          </div>
          
          {/* Continue Training Button */}
          <div className="flex">
            <Button 
              style={{ backgroundColor: '#fa372c' }}
              className="text-white hover:opacity-90 px-8 py-3 text-lg font-medium"
              onClick={() => currentCourse && navigate(`/course/${currentCourse.id}`)}
            >
              Continue Level 1 Training
            </Button>
          </div>
        </div>
      )}

      {/* Next Steps Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-black">Next Steps</h2>
        
        <div className="space-y-4">
          {/* Certification Exam */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Certification Exam</h3>
              <p className="text-[#242526]">Pass the Level 1 exam to proceed.</p>
            </div>
          </div>

          {/* Contract */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Contract</h3>
              <p className="text-[#242526]">Review and sign the advisor agreement.</p>
            </div>
          </div>

          {/* Subscription */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C6D1E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Subscription</h3>
              <p className="text-[#242526]">Choose a subscription plan to activate your certification.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDashboard;
