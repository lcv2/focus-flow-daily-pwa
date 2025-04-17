
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { UploadIcon, DownloadIcon, MoonIcon, SunIcon, FileIcon } from "lucide-react";
import { db, Project, TaskType } from "@/lib/db";
import { appService } from "@/lib/appService";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle Dark Mode toggle
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    
    setIsDarkMode(!isDarkMode);
  };
  
  // Handle JSON file import
  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle CSV file import
  const handleCsvImport = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };
  
  // Handle JSON file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (file.type !== 'application/json') {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier JSON",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await appService.importData(file, importMode === 'merge');
      
      toast({
        title: "Importation réussie",
        description: "Les données ont été importées avec succès",
      });
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: "Erreur lors de l'importation",
        description: "Une erreur est survenue lors de l'importation des données",
        variant: "destructive",
      });
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle CSV file selection
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        const result = await importCsvData(csvData);
        
        setImportResult(result);
        
        if (result.success) {
          toast({
            title: "Importation CSV réussie",
            description: result.message,
          });
        } else {
          toast({
            title: "Erreur lors de l'importation CSV",
            description: result.message,
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      console.error("Error reading CSV file:", error);
      toast({
        title: "Erreur lors de l'importation",
        description: "Une erreur est survenue lors de la lecture du fichier CSV",
        variant: "destructive",
      });
    }
    
    // Reset the file input
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };
  
  // Function to import CSV data
  const importCsvData = async (csvData: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Split the CSV data into lines
      const lines = csvData.split('\n');
      
      // Check if there's at least a header and one data row
      if (lines.length < 2) {
        return { success: false, message: "Format CSV invalide : fichier vide ou incomplet" };
      }
      
      // Parse the header
      const header = lines[0].trim().split(',');
      
      // Verify required columns are present
      const requiredColumns = ['project_nom', 'titre', 'type', 'estHeures', 'dueDate'];
      const missingColumns = requiredColumns.filter(col => !header.includes(col));
      
      if (missingColumns.length > 0) {
        return { 
          success: false, 
          message: `Format CSV invalide : colonnes manquantes (${missingColumns.join(', ')})` 
        };
      }
      
      // Get column indices
      const projectNameIndex = header.indexOf('project_nom');
      const titleIndex = header.indexOf('titre');
      const typeIndex = header.indexOf('type');
      const estHeuresIndex = header.indexOf('estHeures');
      const dueDateIndex = header.indexOf('dueDate');
      
      // Process data rows
      let tasksAdded = 0;
      const projectNameMap: Record<string, string> = {}; // Map project name to project ID
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',');
        
        // Skip if we don't have enough values
        if (values.length < requiredColumns.length) {
          console.warn(`Ligne ${i} ignorée : nombre de colonnes insuffisant`);
          continue;
        }
        
        // Extract values
        const projectName = values[projectNameIndex].trim();
        const title = values[titleIndex].trim();
        const type = values[typeIndex].trim() as TaskType;
        const estHeures = parseInt(values[estHeuresIndex].trim(), 10);
        const dueDateStr = values[dueDateIndex].trim();
        
        // Validate values
        if (!projectName || !title || !(['intensif', 'passif'].includes(type)) || 
            isNaN(estHeures) || estHeures < 1 || estHeures > 4 || !dueDateStr) {
          console.warn(`Ligne ${i} ignorée : valeurs invalides`);
          continue;
        }
        
        // Parse date (format expected: YYYY-MM-DD)
        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) {
          console.warn(`Ligne ${i} ignorée : format de date invalide (utilisez YYYY-MM-DD)`);
          continue;
        }
        
        // Transaction to ensure data consistency
        await db.transaction('rw', [db.projects, db.tasks], async () => {
          // Check if we have already processed this project name
          let projectId = projectNameMap[projectName];
          
          if (!projectId) {
            // Check if project exists
            const existingProjects = await db.projects
              .where('nom')
              .equals(projectName)
              .toArray();
            
            if (existingProjects.length > 0) {
              // Use existing project
              projectId = existingProjects[0].id;
            } else {
              // Create new project
              projectId = await db.addProject({
                nom: projectName,
                categorie: 'travail', // Default category
                couleurHex: getRandomColor()
              });
            }
            
            // Store in map for future use
            projectNameMap[projectName] = projectId;
          }
          
          // Create task
          await db.addTask({
            projectId,
            titre: title,
            type,
            estHeures,
            dueDate,
            completedAt: null
          });
          
          tasksAdded++;
        });
      }
      
      return { 
        success: true, 
        message: `Import terminé : ${tasksAdded} tâches ajoutées` 
      };
    } catch (error) {
      console.error("Error importing CSV data:", error);
      return { 
        success: false, 
        message: "Une erreur est survenue lors de l'importation. Vérifiez le format du fichier CSV." 
      };
    }
  };
  
  // Function to generate a random color for new projects
  const getRandomColor = (): string => {
    const colors = [
      '#FF9B42', // focus-orange
      '#7CD8FF', // focus-turquoise
      '#9BE7B3', // focus-green
      '#FFE8A3', // focus-yellow
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Handle data export
  const handleExport = async () => {
    await appService.exportData();
  };
  
  return (
    <div className="container py-6">
      {/* Header */}
      <h1 className="text-2xl md:text-4xl font-bold mb-8">Paramètres</h1>
      
      {/* Theme Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Apparence</CardTitle>
          <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isDarkMode ? <MoonIcon size={20} /> : <SunIcon size={20} />}
              <Label htmlFor="dark-mode">{isDarkMode ? 'Thème sombre' : 'Thème clair'}</Label>
            </div>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={toggleDarkMode}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Backup & Export Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sauvegarde</CardTitle>
          <CardDescription>Exportez ou importez vos données</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export */}
          <div>
            <h3 className="text-lg font-medium mb-2">Exporter des données</h3>
            <Button 
              onClick={handleExport}
              className="w-full md:w-auto"
              variant="outline"
            >
              <DownloadIcon size={16} className="mr-2" />
              Exporter JSON
            </Button>
          </div>
          
          {/* Import JSON */}
          <div>
            <h3 className="text-lg font-medium mb-2">Importer JSON</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="import-mode"
                  checked={importMode === 'replace'}
                  onCheckedChange={(checked) => setImportMode(checked ? 'replace' : 'merge')}
                />
                <Label htmlFor="import-mode">
                  {importMode === 'merge' 
                    ? 'Fusionner avec les données existantes' 
                    : 'Remplacer les données existantes'}
                </Label>
              </div>
              
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <Button 
                onClick={handleImport}
                className="w-full md:w-auto"
                variant="outline"
              >
                <UploadIcon size={16} className="mr-2" />
                Importer JSON
              </Button>
            </div>
          </div>
          
          {/* Import CSV */}
          <div>
            <h3 className="text-lg font-medium mb-2">Importer CSV</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Format attendu: project_nom,titre,type,estHeures,dueDate(YYYY-MM-DD)
              </p>
              
              <Input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvFileChange}
              />
              
              <Button 
                onClick={handleCsvImport}
                className="w-full md:w-auto"
                variant="outline"
              >
                <FileIcon size={16} className="mr-2" />
                Importer CSV
              </Button>
              
              {importResult && (
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  <AlertTitle>{importResult.success ? "Succès" : "Erreur"}</AlertTitle>
                  <AlertDescription>{importResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
