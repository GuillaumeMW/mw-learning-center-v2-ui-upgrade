import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, BookOpen, FileText, ClipboardCheck, CreditCard } from 'lucide-react';

interface FunnelStats {
  total_users: number;
  completed_subsections: number;
  completed_exams: number;
  completed_contracts: number;
  completed_subscriptions: number;
}

const CertificationFunnelKanban = () => {
  const [stats, setStats] = useState<FunnelStats>({
    total_users: 0,
    completed_subsections: 0,
    completed_exams: 0,
    completed_contracts: 0,
    completed_subscriptions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunnelStats();
  }, []);

  const fetchFunnelStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Get users who completed all subsections (have course completions)
      const { count: completedSubsections } = await supabase
        .from('course_completions')
        .select('*', { count: 'exact' });

      // Get users who completed exams (passed exams)
      const { count: completedExams } = await supabase
        .from('certification_workflows')
        .select('*', { count: 'exact' })
        .eq('exam_status', 'passed');

      // Get users who completed contracts (signed contracts)
      const { count: completedContracts } = await supabase
        .from('certification_workflows')
        .select('*', { count: 'exact' })
        .eq('contract_status', 'signed');

      // Get users who completed subscriptions (paid subscriptions)
      const { count: completedSubscriptions } = await supabase
        .from('certification_workflows')
        .select('*', { count: 'exact' })
        .eq('subscription_status', 'paid');

      setStats({
        total_users: totalUsers || 0,
        completed_subsections: completedSubsections || 0,
        completed_exams: completedExams || 0,
        completed_contracts: completedContracts || 0,
        completed_subscriptions: completedSubscriptions || 0
      });
    } catch (error) {
      console.error('Error fetching funnel stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  const funnelStages = [
    {
      title: 'Total Users',
      count: stats.total_users,
      icon: Users,
      color: 'bg-blue-500',
      description: 'All registered users'
    },
    {
      title: 'Completed Training',
      count: stats.completed_subsections,
      icon: BookOpen,
      color: 'bg-green-500',
      description: 'Finished all subsections',
      percentage: calculatePercentage(stats.completed_subsections, stats.total_users)
    },
    {
      title: 'Passed Exam',
      count: stats.completed_exams,
      icon: ClipboardCheck,
      color: 'bg-yellow-500',
      description: 'Successfully passed certification exam',
      percentage: calculatePercentage(stats.completed_exams, stats.completed_subsections)
    },
    {
      title: 'Signed Contract',
      count: stats.completed_contracts,
      icon: FileText,
      color: 'bg-orange-500',
      description: 'Completed contract signing',
      percentage: calculatePercentage(stats.completed_contracts, stats.completed_exams)
    },
    {
      title: 'Active Subscription',
      count: stats.completed_subscriptions,
      icon: CreditCard,
      color: 'bg-purple-500',
      description: 'Activated subscription',
      percentage: calculatePercentage(stats.completed_subscriptions, stats.completed_contracts)
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Certification Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certification Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track user progression through the certification process
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {funnelStages.map((stage, index) => {
            const Icon = stage.icon;
            const isFirst = index === 0;
            
            return (
              <div key={stage.title} className="relative">
                <Card className="h-full border-2 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-full ${stage.color} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isFirst && (
                        <Badge variant="secondary" className="text-xs">
                          {stage.percentage?.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{stage.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {stage.count.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {stage.description}
                    </p>
                    {!isFirst && stage.percentage !== undefined && (
                      <Progress 
                        value={stage.percentage} 
                        className="h-2"
                      />
                    )}
                  </CardContent>
                </Card>
                
                {/* Arrow connector */}
                {index < funnelStages.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <div className="w-4 h-0.5 bg-border"></div>
                    <div className="absolute right-0 top-0 transform -translate-y-1/2">
                      <div className="w-0 h-0 border-l-2 border-r-0 border-t-2 border-b-2 border-l-border border-t-transparent border-b-transparent"></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Conversion Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Training → Exam:</span>
              <span className="ml-2 font-medium">
                {calculatePercentage(stats.completed_exams, stats.completed_subsections).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Exam → Contract:</span>
              <span className="ml-2 font-medium">
                {calculatePercentage(stats.completed_contracts, stats.completed_exams).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Contract → Subscription:</span>
              <span className="ml-2 font-medium">
                {calculatePercentage(stats.completed_subscriptions, stats.completed_contracts).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Overall Completion:</span>
              <span className="ml-2 font-medium">
                {calculatePercentage(stats.completed_subscriptions, stats.total_users).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificationFunnelKanban;