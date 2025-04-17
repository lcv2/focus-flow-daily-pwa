
import { useEffect, useState } from "react";
import { db, Task } from "@/lib/db";
import { format, subDays, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface DayData {
  date: Date;
  dayName: string;
  value: number;
  count: { total: number; completed: number };
}

const WeeklyHeatmap = () => {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        // Get dates for the last 7 days (including today)
        const today = startOfDay(new Date());
        const dates = Array.from({ length: 7 }, (_, i) => {
          return subDays(today, 6 - i); // Start from 6 days ago
        });
        
        // Get all tasks
        const tasks = await db.getAllTasks();
        
        // Calculate data for each day
        const dayData = dates.map(date => {
          const nextDay = addDays(date, 1);
          
          // Get tasks due on this day
          const dayTasks = tasks.filter(task => {
            const taskDate = startOfDay(new Date(task.dueDate));
            return taskDate >= date && taskDate < nextDay;
          });
          
          const totalTasks = dayTasks.length;
          const completedTasks = dayTasks.filter(task => task.completedAt !== null).length;
          
          // Calculate completion percentage
          const value = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          
          return {
            date,
            dayName: format(date, 'EEE', { locale: fr }).charAt(0).toUpperCase(),
            value,
            count: { total: totalTasks, completed: completedTasks }
          };
        });
        
        setWeekData(dayData);
      } catch (error) {
        console.error("Error loading week data:", error);
      }
    };
    
    loadWeekData();
  }, []);
  
  const getColorClass = (value: number) => {
    if (value === 0) return "bg-gray-200";
    if (value < 25) return "bg-focus-red";
    if (value < 50) return "bg-focus-orange";
    if (value < 75) return "bg-focus-yellow";
    return "bg-focus-green";
  };
  
  const isToday = (date: Date) => {
    const today = startOfDay(new Date());
    return date.getTime() === today.getTime();
  };
  
  return (
    <div className="mt-8">
      <h3 className="section-title">Vue semaine</h3>
      <div className="grid grid-cols-7 gap-2">
        {weekData.map((day, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="mb-1 text-sm font-medium">
              {day.dayName}
            </div>
            <div 
              className={`${getColorClass(day.value)} h-16 w-full rounded-md ${isToday(day.date) ? 'ring-2 ring-focus-orange' : ''}`}
              title={`${day.count.completed}/${day.count.total} tâches complétées`}
            >
              <div className="flex h-full items-center justify-center">
                {day.count.total > 0 && (
                  <span className="text-xs font-bold text-white">
                    {Math.round(day.value)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyHeatmap;
