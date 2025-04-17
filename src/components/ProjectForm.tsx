
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { db, ProjectCategory } from "@/lib/db";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAdded: () => void;
}

const ProjectForm = ({ open, onOpenChange, onProjectAdded }: ProjectFormProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("travail");
  const [color, setColor] = useState("#FF7A00");
  
  // Preset colors for easy selection
  const presetColors = [
    "#FF7A00", "#56C5FF", "#7BD389", "#FFE066", "#FF4D4F",
    "#845EC2", "#00C2A8", "#B39CD0", "#FF8066", "#4B4453"
  ];
  
  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setCategory("travail");
      setColor("#FF7A00");
    }
    onOpenChange(open);
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await db.addProject({
        nom: name,
        categorie: category,
        couleurHex: color
      });
      
      toast({
        title: "Projet ajouté",
        description: "Le projet a été ajouté avec succès",
      });
      
      handleOpenChange(false);
      onProjectAdded();
    } catch (error) {
      console.error("Error adding project:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du projet",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un projet</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet"
            />
          </div>
          
          {/* Project Category */}
          <div className="grid gap-2">
            <Label htmlFor="category">Catégorie</Label>
            <RadioGroup 
              value={category} 
              onValueChange={(value) => setCategory(value as ProjectCategory)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="travail" id="travail" />
                <Label htmlFor="travail">Travail</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="apprentissage" id="apprentissage" />
                <Label htmlFor="apprentissage">Apprentissage</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Project Color */}
          <div className="grid gap-2">
            <Label htmlFor="color">Couleur</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-1 border rounded-md"
              />
              <div className="flex flex-wrap gap-2">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-8 h-8 rounded-full cursor-pointer ${
                      color === presetColor ? 'ring-2 ring-black dark:ring-white' : ''
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            className="bg-focus-orange hover:bg-focus-orange/90"
          >
            Ajouter un projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
