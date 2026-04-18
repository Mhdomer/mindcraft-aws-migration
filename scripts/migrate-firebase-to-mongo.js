/**
 * MindCraft: Firestore → MongoDB Migration Script
 *
 * Phase 1 — Data Migration
 * Reads all collections from Firebase Firestore and seeds MongoDB.
 *
 * Usage:
 *   node scripts/migrate-firebase-to-mongo.js
 *
 * Requires:
 *   - FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env
 *   - MONGODB_URI in .env
 *   - MIGRATION_DEFAULT_PASSWORD in .env (used to generate bcrypt hashes for migrated users)
 */

import 'dotenv/config';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Firebase Admin Init ─────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ─── MongoDB Init ─────────────────────────────────────────────────────────────

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindcraft');
console.log('✅ MongoDB connected');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAll(collection) {
  const snap = await db.collection(collection).get();
  return snap.docs.map(d => ({ _firebaseId: d.id, ...d.data() }));
}

function toDate(val) {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();           // Firestore Timestamp
  if (val._seconds) return new Date(val._seconds * 1000);
  return new Date(val);
}

// ─── ID Map (Firestore string IDs → MongoDB ObjectIds) ───────────────────────

const idMap = new Map(); // firebaseId → mongoose ObjectId

function getOrCreateId(firebaseId) {
  if (!idMap.has(firebaseId)) {
    idMap.set(firebaseId, new mongoose.Types.ObjectId());
  }
  return idMap.get(firebaseId);
}

// ─── Migration Functions ──────────────────────────────────────────────────────

