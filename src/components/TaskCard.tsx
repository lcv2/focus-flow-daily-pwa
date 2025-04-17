
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlayIcon, SquareIcon, CheckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { db, Task, Project } from "@/lib/db";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  project: Project;
  onUpdate: () => void;
}

const TaskCard = ({ task, project, onUpdate }: TaskCardProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [pauseMinutes, setPauseMinutes] = useState(0);
  const [ressenti, setRessenti] = useState<number>(3);
  
  // Check if task is overdue
  const isOverdue = task.dueDate < new Date() && task.dueDate.getDate() !== new Date().getDate();
  
  // Get card class based on task status
  const getCardClass = () => {
    if (task.completedAt) return "card-task-completed";
    if (isOverdue) return "card-task-overdue";
    return "card-task-today";
  };
  
  // Format the due date
  const formatDueDate = () => {
    return formatDistanceToNow(task.dueDate, { addSuffix: true, locale: fr });
  };
  
  // Handle play button click
  const handlePlay = async () => {
    try {
      const sessionId = await db.startSession(task.id);
      setCurrentSessionId(sessionId);
      setIsRunning(true);
      onUpdate();
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };
  
  // Handle stop button click
  const handleStop = () => {
    setShowStopDialog(true);
  };
  
  // Handle completing the session
  const handleCompleteSession = async (completed: boolean) => {
    if (!currentSessionId) return;
    
    try {
      // For learning projects, don't record 'ressenti'
      const shouldRecordRessenti = project.categorie !== 'apprentissage';
      const sessionRessenti = shouldRecordRessenti ? ressenti : null;
      
      await db.stopSession(
        task.id,
        currentSessionId,
        pauseMinutes,
        sessionRessenti,
        completed
      );
      
      setIsRunning(false);
      setCurrentSessionId(null);
      setShowStopDialog(false);
      setPauseMinutes(0);
      setRessenti(3);
      onUpdate();
    } catch (error) {
      console.error("Error stopping session:", error);
    }
  };
  
  return (
    <>
      <div className={getCardClass()}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{task.titre}</h3>
            <p className="text-sm opacity-80">{project.nom} • {formatDueDate()}</p>
          </div>
          <div className="flex items-center space-x-1">
            {Array.from({ length: task.estHeures }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-white/30 rounded-full" />
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div className="text-sm">
            {task.type === 'intensif' ? "Intensif" : "Passif"}
          </div>
          
          <div>
            {!task.completedAt && !isRunning && (
              <Button onClick={handlePlay} size="sm" variant="outline" className="btn-play">
                <PlayIcon size={16} />
              </Button>
            )}
            
            {isRunning && (
              <Button onClick={handleStop} size="sm" variant="outline" className="btn-stop">
                <SquareIcon size={16} />
              </Button>
            )}
            
            {task.completedAt && (
              <Button size="sm" variant="outline" className="btn-done" disabled>
                <CheckIcon size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Session Stop Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer la session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pauses">Pauses (minutes)</Label>
              <Input
                id="pauses"
                type="number"
                min={0}
                value={pauseMinutes}
                onChange={(e) => setPauseMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
            
            {project.categorie !== 'apprentissage' && (
              <div className="space-y-2">
                <Label>Ressenti (1-5)</Label>
                <div className="flex items-center space-x-2">
                  <span>1</span>
                  <Slider
                    value={[ressenti]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={(value) => setRessenti(value[0])}
                  />
                  <span>5</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              variant="default" 
              className="w-full sm:w-auto bg-focus-green hover:bg-focus-green/90"
              onClick={() => handleCompleteSession(true)}
            >
              J'ai terminé
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => handleCompleteSession(false)}
            >
              Enregistrer sans terminer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;
