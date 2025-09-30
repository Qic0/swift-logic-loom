import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, FileText, Tag, CheckCircle, Clock, Building, Banknote, Camera, Timer, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isValid } from "date-fns";
interface Task {
  id_zadachi: number;
  uuid_zadachi: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  execution_time_seconds?: number;
  responsible_user_name?: string;
  responsible_user_id?: string;
  order_title?: string;
  zakaz_id?: number;
  salary?: number;
  checklist_photo?: string;
}
interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}
const getPriorityColor = (priority: string) => {
  const colors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-warning/10 text-warning-foreground',
    high: 'bg-destructive/10 text-destructive'
  };
  return colors[priority as keyof typeof colors] || 'bg-muted text-muted-foreground';
};
const getPriorityText = (priority: string) => {
  const texts = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };
  return texts[priority as keyof typeof texts] || priority;
};
const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-warning text-warning-foreground',
    in_progress: 'bg-status-progress text-white',
    completed: 'bg-status-done text-white'
  };
  return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
};
const getStatusText = (status: string) => {
  const texts = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Выполнено'
  };
  return texts[status as keyof typeof texts] || status;
};
const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

const formatRemainingTime = (task: Task) => {
  // Для завершенных задач показываем время выполнения
  if (task.status === 'completed' && task.execution_time_seconds) {
    const hours = Math.floor(task.execution_time_seconds / 3600);
    const minutes = Math.floor((task.execution_time_seconds % 3600) / 60);
    
    if (hours > 0) {
      return `Выполнено за ${hours}ч ${minutes}м`;
    } else {
      return `Выполнено за ${minutes}м`;
    }
  }
  
  // Для незавершенных задач показываем оставшееся время
  if (!task.created_at || !task.due_date) return '—';
  
  try {
    const createdDate = new Date(task.created_at);
    const dueDate = new Date(task.due_date);
    
    if (!isValid(createdDate) || !isValid(dueDate)) return '—';
    
    const totalMs = dueDate.getTime() - createdDate.getTime();
    const currentMs = Date.now() - createdDate.getTime();
    const remainingMs = totalMs - currentMs;
    
    if (remainingMs <= 0) {
      const overdueMs = Math.abs(remainingMs);
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
      const overdueMinutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let overdueText = '';
      if (overdueHours > 0) {
        overdueText = `${overdueHours}ч ${overdueMinutes}м`;
      } else {
        overdueText = `${overdueMinutes}м`;
      }
      
      return `Просрочено на ${overdueText}`;
    }
    
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${remainingHours}ч ${remainingMinutes}м`;
  } catch {
    return '—';
  }
};
const TaskDetailsDialog = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}: TaskDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  if (!task) return null;
  const handleCompleteTask = async () => {
    setIsCompleting(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Completing task:', task.id_zadachi, 'responsible_user_id:', task.responsible_user_id, 'salary:', task.salary);
      }
      
      // Update task status and completion date
      const { error: taskError } = await supabase
        .from('zadachi')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id_zadachi', task.id_zadachi);

      if (taskError) throw taskError;

      // Update responsible user's salary if task has salary and responsible user
      if (task.responsible_user_id && task.salary && task.salary > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Updating salary for user:', task.responsible_user_id);
        }
        
        // Проверяем, просрочена ли задача
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();
        const hasPenalty = isOverdue;
        const actualPayment = hasPenalty ? Math.round(task.salary * 0.9) : task.salary;
        
        // Get current user salary and completed tasks
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('salary, completed_tasks')
          .eq('uuid_user', task.responsible_user_id)
          .single();

        if (userFetchError) {
          console.error('Error fetching user salary:', userFetchError);
        } else {
          const currentSalary = userData?.salary || 0;
          const newSalary = currentSalary + actualPayment;
          if (process.env.NODE_ENV === 'development') {
            console.log('Current salary:', currentSalary, 'Adding:', actualPayment, 'New salary:', newSalary, 'Has penalty:', hasPenalty);
          }

          // Get current completed tasks array
          const currentCompletedTasks = (userData as any)?.completed_tasks || [];
          
          // Проверяем, не была ли задача уже добавлена
          const taskAlreadyExists = currentCompletedTasks.some((t: any) => t.task_id === task.id_zadachi);
          
          if (!taskAlreadyExists) {
            const newCompletedTask = {
              task_id: task.id_zadachi,
              payment: actualPayment,
              has_penalty: hasPenalty
            };
            const updatedCompletedTasks = [...currentCompletedTasks, newCompletedTask];

            // Update user salary and completed tasks
            const { data: updateData, error: salaryUpdateError } = await supabase
              .from('users')
              .update({ 
                salary: newSalary,
                completed_tasks: updatedCompletedTasks
              } as any)
              .eq('uuid_user', task.responsible_user_id)
              .select();

            if (salaryUpdateError) {
              console.error('Error updating user salary:', salaryUpdateError);
            } else if (!updateData || updateData.length === 0) {
              console.error('No rows were updated - check RLS policies or user permissions');
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('Salary updated successfully:', updateData[0]);
              }
              // Invalidate all queries that might show user data
              queryClient.invalidateQueries({ queryKey: ['users'] });
              queryClient.invalidateQueries({ queryKey: ['workers'] });
              queryClient.invalidateQueries({ queryKey: ['zadachi'] });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('Task already exists in completed_tasks, skipping addition');
            }
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('No salary update needed - missing user_id or salary');
        }
      }

      const isOverdue = task.due_date && new Date(task.due_date) < new Date();
      const actualPayment = isOverdue && task.salary ? Math.round(task.salary * 0.9) : task.salary;
      
      toast({
        title: "Задача завершена",
        description: task.salary && task.salary > 0 
          ? isOverdue 
            ? `Задача выполнена с штрафом. Зарплата увеличена на ${actualPayment} ₽ (10% штраф за просрочку)`
            : `Задача выполнена. Зарплата увеличена на ${actualPayment} ₽`
          : "Задача успешно помечена как выполненная."
      });
      
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось завершить задачу. Попробуйте еще раз."
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Если задача была завершена, вернуть зарплату пользователю
      if (task.status === 'completed' && task.responsible_user_id && task.salary && task.salary > 0) {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('salary, completed_tasks')
          .eq('uuid_user', task.responsible_user_id)
          .single();

        if (!userFetchError && userData) {
          const currentSalary = userData?.salary || 0;
          const newSalary = Math.max(0, currentSalary - task.salary);
          
          // Удалить задачу из completed_tasks
          const currentCompletedTasks = (userData as any)?.completed_tasks || [];
          const updatedCompletedTasks = currentCompletedTasks.filter(
            (t: any) => t.task_id !== task.id_zadachi
          );

          await supabase
            .from('users')
            .update({ 
              salary: newSalary,
              completed_tasks: updatedCompletedTasks
            } as any)
            .eq('uuid_user', task.responsible_user_id);
        }
      }

      // 2. Удалить задачу из массива vse_zadachi в заказе
      if (task.zakaz_id) {
        const { data: zakazData, error: zakazFetchError } = await supabase
          .from('zakazi')
          .select('vse_zadachi')
          .eq('id_zakaza', task.zakaz_id)
          .single();

        if (!zakazFetchError && zakazData) {
          const currentTasks = zakazData?.vse_zadachi || [];
          const updatedTasks = currentTasks.filter((id: number) => id !== task.id_zadachi);

          await supabase
            .from('zakazi')
            .update({ vse_zadachi: updatedTasks })
            .eq('id_zakaza', task.zakaz_id);
        }
      }

      // 3. Удалить саму задачу
      const { error: deleteError } = await supabase
        .from('zadachi')
        .delete()
        .eq('id_zadachi', task.id_zadachi);

      if (deleteError) throw deleteError;

      toast({
        title: "Задача удалена",
        description: "Задача успешно удалена из системы."
      });

      // Инвалидировать все связанные запросы
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['zadachi'] });
      queryClient.invalidateQueries({ queryKey: ['zakazi'] });
      queryClient.invalidateQueries({ queryKey: ['zakazi-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['orderTasks'] });
      
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить задачу. Попробуйте еще раз."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isCompleted = task.status === 'completed' || task.completed_at;
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[800px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl tracking-tight">
            {task.title}
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className={`${getPriorityColor(task.priority)} font-display font-bold`}>
              {getPriorityText(task.priority)} приоритет
            </Badge>
            <Badge variant="secondary" className={`${getStatusColor(task.status)} font-medium`}>
              {getStatusText(task.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display font-bold text-lg">Информация о задаче</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {task.order_title && <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Заказ</p>
                      <p className="font-semibold">{task.order_title}</p>
                    </div>
                  </div>}

                <div className="flex items-center space-x-3">
                  <Banknote className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Зарплата</p>
                    {task.salary ? (
                      task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date() ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-muted-foreground line-through">{task.salary} ₽</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">Штраф 10%</Badge>
                            <p className="font-semibold text-destructive">{Math.round(task.salary * 0.9)} ₽</p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-semibold">{task.salary} ₽</p>
                      )
                    ) : (
                      <p className="font-semibold">—</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ответственный</p>
                    <p className="font-semibold">{task.responsible_user_name || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Срок выполнения</p>
                    <p className="font-semibold">{formatDate(task.due_date)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {task.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    task.due_date && new Date(task.due_date) < new Date() ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Timer className="w-5 h-5 text-muted-foreground" />
                    )
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {task.status === 'completed' ? 'Время выполнения' : 'Осталось времени'}
                    </p>
                    <p className={`font-semibold ${
                      task.status === 'completed' 
                        ? 'text-green-600' 
                        : task.due_date && new Date(task.due_date) < new Date() 
                          ? 'text-destructive' 
                          : 'text-muted-foreground'
                    }`}>
                      {formatRemainingTime(task)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Создана</p>
                    <p className="font-semibold">{formatDate(task.created_at)}</p>
                  </div>
                </div>

                {task.completed_at && <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Завершена</p>
                      <p className="font-semibold text-green-600">{formatDate(task.completed_at)}</p>
                    </div>
                  </div>}
              </div>

              {task.description && <div className="pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Описание</p>
                      <p className="text-sm leading-relaxed mt-1">{task.description}</p>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Completion Photo */}
          {task.checklist_photo && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display font-bold text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Фото выполненной работы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={task.checklist_photo}
                  alt="Фото выполненной работы"
                  className="w-full max-w-md h-64 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(task.checklist_photo, '_blank')}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Нажмите для увеличения
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Действия */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteTask}
            disabled={isDeleting}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
            {!isCompleted && (
              <Button 
                onClick={handleCompleteTask}
                disabled={isCompleting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isCompleting ? "Завершение..." : "Завершить задачу"}
              </Button>
            )}
          </div>
        </div>
        
      </DialogContent>
    </Dialog>;
};
export default TaskDetailsDialog;