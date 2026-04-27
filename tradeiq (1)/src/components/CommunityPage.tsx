import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  User, 
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Trash2,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  increment,
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { CommunityPost, CommunityComment, UserInteraction, UserProfile } from '../types';

const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD',
  'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'BTC/USD'
];

export default function CommunityPage({ userProfile, isAdmin }: { userProfile: UserProfile | null, isAdmin: boolean }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPair, setFilterPair] = useState('All');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create Post Form
  const [newPost, setNewPost] = useState({
    currency_pair: 'EUR/USD',
    entry: '',
    stop_loss: '',
    take_profit: '',
    description: ''
  });

  useEffect(() => {
    let q = query(collection(db, 'community_posts'));
    
    if (filterPair !== 'All') {
      q = query(q, where('currency_pair', '==', filterPair));
    }
    
    if (sortBy === 'latest') {
      q = query(q, orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('likes', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost)));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching community posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [filterPair, sortBy]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile || userProfile.plan !== 'Pro') return;
    
    setIsCreating(true);
    try {
      const postData = {
        userId: auth.currentUser.uid,
        userName: userProfile.displayName || auth.currentUser.email?.split('@')[0] || 'Trader',
        currency_pair: newPost.currency_pair,
        entry: parseFloat(newPost.entry),
        stop_loss: parseFloat(newPost.stop_loss),
        take_profit: parseFloat(newPost.take_profit),
        description: newPost.description,
        result: 'Pending',
        likes: 0,
        dislikes: 0,
        commentCount: 0,
        createdAt: Timestamp.now().toDate().toISOString()
      };
      
      await addDoc(collection(db, 'community_posts'), postData);
      setShowCreateModal(false);
      setNewPost({
        currency_pair: 'EUR/USD',
        entry: '',
        stop_loss: '',
        take_profit: '',
        description: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community_posts');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-emerald-500" />
            Community Feed
          </h2>
          <p className="text-slate-500 mt-1">Share setups, learn from others, and track community accuracy.</p>
        </div>
        
        {userProfile?.plan === 'Pro' ? (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Share Setup
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pro Feature: Share Setups</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
          <Filter className="w-3 h-3" />
          Filter:
        </div>
        
        <select 
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
          className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
        >
          <option value="All">All Pairs</option>
          {CURRENCY_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => setSortBy('latest')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'latest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Latest
          </button>
          <button 
            onClick={() => setSortBy('popular')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'popular' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Popular
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Loading community setups...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No setups shared yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Be the first to share a trade setup with the community!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {posts.map((post, index) => (
                <PostCard key={post.id} post={post} userProfile={userProfile} index={index} isAdmin={isAdmin} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Share Trade Setup</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleCreatePost} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Currency Pair</label>
                      <select 
                        value={newPost.currency_pair}
                        onChange={(e) => setNewPost({...newPost, currency_pair: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                      >
                        {CURRENCY_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Entry Price</label>
                      <input 
                        type="number" 
                        step="0.00001"
                        required
                        value={newPost.entry}
                        onChange={(e) => setNewPost({...newPost, entry: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="1.08500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Stop Loss</label>
                      <input 
                        type="number" 
                        step="0.00001"
                        required
                        value={newPost.stop_loss}
                        onChange={(e) => setNewPost({...newPost, stop_loss: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="1.08200"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Take Profit</label>
                      <input 
                        type="number" 
                        step="0.00001"
                        required
                        value={newPost.take_profit}
                        onChange={(e) => setNewPost({...newPost, take_profit: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="1.09500"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Short Description</label>
                      <textarea 
                        required
                        value={newPost.description}
                        onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                        placeholder="Explain your reasoning for this trade..."
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isCreating ? 'Sharing...' : 'Post to Community'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PostCardProps {
  post: CommunityPost;
  userProfile: UserProfile | null;
  index: number;
  isAdmin: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, userProfile, index, isAdmin }) => {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [userInteraction, setUserInteraction] = useState<UserInteraction | null>(null);
  const isOwner = auth.currentUser?.uid === post.userId;
  const canDelete = isOwner || isAdmin;

  useEffect(() => {
    if (showComments) {
      const q = query(
        collection(db, `community_posts/${post.id}/comments`),
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityComment)));
      });
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  useEffect(() => {
    if (auth.currentUser) {
      const interactionRef = doc(db, `community_posts/${post.id}/interactions`, auth.currentUser.uid);
      const unsubscribe = onSnapshot(interactionRef, (doc) => {
        if (doc.exists()) {
          setUserInteraction(doc.data() as UserInteraction);
        } else {
          setUserInteraction(null);
        }
      });
      return () => unsubscribe();
    }
  }, [post.id]);

  const handleInteraction = async (type: 'like' | 'dislike') => {
    if (!auth.currentUser) return;
    
    const interactionRef = doc(db, `community_posts/${post.id}/interactions`, auth.currentUser.uid);
    const postRef = doc(db, 'community_posts', post.id);
    
    try {
      if (userInteraction?.type === type) {
        // Remove interaction
        await deleteDoc(interactionRef);
        await updateDoc(postRef, {
          [type === 'like' ? 'likes' : 'dislikes']: increment(-1)
        });
      } else {
        // Add or change interaction
        const prevType = userInteraction?.type;
        await setDoc(interactionRef, { type });
        
        if (prevType) {
          // Changed from like to dislike or vice-versa
          await updateDoc(postRef, {
            [type === 'like' ? 'likes' : 'dislikes']: increment(1),
            [prevType === 'like' ? 'likes' : 'dislikes']: increment(-1)
          });
        } else {
          // New interaction
          await updateDoc(postRef, {
            [type === 'like' ? 'likes' : 'dislikes']: increment(1)
          });
        }
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newComment.trim()) return;
    
    setIsCommenting(true);
    try {
      const commentData = {
        userId: auth.currentUser.uid,
        userName: userProfile?.displayName || auth.currentUser.email?.split('@')[0] || 'Trader',
        text: newComment,
        createdAt: Timestamp.now().toDate().toISOString()
      };
      
      await addDoc(collection(db, `community_posts/${post.id}/comments`), commentData);
      await updateDoc(doc(db, 'community_posts', post.id), {
        commentCount: increment(1)
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleUpdateResult = async (result: 'Win' | 'Loss') => {
    try {
      await updateDoc(doc(db, 'community_posts', post.id), { result });
    } catch (error) {
      console.error("Error updating result:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', post.id));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="p-8">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 tracking-tight">{post.userName}</h4>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {post.result !== 'Pending' && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${post.result === 'Win' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {post.result === 'Win' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                Result: {post.result}
              </div>
            )}
            
            {canDelete && (
              <div className="flex items-center gap-2">
                {isOwner && post.result === 'Pending' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleUpdateResult('Win')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Mark as Win">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleUpdateResult('Loss')} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Mark as Loss">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button onClick={handleDeletePost} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pair</p>
            <p className="text-lg font-black text-slate-900">{post.currency_pair}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry</p>
            <p className="text-lg font-black text-emerald-500 font-mono">{post.entry.toFixed(5)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stop Loss</p>
            <p className="text-lg font-black text-rose-500 font-mono">{post.stop_loss.toFixed(5)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Take Profit</p>
            <p className="text-lg font-black text-blue-500 font-mono">{post.take_profit.toFixed(5)}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <p className="text-slate-600 leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Interactions Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => handleInteraction('like')}
              className={`flex items-center gap-2 group transition-all ${userInteraction?.type === 'like' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
            >
              <ThumbsUp className={`w-5 h-5 ${userInteraction?.type === 'like' ? 'fill-current' : ''}`} />
              <span className="text-sm font-black">{post.likes}</span>
            </button>
            <button 
              onClick={() => handleInteraction('dislike')}
              className={`flex items-center gap-2 group transition-all ${userInteraction?.type === 'dislike' ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
            >
              <ThumbsDown className={`w-5 h-5 ${userInteraction?.type === 'dislike' ? 'fill-current' : ''}`} />
              <span className="text-sm font-black">{post.dislikes}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 group transition-all ${showComments ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
            >
              <MessageSquare className={`w-5 h-5 ${showComments ? 'fill-current' : ''}`} />
              <span className="text-sm font-black">{post.commentCount}</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors"
          >
            {showComments ? 'Hide Comments' : 'View Discussion'}
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-8 space-y-6">
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900 tracking-tight">{comment.userName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-4 italic">No comments yet. Start the discussion!</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-4 pr-12 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      type="submit"
                      disabled={!newComment.trim() || isCommenting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
