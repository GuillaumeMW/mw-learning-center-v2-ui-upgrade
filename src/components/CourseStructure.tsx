import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Section, Subsection, UserProgress } from "@/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CommentThread } from "@/components/CommentThread";
import { 
  ChevronDown, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  Circle,
  FileText,
  HelpCircle,
  Clock,
  BookOpen,
  Download
} from "lucide-react";

interface CourseStructureProps {
  courseId: string;
}

export const CourseStructure = ({ courseId }: CourseStructureProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [selectedSubsection, setSelectedSubsection] = useState<Subsection | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      fetchCourseStructure();
      if (user) {
        fetchUserProgress();
      }
    }
  }, [courseId, user]);

  useEffect(() => {
    if (selectedSubsection) {
      fetchAttachments(selectedSubsection.id);
    }
  }, [selectedSubsection]);

  // Auto-expand first section and select first subsection
  useEffect(() => {
    if (sections.length > 0 && userProgress.length >= 0 && !loading && !selectedSubsection) {
      const firstSection = sections[0];
      if (firstSection && firstSection.subsections && firstSection.subsections.length > 0) {
        setExpandedSections(new Set([firstSection.id]));
        setSelectedSubsection(firstSection.subsections[0]);
      }
    }
  }, [sections, userProgress, loading, selectedSubsection]);

  const fetchCourseStructure = async () => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          id,
          title,
          description,
          order_index,
          course_id,
          created_at,
          updated_at,
          subsections (
            id,
            title,
            video_url,
            subsection_type,
            order_index,
            duration_minutes,
            section_id,
            content,
            quiz_url,
            quiz_height,
            created_at,
            updated_at
          )
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
        .order('order_index', { foreignTable: 'subsections', ascending: true });

      if (sectionsError) throw sectionsError;

      const formattedSections = sectionsData?.map(section => ({
        ...section,
        subsections: section.subsections?.map(sub => ({
          ...sub,
          subsection_type: sub.subsection_type as 'content' | 'quiz'
        })) || []
      })) || [];

      setSections(formattedSections);
    } catch (error) {
      console.error('Error fetching course structure:', error);
      toast({
        title: "Error",
        description: "Failed to load course structure. Please try again.",
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
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserProgress(data || []);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const fetchAttachments = async (subsectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('subsection_attachments')
        .select('*')
        .eq('subsection_id', subsectionId);

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAttachments([]);
    }
  };

  const isSubsectionCompleted = (subsectionId: string) => {
    return userProgress.some(progress => 
      progress.subsection_id === subsectionId && progress.completed_at
    );
  };

  const handleSubsectionClick = (subsection: Subsection) => {
    setSelectedSubsection(subsection);
  };

  const handleMarkComplete = async (subsectionId: string) => {
    if (!user || isSubsectionCompleted(subsectionId)) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          subsection_id: subsectionId,
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
        });

      if (error) throw error;

      // Refresh progress
      fetchUserProgress();
      
      toast({
        title: "Progress Saved",
        description: "Subsection marked as complete!",
      });
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const completedItems = new Set(userProgress.filter(p => p.completed_at).map(p => p.subsection_id).filter(Boolean));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading course structure...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              This course structure is being prepared. Please check back soon!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <Card className="border border-gray-200 sticky top-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-black mb-4">Course Content</h3>
            <div className="space-y-2">
              {sections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div 
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
                      expandedSections.has(section.id) ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="text-sm font-medium text-gray-700">{section.title}</span>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.has(section.id) && (
                    <div className="ml-4 space-y-1">
                      {section.subsections?.map((subsection) => {
                        const isCompleted = completedItems.has(subsection.id);
                        return (
                          <div
                            key={subsection.id}
                            className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer hover:bg-gray-100 ${
                              selectedSubsection?.id === subsection.id ? 'bg-primary/10 text-primary' : 'text-gray-600'
                            }`}
                            onClick={() => handleSubsectionClick(subsection)}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isCompleted ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className="truncate">{subsection.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3">
        {selectedSubsection ? (
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              {/* Subsection Header */}
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-black mb-2">{selectedSubsection.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {selectedSubsection.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedSubsection.duration_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {selectedSubsection.subsection_type === 'quiz' ? 'Quiz' : 'Content'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {completedItems.has(selectedSubsection.id) && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkComplete(selectedSubsection.id)}
                      disabled={completedItems.has(selectedSubsection.id)}
                    >
                      {completedItems.has(selectedSubsection.id) ? "Completed" : "Mark Complete"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content Display */}
              <div className="space-y-6">
                {selectedSubsection.video_url && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <VideoPlayer 
                      videoUrl={selectedSubsection.video_url}
                      onProgress={() => {}}
                      onComplete={() => handleMarkComplete(selectedSubsection.id)}
                    />
                  </div>
                )}

                {selectedSubsection.content && (
                  <div 
                    className="prose prose-gray max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedSubsection.content }}
                  />
                )}

                {selectedSubsection.subsection_type === 'quiz' && selectedSubsection.quiz_url && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      src={selectedSubsection.quiz_url}
                      width="100%"
                      height={selectedSubsection.quiz_height || 800}
                      frameBorder="0"
                      allowFullScreen
                      title={`Quiz: ${selectedSubsection.title}`}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-black mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Attachments
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.display_name || attachment.file_name}
                            </p>
                            {attachment.file_size && (
                              <p className="text-xs text-gray-500">
                                {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="border-t border-gray-200 pt-6">
                  <CommentThread 
                    subsectionId={selectedSubsection.id}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a lesson to begin</h3>
              <p className="text-gray-600">Choose a section from the navigation to start learning.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};