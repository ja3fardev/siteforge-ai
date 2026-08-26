import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  files: FileEntry[];
  preview?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface FileEntry {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface Subdomain {
  id: string;
  slug: string;
  projectId: string;
  userId: string;
}

interface DB {
  users: User[];
  projects: Project[];
  subdomains: Subdomain[];
}

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: DB = { users: [], projects: [], subdomains: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2));
  }
}

function readDb(): DB {
  ensureDbDir();
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

function writeDb(db: DB) {
  ensureDbDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Users
export function findUserByEmail(email: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.email === email);
}

export function findUserByUsername(username: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.username === username);
}

export function findUserById(id: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): User {
  const db = readDb();
  const user: User = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeDb(db);
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...data, updatedAt: new Date().toISOString() };
  writeDb(db);
  return db.users[idx];
}

// Projects
export function getProjectsByUser(userId: string): Project[] {
  const db = readDb();
  return db.projects.filter((p) => p.userId === userId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function findProjectById(id: string): Project | undefined {
  const db = readDb();
  return db.projects.find((p) => p.id === id);
}

export function createProject(data: { name: string; description?: string; userId: string }): Project {
  const db = readDb();
  const project: Project = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    files: [],
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: data.userId,
  };
  db.projects.push(project);
  writeDb(db);
  return project;
}

export function updateProject(id: string, data: Partial<Project>): Project | null {
  const db = readDb();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.projects[idx] = { ...db.projects[idx], ...data, updatedAt: new Date().toISOString() };
  writeDb(db);
  return db.projects[idx];
}

export function deleteProject(id: string): boolean {
  const db = readDb();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.projects.splice(idx, 1);
  db.subdomains = db.subdomains.filter((s) => s.projectId !== id);
  writeDb(db);
  return true;
}

// Subdomains
export function findSubdomainBySlug(slug: string): Subdomain | undefined {
  const db = readDb();
  return db.subdomains.find((s) => s.slug === slug);
}

export function findSubdomainByUser(userId: string): Subdomain | undefined {
  const db = readDb();
  return db.subdomains.find((s) => s.userId === userId);
}

export function createSubdomain(data: { slug: string; projectId: string; userId: string }): Subdomain {
  const db = readDb();
  const subdomain: Subdomain = {
    id: uuidv4(),
    slug: data.slug,
    projectId: data.projectId,
    userId: data.userId,
  };
  db.subdomains.push(subdomain);
  writeDb(db);
  return subdomain;
}
