
import { useEffect, useState } from "react";
import { db, Project, Task } from "@/lib/db";
import { Progress } from "@/components/ui/progress";

interface ProjectProgressProps {
  project: Project;
}

const ProjectProgress = ({ project }: ProjectProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [taskCount, setTaskCount] = useState({ total: 0, completed: 0 });
  
  useEffect(() => {
    const loadProjectProgress = async () => {
      try {
        const tasks = await db.getTasksByProject(project.id);
        
        // Count completed tasks for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayTasks = tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          return taskDate >= today && taskDate < tomorrow;
        });
        
        const completedTasks = todayTasks.filter(task => task.completedAt !== null);
        
        // Calculate progress
        const total = todayTasks.length;
        const completed = completedTasks.length;
        
        setTaskCount({ total, completed });
        setProgress(total > 0 ? (completed / total) * 100 : 0);
      } catch (error) {
        console.error("Error loading project progress:", error);
      }
    };
    
    loadProjectProgress();
  }, [project.id]);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">{project.nom}</h3>
        <span className="text-sm font-medium">
          {taskCount.completed} / {taskCount.total}
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-3 bg-gray-200" 
        indicatorClassName={`bg-[${project.couleurHex}]`}
      />
    </div>
  );
};

export default ProjectProgress;
