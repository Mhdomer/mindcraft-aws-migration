import { Router } from 'express';
import { Types } from 'mongoose';
import Post from '../models/Post.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const PROHIBITED = ['nsfw','porn','sex','nude','explicit','xxx','adult','hate','racist','homophobic','terror','violence'];

function buildSearchIndex(text) {
  const tokens = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const bigrams = tokens.slice(0, -1).map((w, i) => `${w} ${tokens[i + 1]}`);
  return { tokens: [...new Set(tokens)], bigrams: [...new Set(bigrams)] };
}

function violatesPolicy(text) {
  const lc = String(text || '').toLowerCase();
  return PROHIBITED.some(w => lc.includes(w));
}

const router = Router();

// GET /api/forum/posts
router.get('/posts', requireAuth, async (req, res) => {
  try {
    const { search, tag, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (tag) filter.tags = tag;
    if (search) {
      const tokens = search.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      filter.searchTokens = { $in: tokens };
    }
    const posts = await Post.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .select('-searchTokens -searchBigrams');
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/forum/create
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, content, tags, images, videos, postType, pollOptions, context, flair, isExamRelevant } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    if (title.length > 300) return res.status(400).json({ error: 'Title exceeds 300 characters' });
    if (violatesPolicy(title) || violatesPolicy(content)) return res.status(400).json({ error: 'Content violates community guidelines' });

    const { tokens, bigrams } = buildSearchIndex(`${title} ${content}`);
    const post = await Post.create({
      title, content, tags, images, videos, postType, pollOptions, context, flair, isExamRelevant,
      authorId: req.user.id,
      authorName: req.user.name,
      role: req.user.role,
      searchTokens: tokens,
      searchBigrams: bigrams,
    });
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/forum/posts/:id
router.get('/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/forum/reply — add reply to a post
router.post('/reply', requireAuth, async (req, res) => {
  try {
    const { postId, content, parentReplyId } = req.body;
    if (!postId || !content) return res.status(400).json({ error: 'postId and content are required' });
    if (violatesPolicy(content)) return res.status(400).json({ error: 'Content violates community guidelines' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.isLocked) return res.status(403).json({ error: 'Post is locked' });

    const reply = {
      _id: new Types.ObjectId(),
      authorId: req.user.id,
      authorName: req.user.name,
      role: req.user.role,
      content,
      parentReplyId: parentReplyId || null,
      votes: {},
      score: 0,
      createdAt: new Date(),
    };
    post.replies.push(reply);
    if (post.resolutionStatus === 'unanswered') post.resolutionStatus = 'in_progress';
    await post.save();

    res.status(201).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// PATCH /api/forum/reply — edit reply
router.patch('/reply', requireAuth, async (req, res) => {
  try {
    const { postId, replyId, content } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const reply = post.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });
    if (reply.authorId.toString() !== req.user.id) return res.status(403).json({ error: 'Only the author can edit this reply' });

    reply.content = content;
    reply.editedAt = new Date();
    await post.save();
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit reply' });
  }
});

// DELETE /api/forum/reply
router.delete('/reply', requireAuth, async (req, res) => {
  try {
    const { postId, replyId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const reply = post.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const isOwner = reply.authorId.toString() === req.user.id;
    if (!isOwner && !['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });

    await AuditLog.create({ action: 'delete_reply', postId, replyId, deletedContent: reply.content, deletedBy: req.user.id });
    reply.deleteOne();
    await post.save();
    res.json({ message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

// POST /api/forum/vote
router.post('/vote', requireAuth, async (req, res) => {
  try {
    const { postId, replyId, voteType } = req.body; // voteType: 'upvote' | 'downvote'
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (replyId) {
      const reply = post.replies.id(replyId);
      if (!reply) return res.status(404).json({ error: 'Reply not found' });
      const prev = reply.votes.get(req.user.id);
      if (prev === voteType) {
        reply.votes.delete(req.user.id);
        reply.score += prev === 'upvote' ? -1 : 1;
      } else {
        if (prev) reply.score += prev === 'upvote' ? -1 : 1;
        reply.votes.set(req.user.id, voteType);
        reply.score += voteType === 'upvote' ? 1 : -1;
      }
    } else {
      const prev = post.votes.get(req.user.id);
      if (prev === voteType) {
        post.votes.delete(req.user.id);
        post.score += prev === 'upvote' ? -1 : 1;
      } else {
        if (prev) post.score += prev === 'upvote' ? -1 : 1;
        post.votes.set(req.user.id, voteType);
        post.score += voteType === 'upvote' ? 1 : -1;
      }
    }
    await post.save();
    res.json({ score: replyId ? post.replies.id(replyId)?.score : post.score });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/forum/react
router.post('/react', requireAuth, async (req, res) => {
  try {
    const { postId, emoji } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.reactions.get(req.user.id) === emoji) {
      post.reactions.delete(req.user.id);
    } else {
      post.reactions.set(req.user.id, emoji);
    }
    await post.save();
    res.json({ reactions: Object.fromEntries(post.reactions) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to react' });
  }
});

// POST /api/forum/delete — delete post with audit log
router.post('/delete', requireAuth, async (req, res) => {
  try {
    const { postId, reason } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isOwner = post.authorId.toString() === req.user.id;
    if (!isOwner && !['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });

    await AuditLog.create({ action: 'delete_post', postId, deletedContent: post.content, deletedBy: req.user.id, reason });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/forum/accept — mark reply as accepted answer
router.patch('/accept', requireAuth, async (req, res) => {
  try {
    const { postId, replyId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isOwner = post.authorId.toString() === req.user.id;
    if (!isOwner && !['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });

    // Clear previous accepted reply
    post.replies.forEach(r => { r.isAccepted = false; });
    const reply = post.replies.id(replyId);
    if (reply) reply.isAccepted = true;

    post.acceptedReplyId = replyId;
    post.resolutionStatus = 'solved';
    await post.save();
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept reply' });
  }
});

// PATCH /api/forum/pin — pin/unpin post
router.patch('/pin', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.isPinned = !post.isPinned;
    await post.save();
    res.json({ isPinned: post.isPinned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to pin/unpin post' });
  }
});

// PATCH /api/forum/lock — lock/unlock post
router.patch('/lock', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.isLocked = !post.isLocked;
    await post.save();
    res.json({ isLocked: post.isLocked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lock/unlock post' });
  }
});

// PATCH /api/forum/status — update resolution status
router.patch('/status', requireAuth, async (req, res) => {
  try {
    const { postId, resolutionStatus } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const isOwner = post.authorId.toString() === req.user.id;
    if (!isOwner && !['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    post.resolutionStatus = resolutionStatus;
    await post.save();
    res.json({ resolutionStatus: post.resolutionStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /api/forum/exam — toggle exam relevance flag
router.patch('/exam', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { postId, isExamRelevant } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.isExamRelevant = isExamRelevant;
    await post.save();
    res.json({ isExamRelevant: post.isExamRelevant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exam flag' });
  }
});

// PATCH /api/forum/promote — promote to knowledge base
router.patch('/promote', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.isInKnowledgeBase = true;
    await post.save();
    res.json({ isInKnowledgeBase: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote post' });
  }
});

export default router;
