"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ImageGallery } from "@/components/ui/image-gallery";
import { timeAgo, roleFlair } from "@/lib/utils";
import {
  BadgeCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowBigUp,
  ArrowBigDown,
  Reply,
  ShieldCheck,
} from "lucide-react";
import { CodeBlockPlus } from "@/components/CodeBlockPlus";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
const MOD_ROLES = ["admin", "teacher", "instructor"];

function normalizePost(p) {
  return {
    ...p,
    id: p._id?.toString() || p.id,
    replies: (p.replies || []).map((r) => ({
      ...r,
      id: r._id?.toString() || r.id,
    })),
  };
}

function detectAcademicSections(content) {
  if (!content) return [{ type: "content", text: content }];
  const sections = [];
  const lines = content.split("\n");
  let current = { type: "content", text: "" };
  const patterns = {
    problem: /^(?:#+\s*)?(?:problem|issue|bug|error)/i,
    context: /^(?:#+\s*)?(?:context|background|situation)/i,
    attempts: /^(?:#+\s*)?(?:attempt|tried|what.*tried)/i,
    expected: /^(?:#+\s*)?(?:expected|want|should|need)/i,
    actual: /^(?:#+\s*)?(?:actual|getting|result)/i,
  };
  for (const line of lines) {
    let found = false;
    for (const [type, re] of Object.entries(patterns)) {
      if (re.test(line.trim())) {
        if (current.text.trim()) sections.push(current);
        current = { type, text: "" };
        found = true;
        break;
      }
    }
    if (!found) current.text += (current.text ? "\n" : "") + line;
  }
  if (current.text.trim()) sections.push(current);
  return sections.length > 0 ? sections : [{ type: "content", text: content }];
}

function AcademicSection({ type, children }) {
  const config = {
    problem: { label: "Problem", color: "red", icon: "🐛" },
    context: { label: "Context", color: "blue", icon: "📋" },
    attempts: { label: "Attempts", color: "yellow", icon: "🔧" },
    expected: { label: "Expected", color: "green", icon: "✅" },
    actual: { label: "Actual", color: "orange", icon: "⚠️" },
    content: { label: "Content", color: "gray", icon: "📝" },
  }[type] || { label: "Content", color: "gray", icon: "📝" };
  const colors = {
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
    gray: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
  };
  return (
    <div className={`mb-4 border rounded-lg p-4 ${colors[config.color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{config.icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">
          {config.label}
        </span>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
        {children}
      </div>
    </div>
  );
}

export default function TopicPage({ params }) {
  const { id } = params;
  const { userData } = useAuth();
  const userId = userData?._id?.toString();
  const isModerator = MOD_ROLES.includes(String(userData?.role || '').toLowerCase());
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [text, setText] = useState("");
  const [sort, setSort] = useState("new");

  const markdownComponents = useMemo(
    () => ({ code: (props) => <CodeBlockPlus {...props} /> }),
    []
  );

  const loadPost = useCallback(async () => {
    try {
      const data = await api.get(`/api/forum/posts/${id}`);
      setPost(normalizePost(data.post));
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPost(); }, [loadPost]);

  useEffect(() => {
    if (!post) return;
    const list = Array.isArray(post.replies) ? post.replies : [];
    const sorted = [...list].sort((a, b) => {
      if (sort === "top") return (b.score || 0) - (a.score || 0);
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return tb - ta;
    });
    setReplies(sorted);
  }, [post, sort]);

  const tree = useMemo(() => {
    const byId = Object.create(null);
    replies.forEach((r) => { byId[r.id] = { ...r, children: [] }; });
    const roots = [];
    replies.forEach((r) => {
      if (r.parentReplyId) {
        const parent = byId[r.parentReplyId];
        if (parent) parent.children.push(byId[r.id]);
        else roots.push(byId[r.id]);
      } else roots.push(byId[r.id]);
    });
    return roots;
  }, [replies]);

  const toggle = (rid) => setExpanded((e) => ({ ...e, [rid]: !e[rid] }));

  const sendReply = async () => {
    if (!text.trim()) return alert("Enter a reply");
    if (!userId) return alert("Please sign in");
    const contentToSend = text.trim();
    setText("");
    try {
      await api.post('/api/forum/reply', { postId: id, content: contentToSend });
      await loadPost();
    } catch (err) {
      alert(err.message || "Failed to post reply");
      setText(contentToSend);
    }
  };

  const vote = async (replyId, voteType) => {
    if (!userId) return alert("Please sign in");
    try {
      await api.post('/api/forum/vote', { postId: id, replyId, voteType });
      await loadPost();
    } catch (err) {
      alert(err.message || "Failed to vote");
    }
  };

  const replyTo = async (parentId, content) => {
    const msg = (content ?? "").trim();
    if (!msg) return alert("Enter a reply");
    if (!userId) return alert("Please sign in");
    try {
      await api.post('/api/forum/reply', { postId: id, content: msg, parentReplyId: parentId });
      await loadPost();
    } catch (err) {
      alert(err.message || "Failed to post reply");
    }
  };

  const del = async (replyId) => {
    if (!userId) return alert("Please sign in");
    if (!confirm("Delete this reply?")) return;
    try {
      await api.delete('/api/forum/reply', { postId: id, replyId });
      await loadPost();
    } catch (err) {
      alert(err.message || "Failed to delete reply");
    }
  };

  const updateResolutionStatus = async (newStatus) => {
    try {
      await api.patch('/api/forum/status', { postId: id, resolutionStatus: newStatus });
      await loadPost();
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  if (loading) return <SkeletonTopicPage />;

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <Link href="/forum" className="text-indigo-600 hover:underline">
          ← Back to Forum
        </Link>
        <div className="mt-6">Topic not found</div>
      </div>
    );
  }

  const instructorReplied =
    Array.isArray(post.replies) && post.replies.some((r) => MOD_ROLES.includes(r.role));
  const hasCode = !!(post.content && post.content.includes("```"));

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6 md:grid md:grid-cols-[minmax(0,1.2fr)_260px] md:gap-6">
        <div className="space-y-6">
          <Link href="/forum" className="text-indigo-600 hover:underline text-sm">
            ← Back to Forum
          </Link>

          <Card className="p-6 shadow-sm bg-white/80 dark:bg-slate-800/80">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={post.authorName || ""} className="w-10 h-10" />
                  <div>
                    <div className="text-xs text-slate-500">
                      Posted by {post.authorName || "User"}
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const f = roleFlair(post.role);
                        return <Badge variant={f.variant}>{f.emoji} {f.label}</Badge>;
                      })()}
                      <span className="text-xs text-slate-500">{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.isPinned && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="w-3 h-3" /> Pinned
                    </Badge>
                  )}
                  {post.isLocked && <Badge variant="warning">Locked</Badge>}
                  {post.isExamRelevant && (
                    <Badge variant="warning" className="gap-1">Exam relevant</Badge>
                  )}
                  {post.isInKnowledgeBase && (
                    <Badge variant="secondary" className="gap-1">In Knowledge Base</Badge>
                  )}
                  {instructorReplied && (
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck className="w-3 h-3" /> Instructor replied
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mr-2">
                  {post.title}
                </h1>
                <ResolutionChip resolutionStatus={post.resolutionStatus} />
              </div>

              {hasCode ? (
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-4">
                    {detectAcademicSections(post.content || "").map((section, index) => (
                      <AcademicSection key={index} type={section.type}>
                        <ReactMarkdown components={markdownComponents}>{section.text}</ReactMarkdown>
                      </AcademicSection>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {detectAcademicSections(post.content || "").map((section, index) => (
                    <AcademicSection key={index} type={section.type}>
                      <ReactMarkdown components={markdownComponents}>{section.text}</ReactMarkdown>
                    </AcademicSection>
                  ))}
                </div>
              )}

              {(() => {
                const fromVideos = Array.isArray(post.videos) ? post.videos : [];
                const fromImages = Array.isArray(post.images) ? post.images : [];
                const all = [...fromVideos, ...fromImages].filter((x) => typeof x === 'string' && x.trim());
                const videos = all.filter((url) => /\.(mp4|webm|ogg)(\?|#|$)/i.test(String(url || '')));
                if (videos.length === 0) return null;
                return (
                  <div className="mt-3 space-y-2">
                    {videos.slice(0, 1).map((src) => (
                      <div key={src} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-black">
                        <video src={src} controls className="w-full max-h-[520px] object-contain" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {Array.isArray(post.images) && post.images.length > 0 && (
                <ImageGallery images={post.images.filter((url) => typeof url === 'string' && !/\.(mp4|webm|ogg)(\?|#|$)/i.test(String(url || '')))} />
              )}

              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((t, i) => (
                    <Badge key={i} variant="outline">#{t}</Badge>
                  ))}
                </div>
              )}

              {isModerator && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <Button
                    size="sm"
                    variant={post.isExamRelevant ? "default" : "outline"}
                    onClick={async () => {
                      try {
                        const data = await api.patch('/api/forum/exam', { postId: post.id, isExamRelevant: !post.isExamRelevant });
                        setPost((p) => ({ ...p, isExamRelevant: data.isExamRelevant }));
                      } catch (err) {
                        alert(err.message || "Failed to update exam relevance");
                      }
                    }}
                  >
                    {post.isExamRelevant ? "Unset exam relevant" : "Mark exam relevant"}
                  </Button>
                  {!post.isInKnowledgeBase && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!confirm("Promote this post to the Knowledge Base?")) return;
                        try {
                          await api.patch('/api/forum/promote', { postId: post.id });
                          setPost((p) => ({ ...p, isInKnowledgeBase: true }));
                          alert("Promoted to Knowledge Base");
                        } catch (err) {
                          alert(err.message || "Failed to promote");
                        }
                      }}
                    >
                      Promote to Knowledge Base
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {!post.isLocked && (
            <Card className="p-5 bg-white/80 dark:bg-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Join the conversation</p>
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="w-3 h-3" /> Markdown supported
                </Badge>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a thoughtful, code-friendly reply..."
                className="font-mono"
                rows={5}
              />
              <div className="flex justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Resolution:</span>
                  <ResolutionChip resolutionStatus={post.resolutionStatus} />
                  {(isModerator || userId === post.authorId?.toString()) && (
                    <Button
                      size="sm"
                      variant={post.resolutionStatus === "solved" ? "default" : "outline"}
                      onClick={() => {
                        const newStatus = post.resolutionStatus === "solved" ? "in_progress" : "solved";
                        updateResolutionStatus(newStatus);
                      }}
                    >
                      {post.resolutionStatus === "solved" ? "Mark in progress" : "Mark solved"}
                    </Button>
                  )}
                </div>
                <Button onClick={sendReply}>Post comment</Button>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {Array.isArray(post?.replies) ? post.replies.length : 0} Comments
            </div>
            <div className="shrink-0 w-full max-w-[280px] sm:max-w-[320px]">
              <div className="flex gap-2 justify-end px-2 py-1">
                <Button
                  variant={sort === "new" ? "default" : "outline"}
                  onClick={() => setSort("new")}
                  className="px-3"
                >
                  Newest
                </Button>
                <Button
                  variant={sort === "top" ? "default" : "outline"}
                  onClick={() => setSort("top")}
                  className="px-3"
                >
                  Top
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {post.acceptedReplyId && (
              <AcceptedAnswerBanner
                post={post}
                replies={replies}
                onVote={vote}
                onDelete={del}
                onReply={replyTo}
                expanded={expanded}
                toggle={toggle}
              />
            )}
            {tree.map((r) => (
              <ReplyNode
                key={r.id}
                r={r}
                depth={0}
                postId={id}
                onVote={vote}
                onDelete={del}
                onReply={replyTo}
                onReload={loadPost}
                expanded={expanded}
                toggle={toggle}
                acceptedReplyId={post.acceptedReplyId}
              />
            ))}
            {replies.length === 0 && (
              <Card className="p-8 text-center bg-white/70 dark:bg-slate-800/70 border-dashed border-2 border-slate-200">
                <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-slate-600">No comments yet. Start the discussion!</p>
              </Card>
            )}
          </div>
        </div>

        <aside className="mt-10 md:mt-0 space-y-4">
          <TimelineRail post={post} replies={replies} />
        </aside>
      </div>
    </div>
  );
}

function ResolutionChip({ resolutionStatus }) {
  const status = resolutionStatus || "unanswered";
  if (status === "solved") return <Badge variant="success" className="text-xs">Solved</Badge>;
  if (status === "in_progress") return <Badge variant="secondary" className="text-xs">In progress</Badge>;
  return <Badge variant="outline" className="text-xs">Unanswered</Badge>;
}

function AcceptedAnswerBanner({ post, replies, onVote, onDelete, onReply, expanded, toggle }) {
  const accepted = Array.isArray(replies)
    ? replies.find((r) => r.id === post.acceptedReplyId?.toString())
    : null;
  if (!accepted) return null;
  return (
    <Card className="border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/20">
      <div className="flex items-center justify-between mb-2 px-4 pt-3">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Accepted answer</span>
        </div>
      </div>
      <div className="px-2 pb-3">
        <ReplyNode
          r={accepted}
          depth={0}
          postId={post.id}
          onVote={onVote}
          onDelete={onDelete}
          onReply={onReply}
          onReload={() => {}}
          expanded={expanded}
          toggle={toggle}
          acceptedReplyId={post.acceptedReplyId}
        />
      </div>
    </Card>
  );
}

function ReplyNode({ r, depth, postId, onVote, onDelete, onReply, onReload, expanded, toggle, acceptedReplyId }) {
  const [subText, setSubText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(r.content || "");
  const { userData } = useAuth();
  const userId = userData?._id?.toString();
  const isModerator = MOD_ROLES.includes(String(userData?.role || '').toLowerCase());

  const hasChildren = r.children && r.children.length > 0;
  const isOpen = expanded[r.id] ?? true;
  const borderColors = [
    "border-slate-200",
    "border-indigo-200",
    "border-amber-200",
    "border-emerald-200",
    "border-pink-200",
  ];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  const canEdit = userId && (userId === r.authorId?.toString() || isModerator);
  const canDelete = userId && (userId === r.authorId?.toString() || isModerator);
  const isAccepted = acceptedReplyId?.toString() === r.id;

  const saveEdit = async () => {
    if (!canEdit) return;
    try {
      await api.patch('/api/forum/reply', { postId, replyId: r.id, content: editText });
      setEditing(false);
      await onReload();
    } catch (err) {
      alert(err.message || "Failed to edit reply");
    }
  };

  const isInstructor = ["teacher", "instructor", "admin"].includes(r.role);
  const markers = r.markers || {};

  return (
    <Card
      id={`reply-${r.id}`}
      className={`p-4 bg-white/80 dark:bg-slate-800/80 border-l-4 ${borderColor} ${
        isAccepted ? "ring-2 ring-emerald-400" : ""
      }`}
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <IconButton
            icon={<ArrowBigUp className="w-4 h-4" />}
            label="Upvote"
            onClick={() => onVote(r.id, "upvote")}
          />
          <IconButton
            icon={<ArrowBigDown className="w-4 h-4" />}
            label="Downvote"
            onClick={() => onVote(r.id, "downvote")}
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar name={r.authorName || ""} className="w-7 h-7" />
            <span className="font-medium text-slate-900 dark:text-white">
              {r.authorName || "User"}
            </span>
            {(() => {
              const f = roleFlair(r.role);
              return <Badge variant={f.variant}>{f.emoji} {f.label}</Badge>;
            })()}
            {isInstructor && (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Instructor
              </Badge>
            )}
            {isAccepted && (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="w-3 h-3" /> Accepted
              </Badge>
            )}
            <span className="text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
            <button
              className="ml-auto text-xs text-slate-500 flex items-center gap-1"
              onClick={() => toggle(r.id)}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}{" "}
              {isOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="font-mono"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditText(r.content || ""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown components={{ code: (props) => <CodeBlockPlus {...props} /> }}>
                {r.content || ""}
              </ReactMarkdown>
            </div>
          )}

          {isOpen && (
            <>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <button
                  className="flex items-center gap-1 hover:text-indigo-600"
                  onClick={() => onReply(r.id, subText || "")}
                >
                  <Reply className="w-4 h-4" /> Reply
                </button>
                {canEdit && (
                  <button className="hover:text-indigo-600" onClick={() => setEditing((v) => !v)}>
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button className="text-red-500 hover:text-red-600" onClick={() => onDelete(r.id)}>
                    Delete
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="uppercase tracking-wide text-[10px] text-slate-400">
                  Quality markers:
                </span>
                <MarkerChip
                  label="Has code"
                  active={!!markers.hasCode}
                  onToggle={async (next) => { await updateMarkers(postId, r.id, userData, { hasCode: next }); await onReload(); }}
                  canToggle={!!userId && (isModerator || userId === r.authorId?.toString())}
                />
                <MarkerChip
                  label="Shows attempt"
                  active={!!markers.showsAttempt}
                  onToggle={async (next) => { await updateMarkers(postId, r.id, userData, { showsAttempt: next }); await onReload(); }}
                  canToggle={!!userId && (isModerator || userId === r.authorId?.toString())}
                />
                <MarkerChip
                  label="Explains why"
                  active={!!markers.explainsWhy}
                  onToggle={async (next) => { await updateMarkers(postId, r.id, userData, { explainsWhy: next }); await onReload(); }}
                  canToggle={!!userId && (isModerator || userId === r.authorId?.toString())}
                />
                <MarkerChip
                  label="Cites ref"
                  active={!!markers.citesRef}
                  onToggle={async (next) => { await updateMarkers(postId, r.id, userData, { citesRef: next }); await onReload(); }}
                  canToggle={!!userId && (isModerator || userId === r.authorId?.toString())}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                  placeholder="Reply with code or context..."
                  rows={2}
                  className="font-mono"
                />
                <Button
                  onClick={() => { onReply(r.id, subText); setSubText(""); }}
                  size="sm"
                >
                  Send
                </Button>
              </div>
              {hasChildren && (
                <div className="mt-3 space-y-3">
                  {r.children.map((c) => (
                    <ReplyNode
                      key={c.id}
                      r={c}
                      depth={depth + 1}
                      postId={postId}
                      onVote={onVote}
                      onDelete={onDelete}
                      onReply={onReply}
                      onReload={onReload}
                      expanded={expanded}
                      toggle={toggle}
                      acceptedReplyId={acceptedReplyId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

async function updateMarkers(postId, replyId, userData, markers) {
  try {
    await api.patch('/api/forum/markers', { postId, replyId, markers });
  } catch {}
}

function MarkerChip({ label, active, onToggle, canToggle }) {
  const classes = active
    ? "px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200"
    : "px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200";
  if (!canToggle) return <span className={classes}>{label}</span>;
  return (
    <button
      type="button"
      className={classes + " hover:bg-emerald-50 hover:border-emerald-300 transition"}
      onClick={() => onToggle(!active)}
    >
      {label}
    </button>
  );
}

function IconButton({ icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition bg-white dark:bg-slate-800"
    >
      {icon}
    </button>
  );
}

function TimelineRail({ post, replies }) {
  const all = Array.isArray(replies) ? replies : [];
  if (!post) return null;
  const byId = Object.create(null);
  all.forEach((r) => (byId[r.id] = r));
  const list = all
    .map((r) => {
      let depth = 0;
      let p = r.parentReplyId;
      while (p && byId[p]) { depth += 1; p = byId[p].parentReplyId; }
      return { ...r, depth };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return (
    <Card className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm h-[55vh] overflow-y-auto scroll-smooth">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Timeline</p>
        <button
          type="button"
          className="text-[11px] text-indigo-600 hover:underline"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Go to top
        </button>
      </div>
      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          <div className="group flex items-center gap-2 pl-4">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm" />
            <span className="text-[11px] text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 transition">
              Thread created • {timeAgo(post.createdAt)}
            </span>
          </div>
          {list.map((r) => {
            const t = new Date(r.createdAt).getTime();
            const isInstructor = ["teacher", "instructor", "admin"].includes(r.role);
            const isAccepted = post.acceptedReplyId?.toString() === r.id;
            return (
              <div key={r.id} className="group flex items-center gap-2 pl-4">
                <span className={`h-2.5 w-2.5 rounded-full ${isAccepted ? "bg-emerald-500" : isInstructor ? "bg-indigo-500" : "bg-slate-400"} shadow-sm`} />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 transition">
                    {r.authorName || "Reply"} • {new Date(t).toLocaleString()}
                  </span>
                  {isInstructor && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Instructor
                    </span>
                  )}
                  {isAccepted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Accepted
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="ml-auto text-[10px] text-indigo-600 hover:underline"
                  onClick={() => {
                    const el = document.getElementById(`reply-${r.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function SkeletonTopicPage() {
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6 md:grid md:grid-cols-[minmax(0,1.2fr)_260px] md:gap-6">
        <div className="space-y-6">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
            </div>
          </Card>
        </div>
        <div className="hidden md:block">
          <Card className="h-40 bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
