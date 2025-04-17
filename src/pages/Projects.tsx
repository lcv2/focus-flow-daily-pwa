
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowRightIcon, Trash2Icon, EditIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import ProjectForm from "@/components/ProjectForm";
import { db, Project, ProjectCategory, Task } from "@/lib/db";
import { toast } from "@/hooks/use-toast";

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [category, setCategory] = useState<ProjectCategory | "all">("all");
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        let projectsList: Project[];
        
        if (category === "all") {
          projectsList = await db.getAllProjects();
        } else {
          projectsList = await db.getProjectsByCategory(category);
        }
        
        setProjects(projectsList);
        
        // Load tasks for each project
        const tasksMap: Record<string, Task[]> = {};
        for (const project of projectsList) {
          const tasks = await db.getTasksByProject(project.id);
          tasksMap[project.id] = tasks;
        }
        
        setProjectTasks(tasksMap);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };
    
    loadProjects();
  }, [category]);
  
  // Handle project refresh
  const refreshProjects = async () => {
    try {
      let projectsList: Project[];
      
      if (category === "all") {
        projectsList = await db.getAllProjects();
      } else {
        projectsList = await db.getProjectsByCategory(category);
      }
      
      setProjects(projectsList);
      
      // Load tasks for each project
      const tasksMap: Record<string, Task[]> = {};
      for (const project of projectsList) {
        const tasks = await db.getTasksByProject(project.id);
        tasksMap[project.id] = tasks;
      }
      
      setProjectTasks(tasksMap);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };
  
  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      await db.deleteProject(projectToDelete.id);
      
      toast({
        title: "Projet supprimé",
        description: "Le projet a été supprimé avec succès",
      });
      
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      refreshProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du projet",
        variant: "destructive",
      });
    }
  };
  
  // Calculate project stats
  const getProjectStats = (projectId: string) => {
    const tasks = projectTasks[projectId] || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completedAt !== null).length;
    const pendingTasks = totalTasks - completedTasks;
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };
  };
  
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
        <h1 className="text-2xl md:text-4xl font-bold">Projets</h1>
        <Button 
          onClick={() => setProjectFormOpen(true)}
          className="w-full md:w-auto bg-focus-orange hover:bg-focus-orange/90"
        >
          <PlusIcon size={16} className="mr-2" />
          Ajouter un projet
        </Button>
      </div>
      
      {/* Category Filter */}
      <div className="mb-8">
        <ToggleGroup 
          type="single" 
          value={category} 
          onValueChange={(value) => value && setCategory(value as ProjectCategory | "all")}
          className="justify-start"
        >
          <ToggleGroupItem value="all">Tous</ToggleGroupItem>
          <ToggleGroupItem value="travail">Travail</ToggleGroupItem>
          <ToggleGroupItem value="apprentissage">Apprentissage</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const stats = getProjectStats(project.id);
            
            return (
              <Card key={project.id} className="overflow-hidden border-t-4" style={{ borderTopColor: project.couleurHex }}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{project.nom}</span>
                    <span className="text-sm font-normal px-2 py-1 rounded-full bg-gray-200">
                      {project.categorie === "travail" ? "Travail" : "Apprentissage"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">En cours</p>
                      <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Terminées</p>
                      <p className="text-2xl font-bold">{stats.completedTasks}</p>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${stats.progress}%`,
                        backgroundColor: project.couleurHex 
                      }}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500"
                    onClick={() => {
                      setProjectToDelete(project);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2Icon size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500"
                    onClick={() => {
                      // TODO: Edit project functionality
                      toast({
                        title: "À venir",
                        description: "La modification de projet sera disponible dans une prochaine version",
                      });
                    }}
                  >
                    <EditIcon size={16} />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-100 rounded-2xl">
          <p className="text-gray-500 mb-4">Aucun projet trouvé</p>
          <Button 
            onClick={() => setProjectFormOpen(true)}
            className="bg-focus-orange hover:bg-focus-orange/90"
          >
            <PlusIcon size={16} className="mr-2" />
            Ajouter un projet
          </Button>
        </div>
      )}
      
      {/* Project Form Modal */}
      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        onProjectAdded={refreshProjects}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le projet</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projectToDelete?.nom}" ? 
              Toutes les tâches associées seront également supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProject}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
