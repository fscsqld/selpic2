'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MessageCircle, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  ArrowLeft,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  Shield,
  Plus,
  X,
  Send,
  Settings,
  Check,
  GripVertical,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { useAdminAuth } from '@/lib/adminAuth'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'

interface Post {
  id: number
  title: string
  author: string
  date: string
  content: string
  likes: number
  comments: number
  category: string
  postComments?: Comment[]
  pinned?: boolean
  hidden?: boolean
  reported?: boolean
}

interface Comment {
  id: number
  postId: number
  author: string
  content: string
  date: string
}

interface CommunityCategory {
  id: string
  name: string
  emoji: string
  bgColor: string
  textColor: string
  borderColor: string
  order: number
  isActive: boolean
  isDefault?: boolean
}

export default function AdminCommunityPage() {
  return (
    <AdminRoute requiredPermissions={['community:read']}>
      <AdminCommunityPageContent />
    </AdminRoute>
  )
}

function AdminCommunityPageContent() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'latest' | 'likes' | 'comments' | 'pinned'>('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editPostForm, setEditPostForm] = useState({
    title: '',
    content: '',
    category: 'General'
  })
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'General'
  })
  const [newComment, setNewComment] = useState('')
  const [categories, setCategories] = useState<CommunityCategory[]>([])
  const [useRemoteCommunity, setUseRemoteCommunity] = useState(false)
  const [isCategoryManageModalOpen, setIsCategoryManageModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CommunityCategory | null>(null)
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    emoji: '💬',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300'
  })

  // 기본 카테고리 정의
  const defaultCategories: CommunityCategory[] = [
    { id: 'all', name: 'All', emoji: '📋', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300', order: 0, isActive: true, isDefault: true },
    { id: 'general', name: 'General', emoji: '💬', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300', order: 1, isActive: true, isDefault: true },
    { id: 'design-showcase', name: 'Design Showcase', emoji: '🎨', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300', order: 2, isActive: true, isDefault: true },
    { id: 'diy-projects', name: 'DIY Projects', emoji: '🛠️', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300', order: 3, isActive: true, isDefault: true },
    { id: 'tips-tricks', name: 'Tips & Tricks', emoji: '💡', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300', order: 4, isActive: true, isDefault: true },
    { id: 'questions', name: 'Questions', emoji: '❓', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300', order: 5, isActive: true, isDefault: true },
    { id: 'events', name: 'Events', emoji: '📅', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', borderColor: 'border-indigo-300', order: 6, isActive: true, isDefault: true },
    { id: 'off-topic', name: 'Off-Topic', emoji: '🎭', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300', order: 7, isActive: true, isDefault: true },
    { id: 'feedback', name: 'Feedback', emoji: '💭', bgColor: 'bg-teal-100', textColor: 'text-teal-800', borderColor: 'border-teal-300', order: 8, isActive: true, isDefault: true }
  ]

  // 카테고리 저장（Supabase 또는 localStorage）
  const saveCategories = useCallback(
    async (newCategories: CommunityCategory[]) => {
      const sortedCategories = [...newCategories].sort((a, b) => a.order - b.order)
      setCategories(sortedCategories)

      if (useRemoteCommunity) {
        try {
          const res = await fetch('/api/admin/community/categories', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: sortedCategories }),
          })
          const data = await res.json()
          if (!res.ok || !data.ok) {
            alert(typeof data.details === 'string' ? data.details : data.error || 'Failed to save categories')
            return
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories)
          }
        } catch {
          alert('Failed to save categories')
        }
        return
      }

      localStorage.setItem('community-categories', JSON.stringify(sortedCategories))
    },
    [useRemoteCommunity]
  )

  // 카테고리별 색상 및 이모지 (하위 호환성)
  const getCategoryStyle = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    if (category) {
      return {
        bg: category.bgColor,
        text: category.textColor,
        badge: category.emoji,
        border: category.borderColor
      }
    }
    // 기본값
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      badge: '💬',
      border: 'border-blue-300'
    }
  }

  // 활성 카테고리만 필터링
  const activeCategories = useMemo(() => {
    return categories.filter(c => c.isActive).sort((a, b) => a.order - b.order)
  }, [categories])

  // "All" 제외한 카테고리 (게시물 작성용)
  const postCategories = useMemo(() => {
    return activeCategories.filter(c => c.id !== 'all').map(c => c.name)
  }, [activeCategories])

  // 선택된 카테고리가 비활성화되었는지 확인하고 자동으로 "All"로 변경
  useEffect(() => {
    if (selectedCategory !== 'All') {
      const selectedCat = categories.find(c => c.name === selectedCategory)
      if (selectedCat && !selectedCat.isActive) {
        console.log('Selected category is inactive, switching to All')
        setSelectedCategory('All')
      }
    }
  }, [categories, selectedCategory])

  // 카테고리별 게시물 수 계산
  const getPostCountByCategory = (categoryName: string) => {
    if (categoryName === 'All') {
      return posts.filter(p => !p.hidden).length
    }
    return posts.filter(p => p.category === categoryName && !p.hidden).length
  }

  // 카테고리 추가
  const handleAddCategory = () => {
    if (!newCategoryForm.name.trim()) {
      alert('Please enter a category name')
      return
    }
    const newCategory: CommunityCategory = {
      id: newCategoryForm.name.toLowerCase().replace(/\s+/g, '-'),
      name: newCategoryForm.name,
      emoji: newCategoryForm.emoji,
      bgColor: newCategoryForm.bgColor,
      textColor: newCategoryForm.textColor,
      borderColor: newCategoryForm.borderColor,
      order: categories.length,
      isActive: true,
      isDefault: false
    }
    const updated = [...categories, newCategory]
    void saveCategories(updated)
    setNewCategoryForm({
      name: '',
      emoji: '💬',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300'
    })
    alert('Category added successfully!')
  }

  // 카테고리 수정
  const handleUpdateCategory = () => {
    if (!editingCategory) {
      console.error('No category selected for editing')
      alert('No category selected for editing')
      return
    }
    console.log('Updating category:', editingCategory)
    const updated = categories.map(c => 
      c.id === editingCategory.id ? { ...editingCategory } : c
    )
    console.log('Updated categories array:', updated)
    void saveCategories(updated)
    setEditingCategory(null)
    alert('Category updated successfully!')
  }

  // 카테고리 삭제
  const handleDeleteCategory = (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category?.isDefault) {
      alert('Default categories cannot be deleted')
      return
    }
    if (confirm('Are you sure you want to delete this category? Posts in this category will not be deleted.')) {
      const updated = categories.filter(c => c.id !== id)
      void saveCategories(updated)
      alert('Category deleted successfully!')
    }
  }

  // 카테고리 활성화/비활성화
  const handleToggleCategoryActive = (id: string) => {
    console.log('handleToggleCategoryActive called with id:', id)
    console.log('Current categories:', categories)
    
    const category = categories.find(c => c.id === id)
    if (!category) {
      console.error('Category not found:', id)
      alert(`Category with id "${id}" not found`)
      return
    }
    
    if (category.isDefault && category.id === 'all') {
      alert('The "All" category cannot be disabled')
      return
    }
    
    const newActiveState = !category.isActive
    console.log('Toggling category:', id, 'from', category.isActive, 'to', newActiveState)
    
    const updated = categories.map(c => 
      c.id === id ? { ...c, isActive: newActiveState } : c
    )
    
    console.log('Updated categories:', updated)
    
    void saveCategories(updated)
    
    // 편집 중인 카테고리라면 상태도 업데이트
    if (editingCategory && editingCategory.id === id) {
      setEditingCategory({ ...editingCategory, isActive: newActiveState })
    }
    
    console.log('Category toggled successfully')
  }

  // 게시글 + 카테고리: Supabase(admin) 우선, 실패 시 localStorage
  useEffect(() => {
    let cancelled = false

    const loadLocalFallback = () => {
      try {
        const stored = localStorage.getItem('community-categories')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (!cancelled) setCategories(parsed)
        } else {
          if (!cancelled) setCategories(defaultCategories)
          localStorage.setItem('community-categories', JSON.stringify(defaultCategories))
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        if (!cancelled) setCategories(defaultCategories)
      }

      try {
        const storedPosts = localStorage.getItem('community-posts')
        if (storedPosts) {
          const parsedPosts = JSON.parse(storedPosts)
          if (!cancelled) setPosts(parsedPosts)
        } else {
          const samplePosts: Post[] = [
            {
              id: 1,
              title: 'Welcome to the Admin Community Board',
              author: 'Admin',
              date: new Date().toISOString(),
              content: 'This is a sample post for administrators to manage community content. Feel free to add, edit, or delete posts as needed.',
              likes: 24,
              comments: 5,
              category: 'General',
              pinned: true,
              hidden: false,
              reported: false,
              postComments: [],
            },
            {
              id: 2,
              title: 'Tips for Managing User Content',
              author: 'Moderator',
              date: new Date().toISOString(),
              content: 'Remember to review reported content promptly and keep the community safe.',
              likes: 18,
              comments: 3,
              category: 'Tips & Tricks',
              pinned: false,
              hidden: false,
              reported: false,
              postComments: [],
            },
          ]
          if (!cancelled) setPosts(samplePosts)
          localStorage.setItem('community-posts', JSON.stringify(samplePosts))
        }
      } catch (error) {
        console.error('Admin: Error loading posts:', error)
        if (!cancelled) setPosts([])
      }
    }

    ;(async () => {
      try {
        const res = await fetch('/api/admin/community/data', { cache: 'no-store', credentials: 'include' })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.ok && Array.isArray(data.posts) && Array.isArray(data.categories)) {
          setUseRemoteCommunity(true)
          setPosts(data.posts)
          setCategories(data.categories)
          return
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) loadLocalFallback()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // 새 게시물 작성
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    const authorLabel = `Admin (${adminUser?.username})`

    if (useRemoteCommunity) {
      try {
        const res = await fetch('/api/admin/community/posts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newPost.title.trim(),
            content: newPost.content.trim(),
            category: newPost.category,
            author: authorLabel,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          alert(data.error === 'MODERATION_REJECT' ? 'Content violates moderation rules.' : 'Failed to create post.')
          return
        }
        setPosts((prev) => [data.post as Post, ...prev])
        setNewPost({ title: '', content: '', category: 'General' })
        setIsNewPostModalOpen(false)
        alert('Post created successfully!')
      } catch {
        alert('Network error.')
      }
      return
    }

    const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1
    const post: Post = {
      id: newId,
      title: newPost.title,
      author: authorLabel,
      date: new Date().toISOString().split('T')[0],
      content: newPost.content,
      likes: 0,
      comments: 0,
      category: newPost.category,
      postComments: []
    }

    const updatedPosts = [post, ...posts]
    setPosts(updatedPosts)
    localStorage.setItem('community-posts', JSON.stringify(updatedPosts))
    
    setNewPost({ title: '', content: '', category: 'General' })
    setIsNewPostModalOpen(false)
    alert('Post created successfully!')
  }

  // 게시물 삭제
  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/admin/community/posts/${postId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          alert('Failed to delete post.')
          return
        }
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        alert('Post deleted successfully!')
        setIsViewModalOpen(false)
      } catch {
        alert('Network error.')
      }
      return
    }

    const updatedPosts = posts.filter(p => p.id !== postId)
    setPosts(updatedPosts)
    localStorage.setItem('community-posts', JSON.stringify(updatedPosts))
    alert('Post deleted successfully!')
    setIsViewModalOpen(false)
  }

  // 게시물 보기
  const handleViewPost = (post: Post) => {
    setSelectedPost(post)
    setIsViewModalOpen(true)
  }

  // 게시물 편집 시작
  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setEditPostForm({
      title: post.title,
      content: post.content,
      category: post.category
    })
    setIsEditModalOpen(true)
  }

  // 게시물 업데이트
  const handleUpdatePost = async () => {
    if (!editingPost || !editPostForm.title.trim() || !editPostForm.content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/admin/community/posts/${editingPost.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editPostForm.title.trim(),
            content: editPostForm.content.trim(),
            category: editPostForm.category,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          alert('Failed to update post.')
          return
        }
        const updated = data.post as Post
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)))
        if (selectedPost && selectedPost.id === editingPost.id) {
          setSelectedPost(updated)
        }
        setIsEditModalOpen(false)
        setEditingPost(null)
        setEditPostForm({ title: '', content: '', category: 'General' })
        alert('Post updated successfully!')
      } catch {
        alert('Network error.')
      }
      return
    }

    const updatedPosts = posts.map(p => 
      p.id === editingPost.id
        ? {
            ...p,
            title: editPostForm.title,
            content: editPostForm.content,
            category: editPostForm.category
          }
        : p
    )

    setPosts(updatedPosts)
    localStorage.setItem('community-posts', JSON.stringify(updatedPosts))

    if (selectedPost && selectedPost.id === editingPost.id) {
      const updatedPost = updatedPosts.find(p => p.id === editingPost.id)
      if (updatedPost) {
        setSelectedPost(updatedPost)
      }
    }

    setIsEditModalOpen(false)
    setEditingPost(null)
    setEditPostForm({ title: '', content: '', category: 'General' })
    alert('Post updated successfully!')
  }

  // 댓글 추가
  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) {
      alert('Please enter a comment')
      return
    }

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/admin/community/posts/${selectedPost.id}/comments`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newComment.trim(),
            author: `Admin (${adminUser?.username})`,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          alert('Failed to add comment.')
          return
        }
        const updated = data.post as Post
        setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? updated : p)))
        setSelectedPost(updated)
        setNewComment('')
        alert('Comment added successfully!')
      } catch {
        alert('Network error.')
      }
      return
    }

    const comment: Comment = {
      id: Date.now(),
      postId: selectedPost.id,
      author: `Admin (${adminUser?.username})`,
      content: newComment,
      date: new Date().toISOString().split('T')[0]
    }

    const updatedPosts = posts.map(p => {
      if (p.id === selectedPost.id) {
        const existingComments = p.postComments || []
        return {
          ...p,
          postComments: [...existingComments, comment],
          comments: (p.postComments?.length || 0) + 1
        }
      }
      return p
    })

    setPosts(updatedPosts)
    localStorage.setItem('community-posts', JSON.stringify(updatedPosts))

    setSelectedPost({
      ...selectedPost,
      postComments: [...(selectedPost.postComments || []), comment],
      comments: (selectedPost.postComments?.length || 0) + 1
    })

    setNewComment('')
    alert('Comment added successfully!')
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!selectedPost) return

    if (!confirm('Are you sure you want to delete this comment?')) return

    if (useRemoteCommunity) {
      try {
        const res = await fetch(
          `/api/admin/community/posts/${selectedPost.id}/comments/${commentId}`,
          { method: 'DELETE', credentials: 'include' }
        )
        const data = await res.json()
        if (!res.ok || !data.ok) {
          alert('Failed to delete comment.')
          return
        }
        const nextComments = (selectedPost.postComments || []).filter((c) => c.id !== commentId)
        const patched: Post = {
          ...selectedPost,
          postComments: nextComments,
          comments: nextComments.length,
        }
        setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? patched : p)))
        setSelectedPost(patched)
        alert('Comment deleted successfully!')
      } catch {
        alert('Network error.')
      }
      return
    }

    const updatedPosts = posts.map(p => {
      if (p.id === selectedPost.id) {
        const updatedComments = (p.postComments || []).filter(c => c.id !== commentId)
        return {
          ...p,
          postComments: updatedComments,
          comments: updatedComments.length
        }
      }
      return p
    })

    setPosts(updatedPosts)
    localStorage.setItem('community-posts', JSON.stringify(updatedPosts))

    const updatedPost = updatedPosts.find(p => p.id === selectedPost.id)
    if (updatedPost) {
      setSelectedPost(updatedPost)
    }

    alert('Comment deleted successfully!')
  }

  // 필터링 + 정렬 + 페이지네이션
  const filteredPosts = useMemo(() => posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    const notHidden = !post.hidden
    
    // 게시물의 카테고리가 활성화되어 있는지 확인
    const postCategory = categories.find(c => c.name === post.category)
    const isCategoryActive = postCategory ? postCategory.isActive : true // 카테고리를 찾을 수 없으면 기본적으로 활성으로 간주
    
    return matchesSearch && matchesCategory && notHidden && isCategoryActive
  }), [posts, searchQuery, selectedCategory, categories])

  const sortedPosts = useMemo(() => {
    const base = [...filteredPosts]
    switch (sortBy) {
      case 'pinned':
        base.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case 'likes':
        base.sort((a, b) => b.likes - a.likes)
        break
      case 'comments':
        base.sort((a, b) => (b.postComments?.length || b.comments || 0) - (a.postComments?.length || a.comments || 0))
        break
      case 'latest':
      default:
        base.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
    }
    return base
  }, [filteredPosts, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex)

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
        <AdminPageHeader
          title="Community Board"
          icon={<MessageCircle className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
          customActions={
            <button
              onClick={() => setIsNewPostModalOpen(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Post
            </button>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Posts</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{posts.length}</p>
                </div>
                <MessageCircle className="w-12 h-12 text-cyan-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tips</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {posts.filter(p => p.category === 'Tips').length}
                  </p>
                </div>
                <Tag className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reviews</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {posts.filter(p => p.category === 'Review').length}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {posts.filter(p => p.category === 'Question').length}
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title, content, or author..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Category Filter - Grid Layout */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Category Filter</h3>
              <button
                onClick={() => setIsCategoryManageModalOpen(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {activeCategories.map((category) => {
                const postCount = getPostCountByCategory(category.name)
                const isSelected = selectedCategory === category.name
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg ${
                      isSelected
                        ? `${category.bgColor} ${category.textColor} ${category.borderColor} border-4 shadow-xl`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } ${!category.isActive ? 'opacity-50' : ''}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className={`w-5 h-5 ${category.textColor}`} />
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-3xl mb-2">{category.emoji}</div>
                      <div className={`font-semibold text-sm mb-1 ${isSelected ? category.textColor : 'text-gray-900'}`}>
                        {category.name}
                      </div>
                      <div className={`text-xs ${isSelected ? category.textColor : 'text-gray-500'}`}>
                        {postCount} {postCount === 1 ? 'post' : 'posts'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No posts found</p>
                        <p className="text-gray-400 text-sm mt-2">
                          {searchQuery || selectedCategory !== 'All' 
                            ? 'Try adjusting your search or filters'
                            : 'Community posts will appear here'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="font-semibold text-gray-900 truncate">{post.title}</p>
                            <p className="text-sm text-gray-500 truncate mt-1">{post.content}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{post.author}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getCategoryStyle(post.category).bg} ${getCategoryStyle(post.category).text}`}>
                            <span>{getCategoryStyle(post.category).badge}</span>
                            {post.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>❤️ {post.likes}</span>
                            <span>💬 {post.comments}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewPost(post)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View post"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit post"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete post"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {sortedPosts.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  {sortedPosts.length} total · Page {currentPage}/{totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Post Modal */}
          {isViewModalOpen && selectedPost && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-xl font-bold text-gray-900">View Post</h3>
                  </div>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-2xl text-gray-500">×</span>
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Post Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getCategoryStyle(selectedPost.category).bg} ${getCategoryStyle(selectedPost.category).text}`}>
                        <span>{getCategoryStyle(selectedPost.category).badge}</span>
                        {selectedPost.category}
                      </span>
                      <span className="text-sm text-gray-500">{selectedPost.date}</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedPost.title}</h2>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="text-sm">By {selectedPost.author}</span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>

                  {/* Post Stats */}
                  <div className="flex items-center gap-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-lg">❤️</span>
                      <span className="font-medium">{selectedPost.likes} likes</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-lg">💬</span>
                      <span className="font-medium">{selectedPost.comments} comments</span>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Comments ({selectedPost.postComments?.length || 0})
                    </h3>

                    {/* Add Comment */}
                    <div className="mb-6 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                      <div className="flex items-start gap-3">
                        <Shield className="w-6 h-6 text-cyan-600 mt-2" />
                        <div className="flex-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment as admin..."
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={handleAddComment}
                              className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                            >
                              <Send className="w-4 h-4" />
                              Add Comment
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedPost.postComments && selectedPost.postComments.length > 0 ? (
                        selectedPost.postComments.map((comment) => (
                          <div key={comment.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-cyan-300 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">{comment.author}</span>
                                <span className="text-sm text-gray-500">{comment.date}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No comments yet</p>
                          <p className="text-sm text-gray-400 mt-1">Be the first to comment!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false)
                        handleEditPost(selectedPost)
                      }}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-5 h-5" />
                      Edit Post
                    </button>
                    <button
                      onClick={() => handleDeletePost(selectedPost.id)}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Management Modal */}
          {isCategoryManageModalOpen && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                // 모달 배경 클릭 시에만 모달 닫기
                if (e.target === e.currentTarget) {
                  setIsCategoryManageModalOpen(false)
                  setEditingCategory(null)
                  setNewCategoryForm({
                    name: '',
                    emoji: '💬',
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    borderColor: 'border-blue-300'
                  })
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-xl font-bold text-gray-900">Manage Categories</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsCategoryManageModalOpen(false)
                      setEditingCategory(null)
                      setNewCategoryForm({
                        name: '',
                        emoji: '💬',
                        bgColor: 'bg-blue-100',
                        textColor: 'text-blue-800',
                        borderColor: 'border-blue-300'
                      })
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Add New Category */}
                  {!editingCategory && (
                    <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                          <input
                            type="text"
                            value={newCategoryForm.name}
                            onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                            placeholder="e.g., Announcements"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                          <input
                            type="text"
                            value={newCategoryForm.emoji}
                            onChange={(e) => setNewCategoryForm({ ...newCategoryForm, emoji: e.target.value })}
                            placeholder="💬"
                            maxLength={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-2xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                          <select
                            value={newCategoryForm.bgColor}
                            onChange={(e) => setNewCategoryForm({ ...newCategoryForm, bgColor: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="bg-blue-100">Blue</option>
                            <option value="bg-purple-100">Purple</option>
                            <option value="bg-green-100">Green</option>
                            <option value="bg-orange-100">Orange</option>
                            <option value="bg-red-100">Red</option>
                            <option value="bg-indigo-100">Indigo</option>
                            <option value="bg-teal-100">Teal</option>
                            <option value="bg-gray-100">Gray</option>
                            <option value="bg-pink-100">Pink</option>
                            <option value="bg-yellow-100">Yellow</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                          <select
                            value={newCategoryForm.textColor}
                            onChange={(e) => {
                              const textColor = e.target.value
                              const borderColor = textColor.replace('text-', 'border-').replace('-800', '-300')
                              setNewCategoryForm({ ...newCategoryForm, textColor, borderColor })
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="text-blue-800">Blue</option>
                            <option value="text-purple-800">Purple</option>
                            <option value="text-green-800">Green</option>
                            <option value="text-orange-800">Orange</option>
                            <option value="text-red-800">Red</option>
                            <option value="text-indigo-800">Indigo</option>
                            <option value="text-teal-800">Teal</option>
                            <option value="text-gray-800">Gray</option>
                            <option value="text-pink-800">Pink</option>
                            <option value="text-yellow-800">Yellow</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleAddCategory}
                        className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                      >
                        Add Category
                      </button>
                    </div>
                  )}

                  {/* Edit Category */}
                  {editingCategory ? (
                    <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Edit Category: {editingCategory.name || 'Unknown'}</h4>
                        <button
                          onClick={() => {
                            console.log('Cancel edit clicked')
                            setEditingCategory(null)
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          type="button"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mb-4 text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                        <div className="font-semibold mb-1">Category Info:</div>
                        <div>ID: {editingCategory.id}</div>
                        <div>Status: {editingCategory.isActive ? '✅ Active' : '❌ Inactive'}</div>
                        {editingCategory.isDefault && <div>Type: Default Category</div>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            disabled={editingCategory.isDefault}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                          <input
                            type="text"
                            value={editingCategory.emoji}
                            onChange={(e) => setEditingCategory({ ...editingCategory, emoji: e.target.value })}
                            maxLength={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-2xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                          <select
                            value={editingCategory.bgColor}
                            onChange={(e) => setEditingCategory({ ...editingCategory, bgColor: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="bg-blue-100">Blue</option>
                            <option value="bg-purple-100">Purple</option>
                            <option value="bg-green-100">Green</option>
                            <option value="bg-orange-100">Orange</option>
                            <option value="bg-red-100">Red</option>
                            <option value="bg-indigo-100">Indigo</option>
                            <option value="bg-teal-100">Teal</option>
                            <option value="bg-gray-100">Gray</option>
                            <option value="bg-pink-100">Pink</option>
                            <option value="bg-yellow-100">Yellow</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                          <select
                            value={editingCategory.textColor}
                            onChange={(e) => {
                              const textColor = e.target.value
                              const borderColor = textColor.replace('text-', 'border-').replace('-800', '-300')
                              setEditingCategory({ ...editingCategory, textColor, borderColor })
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="text-blue-800">Blue</option>
                            <option value="text-purple-800">Purple</option>
                            <option value="text-green-800">Green</option>
                            <option value="text-orange-800">Orange</option>
                            <option value="text-red-800">Red</option>
                            <option value="text-indigo-800">Indigo</option>
                            <option value="text-teal-800">Teal</option>
                            <option value="text-gray-800">Gray</option>
                            <option value="text-pink-800">Pink</option>
                            <option value="text-yellow-800">Yellow</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => {
                            console.log('Cancel edit clicked')
                            setEditingCategory(null)
                          }}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            console.log('Save Changes clicked, editingCategory:', editingCategory)
                            handleUpdateCategory()
                          }}
                          className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                          type="button"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                      <p className="font-medium mb-1">No category selected for editing</p>
                      <p className="text-xs">Click the <span className="font-semibold">Edit</span> button (✏️) on any category below to start editing.</p>
                    </div>
                  )}

                  {/* Category List */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">All Categories</h4>
                    <div className="space-y-2">
                      {[...categories].sort((a, b) => a.order - b.order).map((category) => {
                        const postCount = getPostCountByCategory(category.name)
                        return (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                              <div className={`text-2xl ${category.isDefault ? 'opacity-50' : ''}`}>
                                {category.emoji}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${category.textColor}`}>{category.name}</span>
                                  {category.isDefault && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Default</span>
                                  )}
                                  {!category.isActive && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{postCount} posts</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  e.nativeEvent.stopImmediatePropagation()
                                  console.log('Toggle button clicked for category:', category.id, 'current state:', category.isActive)
                                  handleToggleCategoryActive(category.id)
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm hover:shadow-md ${
                                  category.isActive
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                                }`}
                                disabled={category.id === 'all'}
                                type="button"
                                style={{ pointerEvents: 'auto', zIndex: 10 }}
                              >
                                {category.isActive ? 'Active' : 'Inactive'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  e.nativeEvent.stopImmediatePropagation()
                                  console.log('Edit button clicked for category:', category)
                                  
                                  // 카테고리 객체를 완전히 새로 생성
                                  const categoryCopy: CommunityCategory = { 
                                    id: category.id,
                                    name: category.name,
                                    emoji: category.emoji,
                                    bgColor: category.bgColor,
                                    textColor: category.textColor,
                                    borderColor: category.borderColor,
                                    order: category.order,
                                    isActive: category.isActive,
                                    isDefault: category.isDefault
                                  }
                                  
                                  console.log('Setting editing category:', categoryCopy)
                                  console.log('Current editingCategory state before:', editingCategory)
                                  
                                  // 상태 업데이트
                                  setEditingCategory(categoryCopy)
                                  
                                  // 상태 업데이트 확인
                                  setTimeout(() => {
                                    console.log('Editing category after setState - should be visible now')
                                  }, 100)
                                }}
                                className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer border-2 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-md"
                                title="Edit"
                                type="button"
                                style={{ pointerEvents: 'auto', zIndex: 10 }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!category.isDefault && (
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Post Modal */}
          {isEditModalOpen && editingPost && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-xl font-bold text-gray-900">Edit Post</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false)
                      setEditingPost(null)
                      setEditPostForm({ title: '', content: '', category: 'General' })
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {activeCategories.filter(c => c.id !== 'all').map((category) => {
                        const style = getCategoryStyle(category.name)
                        return (
                          <button
                            key={category.id}
                            onClick={() => setEditPostForm({ ...editPostForm, category: category.name })}
                            className={`p-3 rounded-xl border-2 transition-all transform hover:scale-105 ${
                              editPostForm.category === category.name
                                ? `${category.bgColor} ${category.textColor} ${category.borderColor} border-4 shadow-lg`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-1">{category.emoji}</div>
                              <div className={`text-xs font-semibold ${editPostForm.category === category.name ? category.textColor : 'text-gray-900'}`}>
                                {category.name}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Post Title
                    </label>
                    <input
                      type="text"
                      value={editPostForm.title}
                      onChange={(e) => setEditPostForm({ ...editPostForm, title: e.target.value })}
                      placeholder="Enter post title..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Content Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Post Content
                    </label>
                    <textarea
                      value={editPostForm.content}
                      onChange={(e) => setEditPostForm({ ...editPostForm, content: e.target.value })}
                      placeholder="Write your post content..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                      rows={10}
                    />
                  </div>

                  {/* Post Info */}
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Editing post by: <span className="font-bold">{editingPost.author}</span>
                      </span>
                    </div>
                    <div className="text-xs text-blue-700 mt-2">
                      Original date: {new Date(editingPost.date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setEditingPost(null)
                        setEditPostForm({ title: '', content: '', category: 'General' })
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdatePost}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Update Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Post Modal */}
          {isNewPostModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plus className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-xl font-bold text-gray-900">Create New Post</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsNewPostModalOpen(false)
                      setNewPost({ title: '', content: '', category: 'General' })
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {activeCategories.filter(c => c.id !== 'all').map((category) => {
                        const style = getCategoryStyle(category.name)
                        return (
                          <button
                            key={category.id}
                            onClick={() => setNewPost({ ...newPost, category: category.name })}
                            className={`p-3 rounded-xl border-2 transition-all transform hover:scale-105 ${
                              newPost.category === category.name
                                ? `${category.bgColor} ${category.textColor} ${category.borderColor} border-4 shadow-lg`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-1">{category.emoji}</div>
                              <div className={`text-xs font-semibold ${newPost.category === category.name ? category.textColor : 'text-gray-900'}`}>
                                {category.name}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Post Title
                    </label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      placeholder="Enter post title..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Content Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Post Content
                    </label>
                    <textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      placeholder="Write your post content..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                      rows={10}
                    />
                  </div>

                  {/* Author Info */}
                  <div className="bg-cyan-50 rounded-xl p-4 border-2 border-cyan-200">
                    <div className="flex items-center gap-2 text-cyan-900">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Posting as: <span className="font-bold">Admin ({adminUser?.username})</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsNewPostModalOpen(false)
                        setNewPost({ title: '', content: '', category: 'General' })
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePost}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Create Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  )
}

