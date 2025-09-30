import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, DollarSign, CheckCircle, Camera, AlertCircle, Calendar, User, Award, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import TaskCompletionDialog from '@/components/TaskCompletionDialog';
import UserHeader from '@/components/UserHeader';
type Task = Database['public']['Tables']['zadachi']['Row'];
const WorkerDashboard = () => {
  const {
    user,
    isUserOnline
  } = useAuth();
  const {
    toast
  } = useToast();
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Получаем данные пользователя из базы
  const {
    data: userData
  } = useQuery({
    queryKey: ['worker-user-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data,
        error
      } = await supabase.from('users').select('salary, completed_tasks').eq('uuid_user', user.id).single();
      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const fetchTasks = async () => {
    if (!user) return;
    try {
      const {
        data: tasks
      } = await supabase.from('zadachi').select(`
        *,
        zakazi(title, client_name)
      `).eq('responsible_user_id', user.id);
      if (tasks) {
        setCurrentTasks(tasks.filter(t => t.status !== 'completed'));
        setCompletedTasks(tasks.filter(t => t.status === 'completed'));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('ru-RU');
  };
  const calculateEarnings = (tasks: Task[]) => {
    return tasks.reduce((sum, task) => sum + (task.salary || 0), 0);
  };
  const calculateTimeRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = due.getTime() - currentTime.getTime();
    if (diff <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        isOverdue: true
      };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
    const seconds = Math.floor(diff % (1000 * 60) / 1000);
    return {
      hours,
      minutes,
      seconds,
      isOverdue: false
    };
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>;
  }
  return <div className="min-h-screen bg-background pt-14">
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar_url} className="object-cover" />
                <AvatarFallback>
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Онлайн индикатор */}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${user?.id && isUserOnline(user.id) ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.full_name || user?.email}</h2>
              <p className="text-muted-foreground capitalize">{user?.role || 'Сотрудник'}</p>
              <p className="text-muted-foreground">
                У вас {currentTasks.length} активных задач
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Активные задачи</p>
                    <p className="text-2xl font-bold">{currentTasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Выполнено</p>
                    <p className="text-2xl font-bold">{completedTasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Заказы в работе</p>
                    <p className="text-2xl font-bold">{calculateEarnings(currentTasks)} ₽</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  <div>
                     <p className="text-sm text-muted-foreground">Заработано</p>
                     <p className="text-2xl font-bold">{userData?.salary || 0} ₽</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="current">Текущие задачи</TabsTrigger>
            <TabsTrigger value="completed">Выполненные</TabsTrigger>
            <TabsTrigger value="profile">Личный кабинет</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <div className="grid gap-4">
              {currentTasks.length === 0 ? <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">У вас нет активных задач</p>
                  </CardContent>
                </Card> : currentTasks.map(task => <Card key={task.uuid_zadachi} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {(task as any).zakazi && (
                            <div className="flex items-center gap-2 mt-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">{(task as any).zakazi.title}</span>
                                <span className="mx-1.5">·</span>
                                <span className="italic">{(task as any).zakazi.client_name}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-base px-4 py-2">
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-3xl px-6 py-4 font-bold">
                            {task.salary} ₽
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-muted-foreground">{task.description}</p>
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Срок: {formatTime(task.due_date)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button onClick={() => setSelectedTask(task)} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Завершить задачу
                              </Button>
                              
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Camera className="h-4 w-4" />
                                Требуется фото
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {(() => {
                        const timeLeft = calculateTimeRemaining(task.due_date);
                        return <div className={`text-center py-6 px-8 rounded-lg ${timeLeft.isOverdue ? 'bg-destructive/10 animate-pulse' : 'bg-primary/10 animate-pulse'}`}>
                                  <div className="text-sm text-muted-foreground mb-2">Осталось времени:</div>
                                  <div className={`font-display font-bold text-5xl ${timeLeft.isOverdue ? 'text-destructive' : 'text-primary'}`}>
                                    {String(timeLeft.hours).padStart(2, '0')}:
                                    {String(timeLeft.minutes).padStart(2, '0')}:
                                    {String(timeLeft.seconds).padStart(2, '0')}
                                  </div>
                                </div>;
                      })()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completedTasks.length === 0 ? <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">У вас нет выполненных задач</p>
                  </CardContent>
                </Card> : <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      История выполненных задач
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedTasks.map(task => <div key={task.uuid_zadachi} className="bg-card border border-card-border rounded-lg p-6 micro-lift hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="font-display font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                  {task.title}
                                </span>
                              </div>
                              
                              {task.description && <div className="flex items-start gap-3 text-muted-foreground">
                                  <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                                    <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                  </div>
                                  <span className="font-body text-base">{task.description}</span>
                                </div>}
                              
                               {task.completed_at && <div className="flex items-center gap-3 text-muted-foreground">
                                   <Calendar className="h-4 w-4" />
                                   <span className="font-body text-sm">
                                     Завершено: {formatTime(task.completed_at)}
                                   </span>
                                 </div>}
                               
                               {task.execution_time_seconds && <div className="flex items-center gap-3 text-muted-foreground">
                                   <Clock className="h-4 w-4" />
                                   <span className="font-body text-sm">
                                     Время выполнения: {Math.floor(task.execution_time_seconds / 3600)}ч {Math.floor(task.execution_time_seconds % 3600 / 60)}м
                                   </span>
                                 </div>}
                            </div>
                            
                            <div className="text-right ml-4">
                              <Badge className="bg-success/10 text-success border-success/20 font-display font-semibold text-lg px-4 py-2">
                                +{task.salary} ₽
                              </Badge>
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Личная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Имя</label>
                    <p className="text-lg">{user?.full_name || 'Не указано'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Должность</label>
                    <p className="text-lg capitalize">{user?.role || 'Не указано'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Статистика заработка
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Всего выполнено задач</label>
                    <p className="text-2xl font-bold">{completedTasks.length}</p>
                  </div>
                   <div>
                     <label className="text-sm font-medium text-muted-foreground">Общая сумма заработка</label>
                     <p className="text-2xl font-bold text-green-600">{userData?.salary || 0} ₽</p>
                   </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">К получению</label>
                    <p className="text-2xl font-bold text-blue-600">{calculateEarnings(currentTasks)} ₽</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {selectedTask && <TaskCompletionDialog task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} onComplete={() => {
        setSelectedTask(null);
        fetchTasks();
        toast({
          title: "Задача завершена",
          description: "Задача успешно отмечена как выполненная"
        });
      }} />}
      </div>
    </div>;
};
export default WorkerDashboard;