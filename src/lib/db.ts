
import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// Define types
export type ProjectCategory = 'travail' | 'apprentissage';
export type TaskType = 'intensif' | 'passif';

export interface Project {
  id: string;
  nom: string;
  categorie: ProjectCategory;
  couleurHex: string;
}

export interface Session {
  id: string;
  start: Date;
  stop: Date | null;
  pausesMinutes: number;
  ressenti: number | null;
}

export interface Task {
  id: string;
  projectId: string;
  titre: string;
  type: TaskType;
  estHeures: number;
  dueDate: Date;
  completedAt: Date | null;
  sessions: Session[];
}

// Define the database
class FocusLensDB extends Dexie {
  projects!: Table<Project>;
  tasks!: Table<Task>;

  constructor() {
    super('FocusLensDB');
    
    this.version(1).stores({
      projects: 'id, categorie',
      tasks: 'id, projectId, dueDate, completedAt'
    });
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return await this.projects.toArray();
  }

  async getProjectsByCategory(category: ProjectCategory): Promise<Project[]> {
    return await this.projects.where('categorie').equals(category).toArray();
  }

  async addProject(project: Omit<Project, 'id'>): Promise<string> {
    const id = uuidv4();
    await this.projects.add({ ...project, id });
    return id;
  }

  async updateProject(id: string, changes: Partial<Omit<Project, 'id'>>): Promise<void> {
    await this.projects.update(id, changes);
  }

  async deleteProject(id: string): Promise<void> {
    await this.projects.delete(id);
    // Also delete all tasks associated with this project
    await this.tasks.where('projectId').equals(id).delete();
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return await this.tasks.toArray();
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await this.tasks.where('projectId').equals(projectId).toArray();
  }

  async getOverdueTasks(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.tasks
      .where('dueDate')
      .below(today)
      .and(task => task.completedAt === null)
      .toArray();
  }

  async getTodayTasks(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await this.tasks
      .where('dueDate')
      .between(today, tomorrow, true, false)
      .and(task => task.completedAt === null)
      .toArray();
  }

  async getCompletedTasks(daysAgo: number = 7): Promise<Task[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);
    
    return await this.tasks
      .where('completedAt')
      .above(startDate)
      .toArray();
  }

  async addTask(task: Omit<Task, 'id' | 'sessions'>): Promise<string> {
    const id = uuidv4();
    await this.tasks.add({ ...task, id, sessions: [], completedAt: null });
    return id;
  }

  async updateTask(id: string, changes: Partial<Omit<Task, 'id' | 'sessions'>>): Promise<void> {
    await this.tasks.update(id, changes);
  }

  async deleteTask(id: string): Promise<void> {
    await this.tasks.delete(id);
  }

  async completeTask(id: string): Promise<void> {
    await this.tasks.update(id, { completedAt: new Date() });
  }

  // Session methods
  async startSession(taskId: string): Promise<string> {
    const task = await this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    const sessionId = uuidv4();
    const newSession: Session = {
      id: sessionId,
      start: new Date(),
      stop: null,
      pausesMinutes: 0,
      ressenti: null
    };
    
    const sessions = [...task.sessions, newSession];
    await this.tasks.update(taskId, { sessions });
    
    return sessionId;
  }

  async stopSession(
    taskId: string, 
    sessionId: string, 
    pausesMinutes: number, 
    ressenti: number | null,
    completed: boolean
  ): Promise<void> {
    const task = await this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    const sessionIndex = task.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) throw new Error("Session not found");
    
    const sessions = [...task.sessions];
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      stop: new Date(),
      pausesMinutes,
      ressenti
    };
    
    const updates: Partial<Task> = { sessions };
    
    if (completed) {
      updates.completedAt = new Date();
    }
    
    await this.tasks.update(taskId, updates);
  }

  // Data export/import
  async exportData(): Promise<string> {
    const projects = await this.projects.toArray();
    const tasks = await this.tasks.toArray();
    
    return JSON.stringify({ projects, tasks });
  }

  async importData(jsonData: string, merge: boolean = true): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.projects || !data.tasks) {
        throw new Error("Invalid data format");
      }
      
      await this.transaction('rw', [this.projects, this.tasks], async () => {
        if (!merge) {
          // Clear existing data if not merging
          await this.projects.clear();
          await this.tasks.clear();
        }
        
        // Import projects
        for (const project of data.projects) {
          if (merge) {
            // If merging, first check if project exists
            const existingProject = await this.projects.get(project.id);
            if (existingProject) {
              await this.projects.update(project.id, project);
            } else {
              await this.projects.add(project);
            }
          } else {
            await this.projects.add(project);
          }
        }
        
        // Import tasks
        for (const task of data.tasks) {
          if (merge) {
            // If merging, first check if task exists
            const existingTask = await this.tasks.get(task.id);
            if (existingTask) {
              await this.tasks.update(task.id, task);
            } else {
              await this.tasks.add(task);
            }
          } else {
            await this.tasks.add(task);
          }
        }
      });
    } catch (error) {
      console.error("Error importing data:", error);
      throw error;
    }
  }

  // Daily task rollover
  async rolloverOverdueTasks(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = await this.tasks
      .where('dueDate')
      .below(today)
      .and(task => task.completedAt === null)
      .toArray();
    
    await this.transaction('rw', this.tasks, async () => {
      for (const task of overdueTasks) {
        const newDueDate = new Date(task.dueDate);
        newDueDate.setDate(newDueDate.getDate() + 1);
        
        await this.tasks.update(task.id, { dueDate: newDueDate });
      }
    });
  }
}

// Create and export the database instance
export const db = new FocusLensDB();

// Function to initialize demo data (for testing/demo purposes)
export async function initDemoData() {
  const projectCount = await db.projects.count();
  
  if (projectCount > 0) return; // Only initialize if DB is empty
  
  // Add demo projects
  const projectIds = await Promise.all([
    db.addProject({
      nom: "Projet Web",
      categorie: "travail",
      couleurHex: "#FF7A00"
    }),
    db.addProject({
      nom: "Apprendre TypeScript",
      categorie: "apprentissage",
      couleurHex: "#56C5FF"
    }),
    db.addProject({
      nom: "Marketing",
      categorie: "travail",
      couleurHex: "#7BD389"
    })
  ]);
  
  // Today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Add demo tasks
  await Promise.all([
    // Overdue task
    db.addTask({
      projectId: projectIds[0],
      titre: "Corriger les bugs CSS",
      type: "intensif",
      estHeures: 2,
      dueDate: yesterday
    }),
    // Today's tasks
    db.addTask({
      projectId: projectIds[0],
      titre: "Mettre à jour la documentation",
      type: "passif",
      estHeures: 1,
      dueDate: today
    }),
    db.addTask({
      projectId: projectIds[1],
      titre: "Tutoriel TypeScript",
      type: "intensif",
      estHeures: 3,
      dueDate: today
    }),
    // Future task
    db.addTask({
      projectId: projectIds[2],
      titre: "Planifier campagne email",
      type: "passif",
      estHeures: 2,
      dueDate: tomorrow
    })
  ]);
}
