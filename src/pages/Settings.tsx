
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UploadIcon, DownloadIcon, MoonIcon, SunIcon } from "lucide-react";
import { db } from "@/lib/db";
import { appService } from "@/lib/appService";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Handle file import
  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
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
      
      {/* Import/Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Données</CardTitle>
          <CardDescription>Importez ou exportez vos données</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import */}
          <div>
            <h3 className="text-lg font-medium mb-2">Importer des données</h3>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
