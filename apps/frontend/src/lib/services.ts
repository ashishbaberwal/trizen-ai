import { delay } from "@/lib/service-utils";
import {
  currentUser,
  events as mockEvents,
  galleries as mockGalleries,
  photos as mockPhotos,
  recentActivity,
  teamMembers as mockTeamMembers,
  uploadActivity,
} from "@/lib/mock-data";
import type {
  ActivityItem,
  Event,
  Photo,
  TeamMember,
  User,
} from "@/types";

/**
 * Service layer — the single seam where the backend will plug in later.
 * Every method is async and returns resolved mock data today; swapping the
 * bodies for fetch() calls should not require touching any component.
 */

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export const userService = {
  async getCurrentUser(): Promise<User> {
    await delay(120);
    return currentUser;
  },
  async login(email: string, _password: string): Promise<User> {
    await delay(900);
    return { ...currentUser, email };
  },
  async register(name: string, email: string): Promise<User> {
    await delay(900);
    return { ...currentUser, name, email };
  },
};

export const dashboardService = {
  async getStats(): Promise<{
    activeEvents: number;
    totalPhotos: number;
    publishedGalleries: number;
    teamMembers: number;
  }> {
    await delay(300);
    return {
      activeEvents: mockEvents.filter((e) => e.status === "active").length,
      totalPhotos: 8426,
      publishedGalleries: mockGalleries.filter((g) => g.status === "published").length,
      teamMembers: 18,
    };
  },
  async getUploadActivity(): Promise<{ day: string; uploads: number }[]> {
    await delay(350);
    return uploadActivity;
  },
  async getRecentActivity(): Promise<ActivityItem[]> {
    await delay(250);
    return recentActivity;
  },
};

const eventsStore = [...mockEvents] as Mutable<Event>[];
const teamStore = [...mockTeamMembers] as Mutable<TeamMember>[];
const photosStore = [...mockPhotos] as Mutable<Photo>[];

export const eventService = {
  async list(): Promise<Event[]> {
    await delay(250);
    return [...eventsStore];
  },
  async get(id: string): Promise<Event | undefined> {
    await delay(200);
    return eventsStore.find((e) => e.id === id);
  },
  async create(
    input: Pick<Event, "name" | "date" | "location"> & { description?: string; coverUrl?: string }
  ): Promise<Event> {
    await delay(700);
    const event: Event = {
      id: `evt-${Date.now()}`,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: input.name,
      description: input.description ?? "",
      date: input.date,
      location: input.location,
      coverUrl: input.coverUrl ?? mockEvents[0].coverUrl,
      photoCount: 0,
      teamMemberCount: 1,
      status: "draft",
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    eventsStore.unshift(event);
    return event;
  },
};

export const photoService = {
  async listByEvent(eventId: string): Promise<Photo[]> {
    await delay(300);
    return photosStore.filter((p) => p.eventId === eventId);
  },
  async setSelected(photoIds: string[], selected: boolean, eventId: string): Promise<void> {
    await delay(200);
    for (const p of photosStore) {
      if (p.eventId === eventId && photoIds.includes(p.id)) p.selected = selected;
    }
  },
  /** Simulates uploading a batch of files with progress. Caller drives progress via onProgress. */
  async upload(
    eventId: string,
    files: File[],
    onProgress: (fileId: string, progress: number) => void,
    onFailureEveryN = 5
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];
    await Promise.all(
      files.map(async (file, index) => {
        const fileId = `upload-${index}-${file.name}`;
        const willFail = (index + 1) % onFailureEveryN === 0;
        const duration = 1200 + Math.random() * 1800;
        const start = Date.now();
        return new Promise<void>((resolve) => {
          const tick = () => {
            const elapsed = Date.now() - start;
            const ratio = Math.min(elapsed / duration, 1);
            const progress = Math.round(ratio * 100);
            onProgress(fileId, willFail ? Math.min(progress, 64) : progress);
            if (ratio >= 1) {
              if (willFail) {
                failed.push(fileId);
              } else {
                succeeded.push(fileId);
              }
              resolve();
            } else {
              setTimeout(tick, 180);
            }
          };
          setTimeout(tick, 200);
        });
      })
    );
    return { succeeded, failed };
  },
};

export const teamService = {
  async listByEvent(eventId: string): Promise<TeamMember[]> {
    await delay(250);
    return teamStore.filter((t) => t.eventId === eventId);
  },
  async addMember(input: { eventId: string; name: string; email: string; role: "admin" | "member" }): Promise<TeamMember> {
    await delay(600);
    const member: TeamMember = {
      id: `tm-${Date.now()}`,
      ...input,
      userId: `u-${Date.now()}`,
      photosUploaded: 0,
      joinedAt: new Date().toISOString(),
    };
    teamStore.push(member);
    return member;
  },
  async removeMember(memberId: string): Promise<void> {
    await delay(400);
    const index = teamStore.findIndex((t) => t.id === memberId);
    if (index !== -1) teamStore.splice(index, 1);
  },
};
