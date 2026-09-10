import type {
  ActivityItem,
  Event,
  Gallery,
  Photo,
  TeamMember,
  User,
} from "@/types";

const img = (id: string, w = 800, h = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/**
 * Verified Unsplash photo IDs (photo-<id>). Kept in one place so broken
 * images can be swapped in a single edit.
 */
export const PHOTO_IDS = {
  covers: {
    wedding: "1519741497674-611481863552",
    corporate: "1540575467063-178a50c2df87",
    concert: "1470229722913-7c0e2dbbafd3",
    engagement: "1522673607200-164d1b6ce486",
    fest: "1533174072545-7a4b6ad7a6c3",
    hero: "1450388940901-a4598e4b87c8",
    studio: "1554048612-b6a482bc67e5",
    sports: "1459865264687-595d652de67e",
  },
  gallery: [
    "1519225421980-715cb0215aed",
    "1583939003579-730e3918a45a",
    "1606800052052-a08af7148866",
    "1511285560929-80b456fea0bc",
    "1465495976277-4387d4b0b4c6",
    "1591604466107-ec97de577aff",
    "1537633552985-df8429e8048b",
    "1583157048769-49ec8f0cecd1",
    "1519671482749-fd09be7ccebf",
    "1529634806980-85c3dd6d34ac",
    "1606216794074-735e91aa2c92",
    "1550005809-91ad75fb315f",
    "1515934751635-c81c6bc9a2d8",
    "1521543832500-49e69fb2bea2",
    "1520854221256-17451cc331bf",
    "1519227355453-8f982e425321",
    "1522673607200-164d1b6ce486",
    "1591026441911-1a5d38fd1b21",
  ],
} as const;

export const currentUser: User = {
  id: "u-alex",
  name: "Alex Kumar",
  email: "alex@frameflow.studio",
  role: "admin",
};

export const events: Event[] = [
  {
    id: "evt-1",
    slug: "arjun-priya-wedding",
    name: "Arjun & Priya Wedding",
    description:
      "Three days of ceremonies across Jaipur — mehndi, sangeet, and the wedding at Rambagh Palace.",
    date: "2026-08-22",
    location: "Rambagh Palace, Jaipur",
    coverUrl: img(PHOTO_IDS.covers.wedding, 1600, 900),
    photoCount: 4210,
    teamMemberCount: 7,
    status: "active",
    lastActivity: "2026-09-06T14:32:00",
    createdAt: "2026-07-10",
  },
  {
    id: "evt-2",
    slug: "mumbai-corporate-summit",
    name: "Mumbai Corporate Summit",
    description:
      "Two-day leadership summit. Keynotes, breakout sessions, and the awards dinner.",
    date: "2026-09-02",
    location: "Jio World Centre, Mumbai",
    coverUrl: img(PHOTO_IDS.covers.corporate, 1600, 900),
    photoCount: 2380,
    teamMemberCount: 5,
    status: "active",
    lastActivity: "2026-09-05T18:10:00",
    createdAt: "2026-08-14",
  },
  {
    id: "evt-3",
    slug: "neon-nights-concert",
    name: "Neon Nights Concert",
    description:
      "Stadium tour opener. Stage, pit and crowd coverage across three acts.",
    date: "2026-08-30",
    location: "DY Patil Stadium, Navi Mumbai",
    coverUrl: img(PHOTO_IDS.covers.concert, 1600, 900),
    photoCount: 1890,
    teamMemberCount: 4,
    status: "completed",
    lastActivity: "2026-09-01T09:45:00",
    createdAt: "2026-08-01",
  },
  {
    id: "evt-4",
    slug: "rahul-sneha-engagement",
    name: "Rahul & Sneha Engagement",
    description: "Evening engagement ceremony at the family's farmhouse, held outdoors.",
    date: "2026-09-20",
    location: "The Orchard House, Pune",
    coverUrl: img(PHOTO_IDS.covers.engagement, 1600, 900),
    photoCount: 0,
    teamMemberCount: 3,
    status: "draft",
    lastActivity: "2026-08-28T11:20:00",
    createdAt: "2026-08-20",
  },
  {
    id: "evt-5",
    slug: "bennett-fest-2026",
    name: "Bennett University Fest 2026",
    description: "Three-day cultural fest — pro shows, competitions and campus coverage.",
    date: "2026-10-08",
    location: "Bennett University, Greater Noida",
    coverUrl: img(PHOTO_IDS.covers.fest, 1600, 900),
    photoCount: 0,
    teamMemberCount: 2,
    status: "draft",
    lastActivity: "2026-09-03T16:05:00",
    createdAt: "2026-09-01",
  },
];

export const teamMembers: TeamMember[] = [
  { id: "tm-1", eventId: "evt-1", userId: "u-alex", name: "Alex Kumar", email: "alex@frameflow.studio", role: "admin", photosUploaded: 842, joinedAt: "2026-07-10" },
  { id: "tm-2", eventId: "evt-1", userId: "u-sarah", name: "Sarah Menon", email: "sarah@frameflow.studio", role: "member", photosUploaded: 1284, joinedAt: "2026-07-12" },
  { id: "tm-3", eventId: "evt-1", userId: "u-mike", name: "Mike Zhang", email: "mike@frameflow.studio", role: "member", photosUploaded: 968, joinedAt: "2026-07-15" },
  { id: "tm-4", eventId: "evt-1", userId: "u-divya", name: "Divya Sharma", email: "divya@frameflow.studio", role: "member", photosUploaded: 634, joinedAt: "2026-07-18" },
  { id: "tm-5", eventId: "evt-1", userId: "u-rohan", name: "Rohan Iyer", email: "rohan@frameflow.studio", role: "member", photosUploaded: 402, joinedAt: "2026-07-22" },
  { id: "tm-6", eventId: "evt-1", userId: "u-ines", name: "Inês Carvalho", email: "ines@frameflow.studio", role: "member", photosUploaded: 80, joinedAt: "2026-09-02" },
  { id: "tm-7", eventId: "evt-1", userId: "u-kabir", name: "Kabir Malhotra", email: "kabir@frameflow.studio", role: "member", photosUploaded: 0, joinedAt: "2026-09-05" },
  { id: "tm-8", eventId: "evt-2", userId: "u-alex", name: "Alex Kumar", email: "alex@frameflow.studio", role: "admin", photosUploaded: 310, joinedAt: "2026-08-14" },
  { id: "tm-9", eventId: "evt-2", userId: "u-sarah", name: "Sarah Menon", email: "sarah@frameflow.studio", role: "member", photosUploaded: 920, joinedAt: "2026-08-14" },
  { id: "tm-10", eventId: "evt-2", userId: "u-priyanka", name: "Priyanka Rao", email: "priyanka@frameflow.studio", role: "member", photosUploaded: 690, joinedAt: "2026-08-16" },
  { id: "tm-11", eventId: "evt-2", userId: "u-mike", name: "Mike Zhang", email: "mike@frameflow.studio", role: "member", photosUploaded: 460, joinedAt: "2026-08-20" },
  { id: "tm-12", eventId: "evt-2", userId: "u-leo", name: "Leo Fernandes", email: "leo@frameflow.studio", role: "member", photosUploaded: 0, joinedAt: "2026-09-01" },
  { id: "tm-13", eventId: "evt-3", userId: "u-mike", name: "Mike Zhang", email: "mike@frameflow.studio", role: "admin", photosUploaded: 1140, joinedAt: "2026-08-01" },
  { id: "tm-14", eventId: "evt-3", userId: "u-divya", name: "Divya Sharma", email: "divya@frameflow.studio", role: "member", photosUploaded: 530, joinedAt: "2026-08-02" },
  { id: "tm-15", eventId: "evt-3", userId: "u-rohan", name: "Rohan Iyer", email: "rohan@frameflow.studio", role: "member", photosUploaded: 220, joinedAt: "2026-08-05" },
  { id: "tm-16", eventId: "evt-4", userId: "u-alex", name: "Alex Kumar", email: "alex@frameflow.studio", role: "admin", photosUploaded: 0, joinedAt: "2026-08-20" },
  { id: "tm-17", eventId: "evt-4", userId: "u-divya", name: "Divya Sharma", email: "divya@frameflow.studio", role: "member", photosUploaded: 0, joinedAt: "2026-08-21" },
  { id: "tm-18", eventId: "evt-4", userId: "u-sarah", name: "Sarah Menon", email: "sarah@frameflow.studio", role: "member", photosUploaded: 0, joinedAt: "2026-08-25" },
  { id: "tm-19", eventId: "evt-5", userId: "u-alex", name: "Alex Kumar", email: "alex@frameflow.studio", role: "admin", photosUploaded: 0, joinedAt: "2026-09-01" },
  { id: "tm-20", eventId: "evt-5", userId: "u-kabir", name: "Kabir Malhotra", email: "kabir@frameflow.studio", role: "member", photosUploaded: 0, joinedAt: "2026-09-04" },
];

const PHOTO_ASPECTS = [
  [800, 1200], [1200, 800], [1200, 1200], [800, 1000], [1200, 900],
  [900, 1200], [1000, 700], [800, 1100],
];

function generatePhotos(eventId: string, count: number, startIndex: number): Photo[] {
  const galleryIds = PHOTO_IDS.gallery;
  const uploaders = ["Sarah Menon", "Mike Zhang", "Divya Sharma", "Alex Kumar", "Rohan Iyer"];
  const photos: Photo[] = [];
  for (let i = 0; i < count; i++) {
    const id = galleryIds[(startIndex + i) % galleryIds.length];
    const variant = (startIndex + i) % 3;
    const [w, h] = PHOTO_ASPECTS[(startIndex + i) % PHOTO_ASPECTS.length];
    const daysAgo = 1 + ((i * 7 + startIndex) % 14);
    const uploadedAt = new Date(Date.now() - daysAgo * 86400000 - (i % 24) * 3600000);
    photos.push({
      id: `${eventId}-photo-${startIndex + i}`,
      eventId,
      url: img(id, 800, Math.round((h / w) * 800)),
      fullUrl: img(id, 2000, Math.round((h / w) * 2000)),
      width: w,
      height: h,
      uploaderName: uploaders[(i + startIndex) % uploaders.length],
      // Demo data spans both roles so the tag renders either way.
      uploaderRole: (i + startIndex) % 4 === 0 ? "admin" : "member",
      uploadedAt: uploadedAt.toISOString(),
      selected: (i * 5 + startIndex) % 7 === 0,
    });
    if (variant === 1) startIndex += 0; // keep deterministic
  }
  return photos;
}

//evt-1 photos: large sample set; others derive smaller sets
export const photos: Photo[] = [
  ...generatePhotos("evt-1", 96, 0),
  ...generatePhotos("evt-2", 24, 30),
  ...generatePhotos("evt-3", 18, 10),
];

export const galleries: Gallery[] = [
  {
    id: "gal-1",
    slug: "arjun-priya-ceremony",
    eventId: "evt-1",
    eventName: "Arjun & Priya Wedding",
    name: "Ceremony Highlights",
    description: "The mandap, the vows, and everything in between.",
    coverUrl: img(PHOTO_IDS.gallery[2], 1600, 900),
    photoCount: 214,
    status: "published",
    createdAt: "2026-08-26",
    publishedAt: "2026-08-27",
    expiresAt: "2026-12-27",
    pin: "482913",
    url: "https://frameflow.app/gallery/arjun-priya-ceremony",
    downloadEnabled: true,
  },
  {
    id: "gal-2",
    slug: "arjun-priya-sangeet",
    eventId: "evt-1",
    eventName: "Arjun & Priya Wedding",
    name: "Sangeet Night",
    description: "Dance performances and family portraits from the sangeet.",
    coverUrl: img(PHOTO_IDS.gallery[4], 1600, 900),
    photoCount: 148,
    status: "published",
    createdAt: "2026-08-30",
    publishedAt: "2026-08-31",
    expiresAt: "2026-11-30",
    pin: "730156",
    url: "https://frameflow.app/gallery/arjun-priya-sangeet",
    downloadEnabled: false,
  },
  {
    id: "gal-3",
    slug: "summit-keynotes",
    eventId: "evt-2",
    eventName: "Mumbai Corporate Summit",
    name: "Keynotes & Sessions",
    description: "Main stage keynotes and breakout sessions, day one and two.",
    coverUrl: img(PHOTO_IDS.gallery[9], 1600, 900),
    photoCount: 96,
    status: "draft",
    createdAt: "2026-09-04",
    pin: "914286",
    url: "https://frameflow.app/gallery/summit-keynotes",
    downloadEnabled: false,
  },
  {
    id: "gal-4",
    slug: "summit-awards",
    eventId: "evt-2",
    eventName: "Mumbai Corporate Summit",
    name: "Awards Dinner",
    description: "The annual excellence awards and candid shots from the dinner.",
    coverUrl: img(PHOTO_IDS.gallery[11], 1600, 900),
    photoCount: 84,
    status: "expired",
    createdAt: "2026-08-18",
    publishedAt: "2026-08-20",
    expiresAt: "2026-09-01",
    pin: "205817",
    url: "https://frameflow.app/gallery/summit-awards",
    downloadEnabled: true,
  },
  {
    id: "gal-5",
    slug: "neon-nights-crowd",
    eventId: "evt-3",
    eventName: "Neon Nights Concert",
    name: "Crowd & Atmosphere",
    description: "The best crowd shots from the opening night.",
    coverUrl: img(PHOTO_IDS.gallery[12], 1600, 900),
    photoCount: 132,
    status: "published",
    createdAt: "2026-08-31",
    publishedAt: "2026-09-01",
    expiresAt: "2026-12-01",
    pin: "633709",
    url: "https://frameflow.app/gallery/neon-nights-crowd",
    downloadEnabled: true,
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "act-1",
    actorName: "Sarah Menon",
    action: "uploaded 128 photos to",
    target: "Arjun & Priya Wedding",
    timestamp: "2026-09-06T14:32:00",
    type: "upload",
  },
  {
    id: "act-2",
    actorName: "Alex Kumar",
    action: "published",
    target: "Ceremony Highlights",
    timestamp: "2026-09-06T11:05:00",
    type: "publish",
  },
  {
    id: "act-3",
    actorName: "Mike Zhang",
    action: "joined",
    target: "Wedding Team",
    timestamp: "2026-09-05T09:20:00",
    type: "join",
  },
  {
    id: "act-4",
    actorName: "Divya Sharma",
    action: "uploaded 64 photos to",
    target: "Mumbai Corporate Summit",
    timestamp: "2026-09-05T08:02:00",
    type: "upload",
  },
  {
    id: "act-5",
    actorName: "Alex Kumar",
    action: "created event",
    target: "Bennett University Fest 2026",
    timestamp: "2026-09-01T16:40:00",
    type: "create",
  },
  {
    id: "act-6",
    actorName: "Rohan Iyer",
    action: "selected 42 photos in",
    target: "Arjun & Priya Wedding",
    timestamp: "2026-08-31T19:15:00",
    type: "select",
  },
];

/** Photos uploaded per day, last 7 days (mock analytics). */
export const uploadActivity = [
  { day: "Mon", uploads: 412 },
  { day: "Tue", uploads: 538 },
  { day: "Wed", uploads: 287 },
  { day: "Thu", uploads: 694 },
  { day: "Fri", uploads: 821 },
  { day: "Sat", uploads: 1129 },
  { day: "Sun", uploads: 745 },
];
