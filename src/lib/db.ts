import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

let redis: Redis;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export interface User {
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

export interface Project {
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

export interface FileEntry {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface Subdomain {
  id: string;
  slug: string;
  projectId: string;
  userId: string;
}

// Users
export async function findUserByEmail(email: string): Promise<User | null> {
  const r = getRedis();
  const userId = await r.get<string>(`user:email:${email}`);
  if (!userId) return null;
  return r.get<User>(`user:${userId}`);
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const r = getRedis();
  const userId = await r.get<string>(`user:username:${username}`);
  if (!userId) return null;
  return r.get<User>(`user:${userId}`);
}

export async function findUserById(id: string): Promise<User | null> {
  const r = getRedis();
  return r.get<User>(`user:${id}`);
}

export async function createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
  const r = getRedis();
  const user: User = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await r.set(`user:${user.id}`, JSON.stringify(user));
  await r.set(`user:email:${user.email}`, user.id);
  await r.set(`user:username:${user.username}`, user.id);

  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const r = getRedis();
  const user = await r.get<User>(`user:${id}`);
  if (!user) return null;

  const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
  await r.set(`user:${id}`, JSON.stringify(updated));
  return updated;
}

// Projects
export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const r = getRedis();
  const projectIds = await r.smembers(`user:${userId}:projects`) as string[];
  if (!projectIds || projectIds.length === 0) return [];

  const projects: Project[] = [];
  for (const id of projectIds) {
    const project = await r.get<Project>(`project:${id}`);
    if (project) projects.push(project);
  }

  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function findProjectById(id: string): Promise<Project | null> {
  const r = getRedis();
  return r.get<Project>(`project:${id}`);
}

export async function createProject(data: { name: string; description?: string; userId: string }): Promise<Project> {
  const r = getRedis();
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

  await r.set(`project:${project.id}`, JSON.stringify(project));
  await r.sadd(`user:${data.userId}:projects`, project.id);

  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const r = getRedis();
  const project = await r.get<Project>(`project:${id}`);
  if (!project) return null;

  const updated = { ...project, ...data, updatedAt: new Date().toISOString() };
  await r.set(`project:${id}`, JSON.stringify(updated));
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const r = getRedis();
  const project = await r.get<Project>(`project:${id}`);
  if (!project) return false;

  await r.del(`project:${id}`);
  await r.srem(`user:${project.userId}:projects`, id);

  const subdomain = await findSubdomainByProject(id);
  if (subdomain) {
    await r.del(`subdomain:${subdomain.slug}`);
    await r.del(`subdomain:project:${id}`);
    await r.del(`subdomain:user:${subdomain.userId}`);
  }

  return true;
}

// Subdomains
export async function findSubdomainBySlug(slug: string): Promise<Subdomain | null> {
  const r = getRedis();
  return r.get<Subdomain>(`subdomain:${slug}`);
}

export async function findSubdomainByProject(projectId: string): Promise<Subdomain | null> {
  const r = getRedis();
  const subdomainId = await r.get<string>(`subdomain:project:${projectId}`);
  if (!subdomainId) return null;
  return r.get<Subdomain>(`subdomain:${subdomainId}`);
}

export async function findSubdomainByUser(userId: string): Promise<Subdomain | null> {
  const r = getRedis();
  const subdomainId = await r.get<string>(`subdomain:user:${userId}`);
  if (!subdomainId) return null;
  return r.get<Subdomain>(`subdomain:${subdomainId}`);
}

export async function createSubdomain(data: { slug: string; projectId: string; userId: string }): Promise<Subdomain> {
  const r = getRedis();
  const subdomain: Subdomain = {
    id: uuidv4(),
    slug: data.slug,
    projectId: data.projectId,
    userId: data.userId,
  };

  await r.set(`subdomain:${subdomain.slug}`, JSON.stringify(subdomain));
  await r.set(`subdomain:project:${data.projectId}`, subdomain.id);
  await r.set(`subdomain:user:${data.userId}`, subdomain.id);

  return subdomain;
}
