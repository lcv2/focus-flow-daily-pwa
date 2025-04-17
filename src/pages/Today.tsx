
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import ProjectProgress from "@/components/ProjectProgress";
import WeeklyHeatmap from "@/components/WeeklyHeatmap";
import TaskForm from "@/components/TaskForm";
import { db, Task, Project } from "@/lib/db";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Today = () => {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Task-Project mapping for quick lookup
  const [projectMap, setProjectMap] = useState<Record<string, Project>>({});
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load projects
        const allProjects = await db.getAllProjects();
        setProjects(allProjects);
        
        // Create project map for quick lookup
        const projectMapping: Record<string, Project> = {};
        allProjects.forEach(project => {
          projectMapping[project.id] = project;
        });
        setProjectMap(projectMapping);
        
        // Load tasks
        const overdueTasksList = await db.getOverdueTasks();
        const todayTasksList = await db.getTodayTasks();
        
        setOverdueTasks(overdueTasksList);
        setTodayTasks(todayTasksList);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    
    loadData();
  }, [lastRefresh]);
  
  // Handle data refresh
  const refreshData = () => {
    setLastRefresh(new Date());
  };
  
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold">
          {format(new Date(), "EEEE d MMMM", { locale: fr })}
        </h1>
      </div>
      
      {/* Add Task Button */}
      <Button 
        onClick={() => setTaskFormOpen(true)}
        className="mb-8 w-full md:w-auto bg-focus-orange hover:bg-focus-orange/90"
      >
        <PlusIcon size={16} className="mr-2" />
        Ajouter une tâche
      </Button>
      
      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title">Tâches en retard</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overdueTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                project={projectMap[task.projectId]}
                onUpdate={refreshData}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Today's Tasks Section */}
      <div className="mb-8">
        <h2 className="section-title">Tâches du jour</h2>
        {todayTasks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                project={projectMap[task.projectId]}
                onUpdate={refreshData}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-2xl">
            <p className="text-gray-500">Aucune tâche pour aujourd'hui</p>
          </div>
        )}
      </div>
      
      {/* Project Progress Section */}
      <div className="mb-8">
        <h2 className="section-title">Progression par projet</h2>
        <div className="space-y-4">
          {projects.map(project => (
            <ProjectProgress key={project.id} project={project} />
          ))}
        </div>
      </div>
      
      {/* Weekly Heatmap */}
      <WeeklyHeatmap />
      
      {/* Task Form Modal */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onTaskAdded={refreshData}
      />
    </div>
  );
};

export default Today;
