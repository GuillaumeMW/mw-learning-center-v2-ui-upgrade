import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Section, Subsection, UserProgress } from "@/types/course";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  Circle,
  FileText,
  HelpCircle
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CourseStructureProps {
  courseId: string;
}

export const CourseStructure = ({ courseId }: CourseStructureProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
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

  // New useEffect to determine initial expanded section once data is loaded
  useEffect(() => {
    if (sections.length > 0 && userProgress.length >= 0 && !loading) {
      let firstUncompletedSectionId: string | null = null;

      // Find the first section that contains an uncompleted subsection
      for (const section of sections) {
        if (section.subsections) {
          const hasUncompletedSubsection = section.subsections.some(
            (subsection) => !isSubsectionCompleted(subsection.id)
          );
          if (hasUncompletedSubsection) {
            firstUncompletedSectionId = section.id;
            break; // Found the target section, stop searching
          }
        }
      }

      // If all subsections are completed or no uncompleted found, default to first section
      if (!firstUncompletedSectionId && sections.length > 0) {
        firstUncompletedSectionId = sections[0].id;
      }

      if (firstUncompletedSectionId) {
        setExpandedSections(new Set([firstUncompletedSectionId]));
      } else {
        setExpandedSections(new Set()); // No sections to expand (e.g., no content or still loading)
      }
    }
  }, [sections, userProgress, loading]);

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

      // Map to ensure subsection_type is correctly typed
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

  const isSubsectionCompleted = (subsectionId: string) => {
    return userProgress.some(progress => 
      progress.subsection_id === subsectionId && progress.completed_at
    );
  };

  const handleSubsectionClick = (subsection: Subsection) => {
    navigate(`/course/${courseId}/subsection/${subsection.id}`);
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

  const getSubsectionIcon = (subsection: Subsection) => {
    if (subsection.subsection_type === 'quiz') {
      return <HelpCircle className="h-4 w-4" />;
    }
    return subsection.video_url ? <Play className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  const getSubsectionTypeLabel = (subsection: Subsection) => {
    if (subsection.subsection_type === 'quiz') {
      return 'Quiz';
    }
    return subsection.video_url ? 'Video' : 'Reading';
  };

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
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="bg-white border border-gray-200 rounded-lg">
          <Collapsible 
            open={expandedSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-[#fa372c] text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {sectionIndex + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-black">{section.title}</h3>
                      {section.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {section.subsections?.length || 0} items
                    </span>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-6 pb-6">
                <div className="space-y-2">
                  {section.subsections?.map((subsection, subsectionIndex) => {
                    const isCompleted = isSubsectionCompleted(subsection.id);
                    
                    return (
                      <button
                        key={subsection.id}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => handleSubsectionClick(subsection)}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          {getSubsectionIcon(subsection)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {sectionIndex + 1}.{subsectionIndex + 1}
                            </span>
                            <span className="font-medium text-black">{subsection.title}</span>
                          </div>
                          {subsection.duration_minutes && (
                            <span className="text-xs text-gray-500">
                              {subsection.duration_minutes} minutes
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {getSubsectionTypeLabel(subsection)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  );
};