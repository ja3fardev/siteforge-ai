import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

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
  const userId = await redis.get<string>(`user:email:${email}`);
  if (!userId) return null;
  return redis.get<User>(`user:${userId}`);
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const userId = await redis.get<string>(`user:username:${username}`);
  if (!userId) return null;
  return redis.get<User>(`user:${userId}`);
}

export async function findUserById(id: string): Promise<User | null> {
  return redis.get<User>(`user:${id}`);
}

export async function createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
  const user: User = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pipeline = redis.pipeline();
  pipeline.set(`user:${user.id}`, user);
  pipeline.set(`user:email:${user.email}`, user.id);
  pipeline.set(`user:username:${user.username}`, user.id);
  await pipeline.exec();

  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const user = await redis.get<User>(`user:${id}`);
  if (!user) return null;

  const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
  await redis.set(`user:${id}`, updated);
  return updated;
}

// Projects
export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const projectIds = await redis.smembers<string[]>(`user:${userId}:projects`);
  if (!projectIds || projectIds.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of projectIds) {
    pipeline.get(`project:${id}`);
  }
  const results = await pipeline.exec<(Project | null)[]>();
  return (results.filter(Boolean) as Project[]).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function findProjectById(id: string): Promise<Project | null> {
  return redis.get<Project>(`project:${id}`);
}

export async function createProject(data: { name: string; description?: string; userId: string }): Promise<Project> {
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

  const pipeline = redis.pipeline();
  pipeline.set(`project:${project.id}`, project);
  pipeline.sadd(`user:${data.userId}:projects`, project.id);
  await pipeline.exec();

  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const project = await redis.get<Project>(`project:${id}`);
  if (!project) return null;

  const updated = { ...project, ...data, updatedAt: new Date().toISOString() };
  await redis.set(`project:${id}`, updated);
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const project = await redis.get<Project>(`project:${id}`);
  if (!project) return false;

  const pipeline = redis.pipeline();
  pipeline.del(`project:${id}`);
  pipeline.srem(`user:${project.userId}:projects`, id);
  // Remove subdomain if exists
  const subdomain = await findSubdomainByProject(id);
  if (subdomain) {
    pipeline.del(`subdomain:${subdomain.slug}`);
    pipeline.del(`subdomain:project:${id}`);
    pipeline.del(`subdomain:user:${subdomain.userId}`);
  }
  await pipeline.exec();
  return true;
}

// Subdomains
export async function findSubdomainBySlug(slug: string): Promise<Subdomain | null> {
  return redis.get<Subdomain>(`subdomain:${slug}`);
}

export async function findSubdomainByProject(projectId: string): Promise<Subdomain | null> {
  const subdomainId = await redis.get<string>(`subdomain:project:${projectId}`);
  if (!subdomainId) return null;
  return redis.get<Subdomain>(`subdomain:${subdomainId}`);
}

export async function findSubdomainByUser(userId: string): Promise<Subdomain | null> {
  const subdomainId = await redis.get<string>(`subdomain:user:${userId}`);
  if (!subdomainId) return null;
  return redis.get<Subdomain>(`subdomain:${subdomainId}`);
}

export async function createSubdomain(data: { slug: string; projectId: string; userId: string }): Promise<Subdomain> {
  const subdomain: Subdomain = {
    id: uuidv4(),
    slug: data.slug,
    projectId: data.projectId,
    userId: data.userId,
  };

  const pipeline = redis.pipeline();
  pipeline.set(`subdomain:${subdomain.slug}`, subdomain);
  pipeline.set(`subdomain:project:${data.projectId}`, subdomain.id);
  pipeline.set(`subdomain:user:${data.userId}`, subdomain.id);
  await pipeline.exec();

  return subdomain;
}
