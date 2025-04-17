
import { db } from './db';
import { toast } from '@/hooks/use-toast';

class AppService {
  private worker: Worker | null = null;
  
  // Initialize the app service
  init() {
    this.registerServiceWorker();
    this.initWorker();
  }
  
  // Register service worker for PWA functionality
  private registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }
  
  // Initialize worker for daily task rollover
  private initWorker() {
    if (window.Worker) {
      try {
        this.worker = new Worker('/worker.js');
        
        // Listen for messages from the worker
        this.worker.addEventListener('message', (event) => {
          if (event.data.type === 'ROLLOVER_TASKS') {
            this.handleRolloverTasks();
          }
        });
        
        // Initialize the worker
        this.worker.postMessage({ type: 'INIT' });
      } catch (error) {
        console.error('Error initializing worker:', error);
      }
    } else {
      console.warn('Web Workers not supported in this browser');
      // Set up a fallback using setInterval in the main thread
      this.setupFallbackRollover();
    }
  }
  
  // Fallback for browsers that don't support Web Workers
  private setupFallbackRollover() {
    // Check once a minute if it's 00:05
    setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours === 0 && minutes === 5) {
        this.handleRolloverTasks();
      }
    }, 60000); // Check every minute
  }
  
  // Handle the actual task rollover
  private async handleRolloverTasks() {
    try {
      await db.rolloverOverdueTasks();
      // Show toast notification if the app is open
      toast({
        title: "Mise à jour des tâches",
        description: "Les tâches en retard ont été reportées au jour suivant",
      });
    } catch (error) {
      console.error('Error rolling over tasks:', error);
    }
  }
  
  // Export data to JSON file
  async exportData(): Promise<void> {
    try {
      const data = await db.exportData();
      
      // Create file name with date
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `focuslens-backup-${dateStr}.json`;
      
      // Create and download the file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Exportation réussie",
        description: "Vos données ont été exportées avec succès",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Erreur lors de l'exportation",
        description: "Une erreur est survenue lors de l'exportation des données",
        variant: "destructive",
      });
    }
  }
  
  // Import data from JSON file
  async importData(file: File, merge: boolean = true): Promise<void> {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          await db.importData(content, merge);
          
          toast({
            title: "Importation réussie",
            description: merge 
              ? "Vos données ont été fusionnées avec succès" 
              : "Vos données ont été remplacées avec succès",
          });
          
          // Force reload to reflect changes
          window.location.reload();
        } catch (error) {
          console.error('Error processing import data:', error);
          toast({
            title: "Erreur lors de l'importation",
            description: "Le fichier JSON n'est pas valide",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: "Erreur lors de l'importation",
        description: "Une erreur est survenue lors de l'importation des données",
        variant: "destructive",
      });
    }
  }
}

export const appService = new AppService();
