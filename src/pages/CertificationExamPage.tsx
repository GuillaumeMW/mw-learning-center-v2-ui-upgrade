import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CertificationWorkflow {
  current_step: string;
  exam_status: string;
  admin_approval_status: string;
}

const CertificationExamPage = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [examUrl, setExamUrl] = useState<string>('');
  const [workflow, setWorkflow] = useState<CertificationWorkflow | null>(null);
  const [allSectionsCompleted, setAllSectionsCompleted] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [hasStartedCertification, setHasStartedCertification] = useState(false);

  useEffect(() => {
    if (user && level) {
      fetchExamDetails();
    }
  }, [user, level]);

  const fetchExamDetails = async () => {
    try {
      const levelNum = parseInt(level!);
      
      // Get course data including exam configuration
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, exam_instructions, exam_url, exam_duration_minutes')
        .eq('level', levelNum)
        .single();

      if (courseData) {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select(`
            id,
            subsections (
              id
            )
          `)
          .eq('course_id', courseData.id);

        // Get user progress for all subsections
        const allSubsectionIds = sectionsData?.flatMap(s => s.subsections.map(sub => sub.id)) || [];
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('subsection_id, completed_at')
          .eq('user_id', user!.id)
          .in('subsection_id', allSubsectionIds);

        const completedSubsectionIds = progressData?.filter(p => p.completed_at).map(p => p.subsection_id) || [];
        const allCompleted = allSubsectionIds.length > 0 && allSubsectionIds.every(id => completedSubsectionIds.includes(id));
        setAllSectionsCompleted(allCompleted);

        // Fetch certification workflow
        const { data: workflowData, error: workflowError } = await supabase
          .from('certification_workflows')
          .select('current_step, exam_status, admin_approval_status')
          .eq('user_id', user!.id)
          .eq('level', levelNum)
          .maybeSingle();

        if (workflowError) {
          throw workflowError;
        }

        const certificationExists = !!workflowData;

        console.log("Debug check before insert:"); // NEW LOG
        console.log("All sections completed:", allCompleted); // NEW LOG
        console.log("Certification workflow exists:", certificationExists); // NEW LOG
        console.log("Existing workflow data:", workflowData); // NEW LOG

        // ----- REVISED LOGIC -----
        // Only attempt to insert if a workflow doesn't exist and prerequisites are met.
        if (allCompleted && !certificationExists) {
            const { error: insertError } = await supabase
                .from('certification_workflows')
                .insert({
                    user_id: user.id,
                    level: levelNum,
                    course_id: courseData.id,
                    current_step: 'exam',
                    exam_status: 'pending_submission',
                    admin_approval_status: 'pending',
                    contract_status: 'not_required',
                    subscription_status: 'not_required',
                });

            if (insertError) {
                console.error('Error creating certification workflow entry:', insertError);
                toast({
                    title: 'Error',
                    description: 'Failed to start certification process.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Certification Started',
                    description: 'Your certification process has begun!',
                });
                // Update the component's state to reflect the new workflow without re-fetching
                setWorkflow({
                  current_step: 'exam',
                  exam_status: 'pending_submission',
                  admin_approval_status: 'pending',
                });
                setHasStartedCertification(true);
            }
        } else {
          // If a workflow already exists, just update the state
          setWorkflow(workflowData);
          setHasStartedCertification(certificationExists);
        }

        // This section now runs for all cases, ensuring examUrl and course are always set
        let prefilledExamUrl = courseData.exam_url || '';
        if (user?.id && level && prefilledExamUrl) {
          const examCodeEntryId = "entry.2020796157";
          const levelEntryId = "entry.1742429722";

          prefilledExamUrl = `${prefilledExamUrl}?${examCodeEntryId}=${encodeURIComponent(user.id)}&${levelEntryId}=${level}`;
        }
        setExamUrl(prefilledExamUrl);
        setCourse(courseData);
      }
    } catch (error) {
      console.error('Error fetching exam details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getExamStatusInfo = () => {
    if (!workflow) {
      return {
        status: 'not_started',
        message: 'Exam not yet started',
        color: 'secondary' as const,
        icon: BookOpen
      };
    }

    switch (workflow.exam_status) {
      case 'pending_submission':
        return {
          status: 'pending',
          message: 'Ready to take exam',
          color: 'default' as const,
          icon: BookOpen
        };
      case 'submitted':
        return {
          status: 'submitted',
          message: 'Exam submitted, pending review',
          color: 'secondary' as const,
          icon: CheckCircle2
        };
      case 'passed':
        return {
          status: 'passed',
          message: 'Exam passed',
          color: 'default' as const,
          icon: CheckCircle2
        };
      case 'failed':
        return {
          status: 'failed',
          message: 'Exam failed - retake available',
          color: 'destructive' as const,
          icon: AlertCircle
        };
      default:
        return {
          status: 'unknown',
          message: 'Unknown status',
          color: 'secondary' as const,
          icon: AlertCircle
        };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading exam details...</span>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getExamStatusInfo();
  const canTakeExam = allSectionsCompleted && (
    !workflow || 
    workflow.exam_status === 'pending_submission' || 
    workflow.exam_status === 'failed'
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Level {level} Certification Exam</h1>
          <p className="text-muted-foreground">
            Complete your certification exam to proceed to the next step
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <statusInfo.icon className="h-5 w-5" />
              Exam Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Status:</span>
              <Badge variant={statusInfo.color}>{statusInfo.message}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">All Sections Completed:</span>
              <Badge variant={allSectionsCompleted ? 'default' : 'secondary'}>
                {allSectionsCompleted ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites Warning */}
        {!allSectionsCompleted && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Prerequisites Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">
                You must complete all training sections before taking the certification exam.
                Please return to the course and finish all content.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => course?.id ? navigate(`/course/${course.id}`) : navigate('/')}
              >
                Return to Course
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exam Instructions */}
        {canTakeExam && examUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Exam Instructions</CardTitle>
              <CardDescription>
                Please read these instructions carefully before starting your exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {course?.exam_instructions || 'Please complete this certification exam to demonstrate your knowledge of the Relocation Specialist program.'}
                </div>
                {course?.exam_duration_minutes && (
                  <p className="text-sm font-medium">
                    Recommended time: {course.exam_duration_minutes} minutes
                  </p>
                )}
              </div>
              
              <div className="pt-4">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => window.open(examUrl, '_blank')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* No Exam URL Warning */}
        {canTakeExam && !examUrl && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Exam Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">
                The exam for this level is not currently available. Please contact support for assistance.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Already Submitted */}
        {workflow && (workflow.exam_status === 'submitted' || workflow.exam_status === 'passed') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Exam Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your exam has been submitted and is being reviewed. You will be notified of the results.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/')}
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CertificationExamPage;
