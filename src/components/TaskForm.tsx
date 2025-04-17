
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { db, Project, TaskType } from "@/lib/db";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAdded: () => void;
}

const TaskForm = ({ open, onOpenChange, onTaskAdded }: TaskFormProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("passif");
  const [estHours, setEstHours] = useState(1);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  
  // Load projects when component mounts
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await db.getAllProjects();
        setProjects(allProjects);
        
        // Set default project if available
        if (allProjects.length > 0 && !projectId) {
          setProjectId(allProjects[0].id);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };
    
    if (open) {
      loadProjects();
    }
  }, [open, projectId]);
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setTaskType("passif");
      setEstHours(1);
      setDueDate(new Date());
    }
  }, [open]);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }
    
    if (!projectId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un projet",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await db.addTask({
        projectId,
        titre: title,
        type: taskType,
        estHeures: estHours,
        dueDate,
        completedAt: null,
      });
      
      toast({
        title: "Tâche ajoutée",
        description: "La tâche a été ajoutée avec succès",
      });
      
      onOpenChange(false);
      onTaskAdded();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de la tâche",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une tâche</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Project Select */}
          <div className="grid gap-2">
            <Label htmlFor="project">Projet</Label>
            <Select 
              value={projectId} 
              onValueChange={setProjectId}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.couleurHex }}
                      />
                      {project.nom} - {project.categorie === 'travail' ? 'Travail' : 'Apprentissage'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Task Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
            />
          </div>
          
          {/* Task Type */}
          <div className="grid gap-2">
            <Label htmlFor="taskType">Intensité</Label>
            <div className="flex items-center justify-between">
              <span>Passif</span>
              <Switch
                id="taskType"
                checked={taskType === "intensif"}
                onCheckedChange={(checked) => setTaskType(checked ? "intensif" : "passif")}
              />
              <span>Intensif</span>
            </div>
          </div>
          
          {/* Estimated Hours */}
          <div className="grid gap-2">
            <Label>Estimation (heures)</Label>
            <div className="py-4">
              <Slider
                value={[estHours]}
                min={1}
                max={4}
                step={1}
                onValueChange={(value) => setEstHours(value[0])}
              />
              <div className="flex justify-between mt-2">
                <span>1h</span>
                <span>2h</span>
                <span>3h</span>
                <span>4h</span>
              </div>
            </div>
          </div>
          
          {/* Due Date */}
          <div className="grid gap-2">
            <Label>Date d'échéance</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dueDate, "P", { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            className="bg-focus-orange hover:bg-focus-orange/90"
          >
            Ajouter une tâche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
