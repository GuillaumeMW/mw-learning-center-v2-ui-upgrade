import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  course_progress: {
    total_courses: number;
    completed_courses: number;
    overall_progress: number;
  };
  current_step: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  // Function to determine current step based on progress and workflow status
  const getCurrentStep = (
    overallProgress: number,
    totalSubsections: number,
    completedSubsections: number,
    workflowData: any
  ): string => {
    // Check if all training is completed
    const trainingCompleted = totalSubsections > 0 && completedSubsections === totalSubsections;
    
    if (!trainingCompleted) {
      return 'Training';
    }
    
    // If no workflow exists yet, user is ready for exam
    if (!workflowData) {
      return 'Exam';
    }
    
    // Check workflow status
    if (workflowData.subscription_status === 'paid') {
      return 'Certified';
    }
    
    if (workflowData.contract_status === 'signed') {
      return 'Subscription';
    }
    
    if (workflowData.admin_approval_status === 'approved') {
      return 'Contract';
    }
    
    // If exam is passed or approved by admin, next step is contract
    if (workflowData.exam_status === 'passed' || workflowData.admin_approval_status === 'approved') {
      return 'Contract';
    }
    
    // Default to exam if workflow exists but not completed
    return 'Exam';
  };

  // Function to get badge variant for current step
  const getStepBadgeVariant = (step: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (step) {
      case 'Training':
        return 'secondary';
      case 'Exam':
        return 'outline';
      case 'Contract':
        return 'default';
      case 'Subscription':
        return 'default';
      case 'Certified':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const fetchUsers = async (
    currentSortConfig: { key: string; direction: 'asc' | 'desc' },
    page: number,
    limit: number,
    searchTerm: string
  ) => {
    setLoading(true);
    try {
      // Check if user is authenticated and has a valid session
      if (!user || !session) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in as an admin to view this data',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Call the secure edge function to get user data with the session token
      const { data: usersResponse, error: usersError } = await supabase.functions.invoke('fetch-user-data-for-admin', {
        body: {}, // Fetch all users
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (usersError) throw usersError;

      const allUsersData = usersResponse?.data || [];

      // Apply search filter
      let filteredUsers = allUsersData;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        filteredUsers = allUsersData.filter((user: any) =>
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower) ||
          user.phone_number?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      filteredUsers.sort((a: any, b: any) => {
        let aValue, bValue;
        
        switch (currentSortConfig.key) {
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'last_name':
            aValue = a.last_name || '';
            bValue = b.last_name || '';
            break;
          default:
            aValue = a[currentSortConfig.key] || '';
            bValue = b[currentSortConfig.key] || '';
        }

        if (aValue < bValue) return currentSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });

      setTotalUsersCount(filteredUsers.length);

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);

      // Get user progress data for pagination subset
      const paginatedUserIds = paginatedUsers.map((u: any) => u.user_id);
      
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          course_id,
          subsection_id,
          completed_at
        `)
        .in('user_id', paginatedUserIds)
        .not('completed_at', 'is', null);

      if (progressError) throw progressError;

      // Get available courses and subsections for progress calculation
      const { data: availableCoursesData, error: availableCoursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('is_available', true);

      if (availableCoursesError) throw availableCoursesError;

      const availableCourseIds = availableCoursesData?.map(c => c.id) || [];

      const { data: sectionsForSubsections, error: sectionsForSubsectionsError } = await supabase
        .from('sections')
        .select('id')
        .in('course_id', availableCourseIds);

      if (sectionsForSubsectionsError) throw sectionsForSubsectionsError;

      const sectionIdsForSubsections = sectionsForSubsections?.map(s => s.id) || [];

      const { data: subsectionsData, error: subsectionsError } = await supabase
        .from('subsections')
        .select('id, section_id')
        .in('section_id', sectionIdsForSubsections);

      if (subsectionsError) throw subsectionsError;

      const totalAvailableSubsections = subsectionsData?.length || 0;

      // Get certification workflows for pagination subset
      const { data: workflowData, error: workflowError } = await supabase
        .from('certification_workflows')
        .select(`
          user_id,
          course_id,
          level,
          current_step,
          exam_status,
          contract_status,
          subscription_status,
          admin_approval_status
        `)
        .in('user_id', paginatedUserIds);

      if (workflowError) throw workflowError;

      // Process the paginated user data
      const processedUsersData: UserData[] = paginatedUsers.map((user: any) => {
        const userProgressFiltered = progressData?.filter(p => p.user_id === user.user_id) || [];
        const workflowsForUser = (workflowData || []).filter(w => w.user_id === user.user_id);
        const userWorkflow = workflowsForUser[0] || null;

        // Calculate overall progress based on completed subsections in available courses
        const completedSubsections = userProgressFiltered.filter(p =>
          p.subsection_id &&
          p.completed_at &&
          availableCourseIds.includes(p.course_id)
        ).length;

        const overallProgress = totalAvailableSubsections > 0
          ? Math.round((completedSubsections / totalAvailableSubsections) * 100)
          : 0;

        // Determine current step
        const currentStep = getCurrentStep(
          overallProgress,
          totalAvailableSubsections,
          completedSubsections,
          userWorkflow
        );

        return {
          id: user.user_id,
          email: user.email,
          created_at: user.created_at,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          course_progress: {
            total_courses: availableCourseIds.length,
            completed_courses: workflowsForUser.filter(w => (
              (w.current_step === 'completed' || w.subscription_status === 'paid') &&
              availableCourseIds.includes(w.course_id)
            )).length,
            overall_progress: overallProgress,
          },
          current_step: currentStep,
        };
      });

      setUsers(processedUsersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prevSortConfig => {
      let direction: 'asc' | 'desc' = 'asc';
      if (prevSortConfig.key === key && prevSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setCurrentPage(1);
      return { key, direction };
    });
  };

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers(sortConfig, currentPage, itemsPerPage, debouncedSearchTerm);
  }, [sortConfig, currentPage, itemsPerPage, debouncedSearchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{totalUsersCount} total users</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsersCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('created_at')}
                >
                  Registration Date
                  {sortConfig.key === 'created_at' && (
                    sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('last_name')}
                >
                  Name
                  {sortConfig.key === 'last_name' && (
                    sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                  )}
                </TableHead>
                <TableHead>Current Course Progress</TableHead>
                <TableHead>Current Step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                >
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true
                      })}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{user.course_progress.overall_progress}%</span>
                      </div>
                      <Progress
                        value={user.course_progress.overall_progress}
                        className="h-2"
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-center">
                      <Badge variant={getStepBadgeVariant(user.current_step)}>
                        {user.current_step}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-end space-x-2 p-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
              {Array.from({ length: Math.ceil(totalUsersCount / itemsPerPage) }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationNext 
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsersCount / itemsPerPage), prev + 1))}
                className={currentPage === Math.ceil(totalUsersCount / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationContent>
          </Pagination>
        </div>
      </Card>
    </div>
  );
};

export default UsersManagement;