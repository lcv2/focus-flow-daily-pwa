
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftIcon } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import { db, Project, Task } from "@/lib/db";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Définir les types de filtres
type TaskFilter = "overdue" | "today" | "upcoming" | "completed";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("today");
  const [progress, setProgress] = useState(0);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Charger le projet et ses tâches
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      
      try {
        const projectData = await db.projects.get(id);
        if (projectData) {
          setProject(projectData);
        }
        
        const projectTasks = await db.getTasksByProject(id);
        setTasks(projectTasks);
        
        // Marquer les dates avec des tâches pour le calendrier
        const dates = new Set<string>();
        projectTasks.forEach(task => {
          const dateStr = new Date(task.dueDate).toISOString().split('T')[0];
          dates.add(dateStr);
          
          if (task.completedAt) {
            const completedDateStr = new Date(task.completedAt).toISOString().split('T')[0];
            dates.add(completedDateStr);
          }
        });
        
        setSelectedDates(Array.from(dates).map(dateStr => new Date(dateStr)));
        
        // Calculer le progrès
        const total = projectTasks.length;
        const completed = projectTasks.filter(task => task.completedAt !== null).length;
        setProgress(total > 0 ? (completed / total) * 100 : 0);
        
        // Appliquer le filtre initial
        filterTasks(projectTasks, activeFilter);
      } catch (error) {
        console.error("Error loading project details:", error);
      }
    };
    
    loadProject();
  }, [id, lastRefresh]);
  
  // Filtrer les tâches en fonction du filtre actif
  const filterTasks = (allTasks: Task[], filter: TaskFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let filtered: Task[] = [];
    
    switch (filter) {
      case "overdue":
        filtered = allTasks.filter(task => {
          const dueDate = new Date(task.dueDate);
          return dueDate < today && task.completedAt === null;
        });
        break;
      
      case "today":
        filtered = allTasks.filter(task => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate < tomorrow && task.completedAt === null;
        });
        break;
      
      case "upcoming":
        filtered = allTasks.filter(task => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= tomorrow && task.completedAt === null;
        });
        break;
      
      case "completed":
        filtered = allTasks.filter(task => task.completedAt !== null);
        break;
    }
    
    setFilteredTasks(filtered);
  };
  
  // Gérer le changement de filtre
  const handleFilterChange = (filter: TaskFilter) => {
    setActiveFilter(filter);
    filterTasks(tasks, filter);
  };
  
  // Rafraîchir les données
  const refreshData = () => {
    setLastRefresh(new Date());
  };
  
  // Fonction pour personnaliser le rendu des jours dans le calendrier
  const isDayWithTask = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return selectedDates.some(d => d.toISOString().split('T')[0] === dateStr);
  };
  
  if (!project) {
    return (
      <div className="container py-6 text-center">
        <p>Chargement du projet...</p>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
        </Link>
        <h1 
          className="text-2xl md:text-4xl font-bold flex-1"
          style={{ color: project.couleurHex }}
        >
          {project.nom}
        </h1>
        <span className="text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
          {project.categorie === 'travail' ? 'Travail' : 'Apprentissage'}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Progression</h3>
          <span className="text-sm font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress 
          value={progress} 
          className={`h-4 bg-gray-200`}
          style={{ 
            '--progress-color': project.couleurHex 
          } as React.CSSProperties}
        />
      </div>
      
      {/* Tasks Tabs */}
      <div className="mb-8">
        <h2 className="section-title">Tâches</h2>
        
        <Tabs defaultValue={activeFilter} onValueChange={(value) => handleFilterChange(value as TaskFilter)}>
          <TabsList className="mb-4">
            <TabsTrigger value="overdue">En retard</TabsTrigger>
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="upcoming">À venir</TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeFilter}>
            {filteredTasks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    onUpdate={refreshData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <p className="text-gray-500">Aucune tâche {activeFilter === "completed" ? "terminée" : ""}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Calendar View */}
      <div className="mb-8">
        <h2 className="section-title">Calendrier</h2>
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            className="mx-auto"
            locale={fr}
            modifiers={{
              withTask: (date) => isDayWithTask(date)
            }}
            modifiersClassNames={{
              withTask: "bg-orange-100 text-orange-600 font-bold"
            }}
          />
          <div className="mt-4 text-sm text-center text-gray-500">
            Les dates en surbrillance indiquent les jours avec des tâches dues ou complétées.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
