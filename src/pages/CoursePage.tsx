import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Course, Section } from "@/types/course";
import { CourseStructure } from "@/components/CourseStructure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  CheckCircle, 
  Target,
  GraduationCap,
  FileText
} from "lucide-react";

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  // removed legacy lessons state
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState(0);
  // removed legacy hasStructuredContent flag
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [certificationWorkflow, setCertificationWorkflow] = useState<any>(null);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseData();
      fetchCertificationWorkflow();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    if (!courseId || !user) return;

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Always use structured sections/subsections flow
      const { data: sectionIdsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .eq('course_id', courseId);

      if (sectionsError) throw sectionsError;
      const sectionIds = sectionIdsData?.map(s => s.id) || [];

      const { data: subsectionsData, error: subsectionsError } = await supabase
        .from('subsections')
        .select('id, section_id')
        .in('section_id', sectionIds);

      if (subsectionsError) throw subsectionsError;

      // Fetch user progress for subsections
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('subsection_id, completed_at')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      const completed = new Set(progressData?.map(p => p.subsection_id).filter(Boolean) || []);
      setCompletedItems(completed);

      // Calculate progress for sections/subsections
      const totalSubsections = subsectionsData?.length || 0;
      const completedCount = completed.size;
      const progress = totalSubsections > 0 ? Math.round((completedCount / totalSubsections) * 100) : 0;
      setCourseProgress(progress);
      setTotalItemsCount(totalSubsections);
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificationWorkflow = async () => {
    if (!course?.level || !user) return;

    try {
      const { data, error } = await supabase
        .from('certification_workflows')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', course.level)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCertificationWorkflow(data);
    } catch (error) {
      console.error('Error fetching certification workflow:', error);
    }
  };

// removed legacy lesson navigation helpers

  const getTotalItems = () => {
    return totalItemsCount;
  };

  const getCompletedCount = () => {
    return completedItems.size;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-4">Course not found</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Badges */}
        <div className="flex items-center gap-3 mb-6">
          <Badge 
            variant="outline" 
            className="bg-[#fa372c] text-white border-[#fa372c] px-3 py-1 text-sm font-medium"
          >
            Level {course.level}
          </Badge>
          <Badge 
            variant="outline" 
            className="bg-gray-100 text-gray-700 border-gray-300 px-3 py-1 text-sm"
          >
            Structured Course
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-[32px] font-bold text-black mb-4 leading-tight">
          {course.title}
        </h1>
        
        {/* Description */}
        {course.description && (
          <p className="text-gray-600 text-base mb-8 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Progress Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-black" />
            <h2 className="text-xl font-bold text-black">Your Progress</h2>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm">
              {getCompletedCount()} of {getTotalItems()} items completed
            </span>
            <span className="text-black font-bold text-lg">{courseProgress}%</span>
          </div>
          <Progress value={courseProgress} className="h-2 bg-gray-200" />
        </div>

        {/* Certification Section */}
        {courseProgress === 100 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Certification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!certificationWorkflow ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Congratulations! You've completed this course. Start your certification process.
                  </p>
                  <Button 
                    onClick={() => navigate(`/certification/${course.level}/exam`)}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Start Certification Process
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Certification Status:</span>
                    <Badge variant="outline">{certificationWorkflow.current_step}</Badge>
                  </div>
                  
                  {certificationWorkflow.current_step === 'exam' && certificationWorkflow.exam_status === 'pending_submission' && (
                    <Button 
                      onClick={() => navigate(`/certification/${course.level}/exam`)}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Take Certification Exam
                    </Button>
                  )}
                  
                  {certificationWorkflow.current_step === 'admin_approval' && certificationWorkflow.admin_approval_status === 'approved' && (
                    <Button 
                      onClick={() => navigate(`/certification/${course.level}/contract`)}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Sign Contract
                    </Button>
                  )}
                  
                  {certificationWorkflow.current_step === 'contract' && certificationWorkflow.contract_status === 'signed' && (
                    <Button 
                      onClick={() => navigate(`/certification/${course.level}/payment`)}
                      className="w-full"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Complete Payment
                    </Button>
                  )}
                  
                  {certificationWorkflow.subscription_status === 'active' && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Certification Complete!</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

{/* removed legacy course overview stats for lessons */}

        {/* Course Content */}
        <CourseStructure 
          courseId={courseId!} 
          onProgressUpdate={fetchCourseData}
        />
      </div>
  );
};

export default CoursePage;