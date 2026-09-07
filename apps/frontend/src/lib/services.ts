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
  Gallery,
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
const galleriesStore = [...mockGalleries] as Mutable<Gallery>[];
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

export const galleryService = {
  async list(): Promise<Gallery[]> {
    await delay(250);
    return [...galleriesStore];
  },
  async listByEvent(eventId: string): Promise<Gallery[]> {
    await delay(250);
    return galleriesStore.filter((g) => g.eventId === eventId);
  },
  async create(input: {
    eventId: string;
    name: string;
    description: string;
    photoIds: string[];
    expiresAt?: string;
    downloadEnabled: boolean;
  }): Promise<Gallery> {
    await delay(800);
    const event = eventsStore.find((e) => e.id === input.eventId);
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const gallery: Gallery = {
      id: `gal-${Date.now()}`,
      slug,
      eventId: input.eventId,
      eventName: event?.name ?? "Event",
      name: input.name,
      description: input.description,
      coverUrl: event?.coverUrl ?? mockEvents[0].coverUrl,
      photoCount: input.photoIds.length,
      status: "draft",
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      pin: generatePin(),
      url: `https://frameflow.app/gallery/${slug}`,
      downloadEnabled: input.downloadEnabled,
    };
    galleriesStore.unshift(gallery);
    return gallery;
  },
  async setStatus(galleryId: string, status: Gallery["status"]): Promise<void> {
    await delay(500);
    const gallery = galleriesStore.find((g) => g.id === galleryId);
    if (gallery) {
      gallery.status = status;
      if (status === "published") gallery.publishedAt = new Date().toISOString();
    }
  },
  async getBySlug(slug: string): Promise<Gallery | undefined> {
    await delay(300);
    return galleriesStore.find((g) => g.slug === slug);
  },
  async verifyPin(slug: string, pin: string): Promise<"ok" | "invalid"> {
    await delay(800);
    const gallery = galleriesStore.find((g) => g.slug === slug);
    return gallery && gallery.pin === pin ? "ok" : "invalid";
  },
  async getPhotos(galleryId: string): Promise<Photo[]> {
    await delay(350);
    // Deterministic sample: the first N photos of the matched event's set.
    const gallery = galleriesStore.find((g) => g.id === galleryId);
    if (!gallery) return [];
    const eventPhotos = photosStore.filter((p) => p.eventId === gallery.eventId);
    return eventPhotos.slice(0, Math.min(gallery.photoCount, eventPhotos.length)).map((p) => ({
      ...p,
      selected: false,
    }));
  },
};

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
