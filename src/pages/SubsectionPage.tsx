import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Section, Subsection, UserProgress, SubsectionAttachment } from "@/types/course";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CommentThread } from "@/components/CommentThread";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Play,
  FileText,
  HelpCircle,
  Download
} from "lucide-react";

export const SubsectionPage = () => {
  const { courseId, subsectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subsection, setSubsection] = useState<Subsection | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [allSubsections, setAllSubsections] = useState<Subsection[]>([]);
  const [attachments, setAttachments] = useState<SubsectionAttachment[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (subsectionId && courseId) {
      fetchSubsectionData();
    }
  }, [subsectionId, courseId, user]);

  const fetchSubsectionData = async () => {
    const startTime = performance.now();
    try {
      // Optimized: Single query to fetch subsection with section info using joins
      const { data: subsectionData, error: subsectionError } = await supabase
        .from('subsections')
        .select(`
          *,
          sections!inner (
            *
          )
        `)
        .eq('id', subsectionId)
        .single();

      if (subsectionError) throw subsectionError;
      
      const section = subsectionData.sections;
      setSubsection({
        ...subsectionData,
        subsection_type: subsectionData.subsection_type as 'content' | 'quiz'
      });
      setSection(section);

      // Optimized: Get navigation data - use simpler approach to avoid ordering issues
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;

      const { data: navigationData, error: navigationError } = await supabase
        .from('subsections')
        .select('*')
        .in('section_id', sectionsData.map(s => s.id))
        .order('order_index', { ascending: true });

      if (navigationError) throw navigationError;

      // Sort subsections by section order, then by subsection order
      const sortedSubsections = navigationData.sort((a, b) => {
        const sectionA = sectionsData.find(s => s.id === a.section_id);
        const sectionB = sectionsData.find(s => s.id === b.section_id);
        
        if (sectionA.order_index !== sectionB.order_index) {
          return sectionA.order_index - sectionB.order_index;
        }
        return a.order_index - b.order_index;
      });

      setAllSubsections(sortedSubsections.map(subsection => ({
        ...subsection,
        subsection_type: subsection.subsection_type as 'content' | 'quiz'
      })));

      // Optimized: Check completion status only if user exists
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('subsection_id', subsectionId)
          .maybeSingle();

        if (progressError) throw progressError;
        setIsCompleted(!!progressData?.completed_at);
      }

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('subsection_attachments')
        .select('*')
        .eq('subsection_id', subsectionId)
        .order('created_at', { ascending: true });

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // Performance monitoring
      const endTime = performance.now();
      console.log(`SubsectionPage data fetch took ${endTime - startTime} milliseconds`);
    } catch (error) {
      console.error('Error fetching subsection data:', error);
      toast({
        title: "Error",
        description: "Failed to load subsection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSubsection = async () => {
    if (!user || !subsection) return;

    setCompleting(true);
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          subsection_id: subsection.id,
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
        });

      if (error) throw error;

      setIsCompleted(true);
      
      // Check if user has completed all subsections and create certification workflow if needed
      await checkAndCreateCertificationWorkflow();
      
      toast({
        title: "Subsection Completed!",
        description: `Great job completing "${subsection.title}"`,
      });
    } catch (error) {
      console.error('Error completing subsection:', error);
      toast({
        title: "Error",
        description: "Failed to mark subsection as complete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  const checkAndCreateCertificationWorkflow = async () => {
    if (!user || !courseId) return;

    try {
      // Get all subsections for this course
      const { data: courseSubsections, error: subsectionsError } = await supabase
        .from('subsections')
        .select('id')
        .in('section_id', (
          await supabase
            .from('sections')
            .select('id')
            .eq('course_id', courseId)
        ).data?.map(s => s.id) || []);

      if (subsectionsError) throw subsectionsError;

      // Get user's completed subsections for this course
      const { data: completedProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('subsection_id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .not('completed_at', 'is', null);

      if (progressError) throw progressError;

      const totalSubsections = courseSubsections.length;
      const completedSubsections = completedProgress.filter(p => p.subsection_id).length;

      // If all subsections are completed, check if certification workflow exists
      console.log('Checking workflow creation:', { 
        totalSubsections, 
        completedSubsections, 
        shouldCreate: totalSubsections > 0 && completedSubsections >= totalSubsections 
      });
      
      if (totalSubsections > 0 && completedSubsections >= totalSubsections) {
        console.log('All subsections completed, checking for existing workflow...');
        
        // Get course details to get the level
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('level')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error getting course data:', courseError);
          throw courseError;
        }
        
        console.log('Course data:', courseData);

        // Check if certification workflow already exists
        const { data: existingWorkflow, error: workflowError } = await supabase
          .from('certification_workflows')
          .select('id')
          .eq('user_id', user.id)
          .eq('level', courseData.level)
          .maybeSingle();

        if (workflowError) {
          console.error('Error checking existing workflow:', workflowError);
          throw workflowError;
        }
        
        console.log('Existing workflow check:', existingWorkflow);

        // Create certification workflow if it doesn't exist
        if (!existingWorkflow) {
          console.log('Creating new certification workflow...');
          const { error: createError } = await supabase
            .from('certification_workflows')
            .insert({
              user_id: user.id,
              course_id: courseId,
              level: courseData.level,
              current_step: 'exam',
              exam_status: 'pending_submission',
              admin_approval_status: 'pending',
              contract_status: 'not_required',
              subscription_status: 'not_required'
            });

          if (createError) {
            console.error('Error creating certification workflow:', createError);
            throw createError;
          } else {
            console.log('Certification workflow created successfully!');
          }
        } else {
          console.log('Certification workflow already exists');
        }
      }
    } catch (error) {
      console.error('Error checking/creating certification workflow:', error);
      // Don't show error to user as this is a background process
    }
  };

  const getCurrentSubsectionIndex = () => {
    return allSubsections.findIndex(s => s.id === subsectionId);
  };

  const getNextSubsection = () => {
    const currentIndex = getCurrentSubsectionIndex();
    return currentIndex < allSubsections.length - 1 ? allSubsections[currentIndex + 1] : null;
  };

  const getPreviousSubsection = () => {
    const currentIndex = getCurrentSubsectionIndex();
    return currentIndex > 0 ? allSubsections[currentIndex - 1] : null;
  };

  const handleNextSubsection = () => {
    const next = getNextSubsection();
    if (next) {
      navigate(`/course/${courseId}/subsection/${next.id}`);
    }
  };

  const handlePreviousSubsection = () => {
    const previous = getPreviousSubsection();
    if (previous) {
      navigate(`/course/${courseId}/subsection/${previous.id}`);
    }
  };

  const getSubsectionIcon = () => {
    if (!subsection) return <FileText className="h-5 w-5" />;
    
    if (subsection.subsection_type === 'quiz') {
      return <HelpCircle className="h-5 w-5" />;
    }
    return subsection.video_url ? <Play className="h-5 w-5" /> : <FileText className="h-5 w-5" />;
  };

  const getSubsectionTypeLabel = () => {
    if (!subsection) return 'Content';
    
    if (subsection.subsection_type === 'quiz') {
      return 'Quiz';
    }
    return subsection.video_url ? 'Video Lesson' : 'Reading Material';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subsection...</p>
        </div>
      </div>
    );
  }

  if (!subsection || !section) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Subsection Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The subsection you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate(`/course/${courseId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/course/${courseId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{section.title}</Badge>
          <Badge variant={subsection.subsection_type === 'quiz' ? 'destructive' : 'default'}>
            {getSubsectionTypeLabel()}
          </Badge>
          {isCompleted && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="text-center text-sm text-muted-foreground">
        Subsection {getCurrentSubsectionIndex() + 1} of {allSubsections.length}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getSubsectionIcon()}
            {subsection.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Player */}
          {subsection.video_url && (
            <VideoPlayer
              videoUrl={subsection.video_url}
              onProgress={() => {}}
            />
          )}
          
          {/* Content */}
          {subsection.content && (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: subsection.content }}
                className="whitespace-pre-wrap"
              />
            </div>
          )}

          {/* Quiz iframe */}
          {subsection.subsection_type === 'quiz' && subsection.quiz_url && (
            <div className="w-full">
              <iframe
                src={subsection.quiz_url}
                className="w-full border-0 rounded-lg"
                style={{ height: `${subsection.quiz_height || 800}px` }}
                title={`Quiz: ${subsection.title}`}
                loading="lazy"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => {
                  // Scroll to top of iframe when content loads/changes (e.g., after form submission)
                  const iframe = document.querySelector(`iframe[title="Quiz: ${subsection.title}"]`);
                  if (iframe) {
                    iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              />
            </div>
          )}

          {/* Quiz placeholder when no URL */}
          {subsection.subsection_type === 'quiz' && !subsection.quiz_url && (
            <div className="bg-muted p-6 rounded-lg text-center">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No quiz URL configured for this subsection.
              </p>
            </div>
          )}

          {/* PDF Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Supporting Documents</h3>
              <div className="grid gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{attachment.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(1)} MB` : 'PDF Document'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(attachment.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousSubsection}
          disabled={!getPreviousSubsection()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-4">
          {!isCompleted && user && (
            <Button onClick={handleCompleteSubsection} disabled={completing}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {completing ? "Marking Complete..." : "Mark as Complete"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleNextSubsection}
            disabled={!getNextSubsection()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation - Additional bottom navigation for mobile */}
      <div className="md:hidden flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousSubsection}
          disabled={!getPreviousSubsection()}
          className="flex-1 mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextSubsection}
          disabled={!getNextSubsection()}
          className="flex-1 ml-2"
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Comments - Hidden for now */}
      {/* <CommentThread subsectionId={subsection.id} /> */}
    </div>
  );
};