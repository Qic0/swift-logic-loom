import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AutomationSetting } from './useAutomationSettings';
import { fromZonedTime } from 'date-fns-tz';

export const useAutoTaskCreation = () => {
  // Загружаем настройки автоматизации
  const { data: automationSettings = [] } = useQuery({
    queryKey: ['automation-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*');
      
      if (error) throw error;
      return data as AutomationSetting[];
    },
  });

  const createTaskForStage = async (orderId: string, orderNumericId: number, newStage: string, orderTitle: string) => {
    try {
      // Находим настройки для этого этапа
      const stageSettings = automationSettings.find(setting => setting.stage_id === newStage);
      
      if (!stageSettings) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Настройки автоматизации не найдены для этапа: ${newStage}`);
        }
        return;
      }

      if (!stageSettings.responsible_user_id) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Ответственный не назначен для этапа: ${newStage}`);
        }
        return;
      }

      // Заменяем плейсхолдеры в шаблонах
      const taskTitle = stageSettings.task_title_template.replace('#{order_id}', orderNumericId.toString());
      const taskDescription = stageSettings.task_description_template + ` (Заказ: ${orderTitle})`;

      // Вычисляем дату выполнения в московском времени
      const moscowDate = new Date();
      moscowDate.setDate(moscowDate.getDate() + stageSettings.duration_days);
      
      // Конвертируем московское время в UTC
      const utcDate = fromZonedTime(moscowDate, 'Europe/Moscow');

      // Создаем задачу - получаем максимальный id_zadachi для инкремента
      const { data: maxIdData } = await supabase
        .from('zadachi')
        .select('id_zadachi')
        .order('id_zadachi', { ascending: false })
        .limit(1);

      const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id_zadachi + 1 : 1;

      const { error } = await supabase
        .from('zadachi')
        .insert({
          id_zadachi: nextId,
          title: taskTitle,
          description: taskDescription,
          responsible_user_id: stageSettings.responsible_user_id,
          zakaz_id: orderNumericId,
          due_date: utcDate.toISOString(),
          salary: stageSettings.payment_amount,
          priority: 'medium',
          status: 'pending'
        });

      if (error) {
        console.error('Ошибка создания автоматической задачи:', error);
        toast.error('Ошибка создания автоматической задачи');
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Автоматически создана задача для этапа ${newStage}`);
      }
      toast.success(`Создана задача для этапа "${stageSettings.stage_name}"`);

    } catch (error) {
      console.error('Ошибка при создании автоматической задачи:', error);
      toast.error('Ошибка при создании автоматической задачи');
    }
  };

  return {
    createTaskForStage,
    automationSettings,
  };
};