async function migrateUsers() {
  console.log('\n📦 Migrating users...');
  const { default: User } = await import('../server/models/User.js');

  // Get Firebase Auth users
  let authUsers = [];
  try {
    const listResult = await admin.auth().listUsers();
    authUsers = listResult.users;
    console.log(`  Found ${authUsers.length} Firebase Auth users`);
  } catch (e) {
    console.warn('  ⚠️  Could not list Firebase Auth users:', e.message);
  }

  // Get Firestore user documents
  const firestoreUsers = await getAll('user');
  console.log(`  Found ${firestoreUsers.length} Firestore user documents`);

  const defaultPassword = process.env.MIGRATION_DEFAULT_PASSWORD || 'ChangeMe123!';
  const defaultHash = await bcrypt.hash(defaultPassword, 12);

  let migrated = 0;
  for (const u of firestoreUsers) {
    const mongoId = getOrCreateId(u._firebaseId);
    try {
      await User.create({
        _id: mongoId,
        email: u.email?.toLowerCase() || `user_${u._firebaseId}@migrated.local`,
        passwordHash: defaultHash, // users must reset password after migration
        name: u.name || u.displayName || 'Migrated User',
        role: u.role || 'student',
        status: u.status || 'active',
        profilePicture: u.profilePicture || null,
        isOnline: false,
        lastSeen: toDate(u.lastSeen),
        createdAt: toDate(u.createdAt),
        updatedAt: toDate(u.updatedAt || u.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped user ${u._firebaseId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${firestoreUsers.length} users`);
  console.log(`  ℹ️  All migrated users will need to reset their password (default: "${defaultPassword}")`);
}

async function migrateCourses() {
  console.log('\n📦 Migrating courses...');
  const { default: Course } = await import('../server/models/Course.js');
  const courses = await getAll('course');

  let migrated = 0;
  for (const c of courses) {
    const mongoId = getOrCreateId(c._firebaseId);
    const createdBy = c.createdBy ? getOrCreateId(c.createdBy) : new mongoose.Types.ObjectId();
    const modules = (c.modules || []).map(mid => getOrCreateId(mid));
    try {
      await Course.create({
        _id: mongoId, title: c.title, description: c.description || '',
        status: c.status || 'draft', modules, createdBy,
        authorName: c.authorName, authorEmail: c.authorEmail,
        createdAt: toDate(c.createdAt), updatedAt: toDate(c.updatedAt || c.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped course ${c._firebaseId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${courses.length} courses`);
}

async function migrateModules() {
  console.log('\n📦 Migrating modules...');
  const { default: Module } = await import('../server/models/Module.js');
  const modules = await getAll('module');

  let migrated = 0;
  for (const m of modules) {
    const mongoId = getOrCreateId(m._firebaseId);
    const courseId = m.courseId ? getOrCreateId(m.courseId) : new mongoose.Types.ObjectId();
    const lessons = (m.lessons || []).map(lid => getOrCreateId(lid));
    try {
      await Module.create({
        _id: mongoId, title: m.title, order: m.order ?? 0, courseId, lessons,
        createdAt: toDate(m.createdAt), updatedAt: toDate(m.updatedAt || m.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped module ${m._firebaseId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${modules.length} modules`);
}

async function migrateLessons() {
  console.log('\n📦 Migrating lessons...');
  const { default: Lesson } = await import('../server/models/Lesson.js');
  const lessons = await getAll('lesson');

  let migrated = 0;
  for (const l of lessons) {
    const mongoId = getOrCreateId(l._firebaseId);
    const moduleId = l.moduleId ? getOrCreateId(l.moduleId) : new mongoose.Types.ObjectId();
    try {
      await Lesson.create({
        _id: mongoId, title: l.title, moduleId,
        contentHtml: l.contentHtml || '', materials: l.materials || [],
        order: l.order ?? 0, aiGenerated: l.aiGenerated ?? false,
        createdAt: toDate(l.createdAt), updatedAt: toDate(l.updatedAt || l.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped lesson ${l._firebaseId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${lessons.length} lessons`);
}

async function migrateEnrollments() {
  console.log('\n📦 Migrating enrollments (progress collection)...');
  const { default: Enrollment } = await import('../server/models/Enrollment.js');
  const enrollments = await getAll('enrollment');

  let migrated = 0;
  for (const e of enrollments) {
    const studentId = e.studentId ? getOrCreateId(e.studentId) : null;
    const courseId = e.courseId ? getOrCreateId(e.courseId) : null;
    if (!studentId || !courseId) continue;
    try {
      await Enrollment.create({
        studentId, courseId,
        enrolledAt: toDate(e.enrolledAt),
        progress: {
          completedModules: (e.progress?.completedModules || []).map(id => getOrCreateId(id)),
          completedLessons: (e.progress?.completedLessons || []).map(id => getOrCreateId(id)),
          overallProgress: e.progress?.overallProgress ?? 0,
        },
      });
      migrated++;
    } catch (e2) {
      console.warn(`  ⚠️  Skipped enrollment: ${e2.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${enrollments.length} enrollments`);
}

async function migrateForumPosts() {
  console.log('\n📦 Migrating forum posts...');
  const { default: Post } = await import('../server/models/Post.js');
  const posts = await getAll('post');

  let migrated = 0;
  for (const p of posts) {
    const mongoId = getOrCreateId(p._firebaseId);
    const authorId = p.authorId ? getOrCreateId(p.authorId) : new mongoose.Types.ObjectId();
    const replies = (p.replies || []).map(r => ({
      _id: getOrCreateId(r.id || String(Math.random())),
      authorId: r.authorId ? getOrCreateId(r.authorId) : new mongoose.Types.ObjectId(),
      authorName: r.authorName, role: r.role, content: r.content,
      votes: new Map(Object.entries(r.votes || {})),
      score: r.score ?? 0, parentReplyId: r.parentReplyId ? getOrCreateId(r.parentReplyId) : null,
      editedAt: r.editedAt ? toDate(r.editedAt) : null,
      isAccepted: r.id === p.acceptedReplyId,
      createdAt: toDate(r.createdAt),
    }));

    try {
      await Post.create({
        _id: mongoId, title: p.title, content: p.content, authorId, authorName: p.authorName,
        role: p.role, isPinned: p.isPinned ?? false, isLocked: p.isLocked ?? false,
        reactions: new Map(Object.entries(p.reactions || {})),
        votes: new Map(Object.entries(p.votes || {})),
        score: p.score ?? 0, tags: p.tags || [], images: p.images || [], videos: p.videos || [],
        resolutionStatus: p.resolutionStatus || 'unanswered',
        acceptedReplyId: p.acceptedReplyId ? getOrCreateId(p.acceptedReplyId) : null,
        replies, postType: p.postType || 'text', pollOptions: p.pollOptions || [],
        nsfw: p.nsfw ?? false, flair: p.flair || null,
        isExamRelevant: p.isExamRelevant ?? false, isInKnowledgeBase: p.isInKnowledgeBase ?? false,
        searchTokens: p.searchIndex?.tokens || [], searchBigrams: p.searchIndex?.bigrams || [],
        createdAt: toDate(p.createdAt), updatedAt: toDate(p.updatedAt || p.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped post ${p._firebaseId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${posts.length} forum posts`);
}

async function migrateNotifications() {
  console.log('\n📦 Migrating notifications...');
  const { default: Notification } = await import('../server/models/Notification.js');
  const notifications = await getAll('notification');

  let migrated = 0;
  for (const n of notifications) {
    const userId = n.userId ? getOrCreateId(n.userId) : null;
    if (!userId) continue;
    try {
      await Notification.create({
        userId, type: n.type || 'custom', title: n.title, message: n.message,
        read: n.read ?? false,
        courseId: n.courseId ? getOrCreateId(n.courseId) : null,
        itemId: n.itemId ? getOrCreateId(n.itemId) : null,
        guidance: n.guidance || null,
        createdAt: toDate(n.createdAt),
      });
      migrated++;
    } catch (e) {
      console.warn(`  ⚠️  Skipped notification: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${migrated}/${notifications.length} notifications`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log('🚀 Starting Firestore → MongoDB migration...\n');
console.log('⚠️  WARNING: This will write to your MongoDB instance. Ensure it is empty before running.');

await migrateUsers();
await migrateCourses();
await migrateModules();
await migrateLessons();
await migrateEnrollments();
await migrateForumPosts();
await migrateNotifications();

await mongoose.disconnect();
await admin.app().delete();

console.log('\n🎉 Migration complete!');
console.log('ℹ️  Next steps:');
console.log('   1. Verify data in MongoDB Compass or mongosh');
console.log('   2. Notify users to reset their passwords');
console.log('   3. Remove Firebase dependencies from the frontend');
