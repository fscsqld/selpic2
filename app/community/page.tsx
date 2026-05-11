'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import {
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Calendar,
  User,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Shield,
  Sparkles,
  HeartHandshake,
  Scale,
  Mail,
  ChevronDown,
  PartyPopper,
} from 'lucide-react'
import { useUserAuth } from '@/lib/userAuth'
import {
  COMMUNITY_NAV_CHIPS,
  COMMUNITY_POST_CATEGORIES,
  CANONICAL_COMMUNITY_CATEGORY_ROWS,
  mapStoredCategoryToNav,
  navPillClasses,
  navBadgeForStoredCategory,
  editorCategoryValue,
} from '@/lib/community/navCategories'

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

// 법적으로 문제될 수 있는 키워드 필터
const bannedKeywords = [
  // 폭력적 내용
  'kill', 'murder', 'assault', 'violence', 'weapon', 'bomb', 'terror',
  // 성적 내용
  'porn', 'sex', 'nude', 'xxx', 'adult',
  // 약물 관련
  'drug', 'cocaine', 'heroin', 'marijuana',
  // 혐오 발언
  'hate', 'racist', 'discrimination',
  // 사기 관련
  'scam', 'fraud', 'phishing', 'hack',
  // 불법 도박
  'gambling', 'casino', 'betting',
  // 저작권 침해
  'piracy', 'cracked', 'torrent'
]

const checkForBannedContent = (text: string): boolean => {
  const lowerText = text.toLowerCase()
  return bannedKeywords.some(keyword => lowerText.includes(keyword))
}

const samplePosts: Post[] = [
  {
    id: 1,
    title: "Welcome to Selpic Community! 🎉",
    author: "Community Manager",
    date: "2025-10-10",
    content: "Hey everyone! Welcome to our vibrant community space where creativity meets conversation! This is YOUR space to share ideas, connect with like-minded people, and express yourself freely. Whether you're a designer, entrepreneur, student, or just looking for interesting conversations - you belong here! Jump in, introduce yourself, and let's make this community amazing together! 💫",
    likes: 127,
    comments: 45,
    category: "Daily"
  },
  {
    id: 2,
    title: "Just finished my first digital art piece! 🎨✨",
    author: "ArtisticSoul",
    date: "2025-10-09",
    content: "After months of learning Procreate, I finally completed my first digital artwork! It's a fantasy landscape inspired by Studio Ghibli films. The journey was challenging but so rewarding. To anyone starting their creative journey - don't give up! Every stroke teaches you something new. Would love your feedback! What should I work on next? 🌸",
    likes: 234,
    comments: 67,
    category: "Inspired"
  },
  {
    id: 3,
    title: "Built a standing desk from IKEA parts for $50! 🛠️",
    author: "DIYEnthusiast",
    date: "2025-10-08",
    content: "Tired of expensive standing desks, so I made my own! Used IKEA table legs, a countertop, and some brackets. Total cost: $50 vs $500+ for commercial ones!\n\nMaterials:\n- 4x adjustable OLOV legs ($40)\n- LINNMON tabletop ($10)\n- Corner brackets from hardware store\n\nTook 2 hours to assemble. Been using it for a month - game changer for my back! Happy to share detailed instructions if anyone's interested! 💪",
    likes: 389,
    comments: 102,
    category: "Inspired"
  },
  {
    id: 4,
    title: "Life hack: 5-minute morning routine that changed my life ☀️",
    author: "ProductivityGuru",
    date: "2025-10-07",
    content: "Struggled with morning motivation for years. Then I discovered this simple routine:\n\n1. Make bed immediately (2 min)\n2. Drink full glass of water (30 sec)\n3. 2-minute stretch or yoga\n4. Write down 3 goals for today (30 sec)\n\nSeems small but it creates momentum! My productivity increased by 40% and I feel more focused. The key is starting TINY and being consistent. Anyone else have morning rituals that work? 🌅",
    likes: 456,
    comments: 143,
    category: "Inspired"
  },
  {
    id: 5,
    title: "Career advice: Should I quit my job to pursue my passion? 🤔",
    author: "DreamChaser",
    date: "2025-10-06",
    content: "I'm 28 and working in marketing, but my real passion is photography. I've been doing it on weekends and getting some paid gigs. My savings could cover 6 months of expenses. Part of me wants to take the leap, but I'm scared. Has anyone made this jump? How did you know it was the right time? Any advice would be incredibly helpful! 🙏",
    likes: 189,
    comments: 87,
    category: "Help"
  },
  {
    id: 6,
    title: "Community Meetup: Coffee & Creative Talk - Oct 20th! ☕",
    author: "EventHost",
    date: "2025-10-05",
    content: "Let's meet IRL! 🎉\n\nWhen: Saturday, October 20th, 2-5 PM\nWhere: Riverside Cafe (downtown)\nWho: Anyone interested in design, creativity, or just good conversation!\n\nAgenda:\n• Casual networking\n• Lightning talks (5 min each - volunteer!)\n• Creative brainstorming sessions\n• Photo ops & fun!\n\nFREE coffee for first 20 people! Drop a comment if you're coming so we can reserve enough space. Can't wait to meet you all! 🌟",
    likes: 167,
    comments: 94,
    category: "Events"
  },
  {
    id: 7,
    title: "Just adopted a rescue dog and he's already my best friend! 🐕❤️",
    author: "DogLover92",
    date: "2025-10-04",
    content: "Meet Charlie! Found him at the local shelter two weeks ago. He was scared and didn't trust anyone. Now he follows me everywhere, sleeps on my bed, and greets me with the biggest smile when I come home. Rescue dogs are the BEST! They know you saved them and give endless love in return. If you're thinking about getting a pet, please consider adoption! Share your pet pics below - let's flood this thread with cuteness! 🐾✨",
    likes: 542,
    comments: 178,
    category: "Daily"
  },
  {
    id: 8,
    title: "Suggestion: Add profile customization and avatars? 👤✨",
    author: "UIDesigner",
    date: "2025-10-03",
    content: "Love this community! Quick feedback: Would be awesome if we could customize our profiles with avatars, cover photos, and a short bio. It would make the community feel more personal and help us recognize regular members. Also, maybe badges for active contributors? Just some ideas to make this space even better! What does everyone think? 🎨",
    likes: 298,
    comments: 115,
    category: "Help"
  }
]

export default function CommunityPage() {
  const router = useRouter()
  const { user, isLoggedIn, users } = useUserAuth()
  const [currentUser, setCurrentUser] = useState(user) // 현재 사용자 상태
  const [posts, setPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'Daily',
    author: ''
  })
  const [newComment, setNewComment] = useState('')
  const [categories, setCategories] = useState<CommunityCategory[]>([])
  /** When true, posts/categories round-trip Supabase instead of localStorage. */
  const [useRemoteCommunity, setUseRemoteCommunity] = useState(false)
  const [legalTermsOpen, setLegalTermsOpen] = useState(false)

  // 사용자 정보 실시간 업데이트 감지
  useEffect(() => {
    // 초기 사용자 설정
    setCurrentUser(user)
  }, [user])

  // user-updated 이벤트 리스너 추가
  useEffect(() => {
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      const { userId, userData } = customEvent.detail || {}
      
      // 현재 로그인된 사용자의 정보가 업데이트된 경우
      if (user && user.id === userId) {
        console.log('🔄 User permission updated, refreshing user data...', userData)
        
        // users 배열에서 최신 사용자 정보 가져오기
        const updatedUser = users.find(u => u.id === userId)
        if (updatedUser) {
          setCurrentUser(updatedUser)
          console.log('✅ User data refreshed:', updatedUser)
        } else {
          // users 배열에서 찾지 못하면 userData로 업데이트
          setCurrentUser({ ...user, ...userData })
        }
      }
    }

    // localStorage 변경 감지 (다른 탭에서 변경된 경우)
    const handleStorageChange = () => {
      if (user) {
        try {
          const stored = localStorage.getItem('user-auth-store')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed?.state?.users) {
              const updatedUser = parsed.state.users.find((u: any) => u.id === user.id)
              if (updatedUser) {
                console.log('🔄 Storage change detected, updating user data...')
                setCurrentUser(updatedUser)
              }
            }
          }
        } catch (error) {
          console.error('Error reading user data from storage:', error)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('user-updated', handleUserUpdate)
      window.addEventListener('storage', handleStorageChange)
      
      // 주기적으로 사용자 데이터 확인 (1초마다)
      const interval = setInterval(() => {
        if (user) {
          try {
            const stored = localStorage.getItem('user-auth-store')
            if (stored) {
              const parsed = JSON.parse(stored)
              if (parsed?.state?.users) {
                const latestUser = parsed.state.users.find((u: any) => u.id === user.id)
                if (latestUser && JSON.stringify(latestUser) !== JSON.stringify(currentUser)) {
                  console.log('🔄 Periodic check: User data changed, updating...')
                  setCurrentUser(latestUser)
                }
              }
            }
          } catch (error) {
            console.error('Error checking user data:', error)
          }
        }
      }, 1000)

      return () => {
        window.removeEventListener('user-updated', handleUserUpdate)
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [user, users, currentUser])

  const defaultCategories: CommunityCategory[] =
    CANONICAL_COMMUNITY_CATEGORY_ROWS as unknown as CommunityCategory[]

  // Load community: Supabase (public API) first, otherwise localStorage + sample posts
  useEffect(() => {
    let cancelled = false

    const loadLocalCategoriesAndPosts = () => {
      try {
        if (!cancelled) setCategories(defaultCategories)
        localStorage.setItem('community-categories', JSON.stringify(defaultCategories))
      } catch (error) {
        console.error('Error loading categories:', error)
        if (!cancelled) setCategories(defaultCategories)
      }

      try {
        const storedPosts = localStorage.getItem('community-posts')
        const SAMPLE_VERSION = 'v3.0'
        const storedVersion = localStorage.getItem('community-posts-version')

        if (storedVersion !== SAMPLE_VERSION) {
          if (!cancelled) setPosts(samplePosts)
          localStorage.setItem('community-posts', JSON.stringify(samplePosts))
          localStorage.setItem('community-posts-version', SAMPLE_VERSION)
        } else if (storedPosts) {
          const parsedPosts = JSON.parse(storedPosts)
          if (parsedPosts.length === 0) {
            if (!cancelled) setPosts(samplePosts)
            localStorage.setItem('community-posts', JSON.stringify(samplePosts))
            localStorage.setItem('community-posts-version', SAMPLE_VERSION)
          } else {
            if (!cancelled) setPosts(parsedPosts)
          }
        } else {
          if (!cancelled) setPosts(samplePosts)
          localStorage.setItem('community-posts', JSON.stringify(samplePosts))
          localStorage.setItem('community-posts-version', SAMPLE_VERSION)
        }
      } catch (error) {
        console.error('Error loading posts:', error)
        if (!cancelled) setPosts(samplePosts)
        localStorage.setItem('community-posts', JSON.stringify(samplePosts))
        localStorage.setItem('community-posts-version', 'v3.0')
      }
    }

    ;(async () => {
      try {
        const res = await fetch('/api/community/public', { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.ok && Array.isArray(data.posts) && Array.isArray(data.categories)) {
          setUseRemoteCommunity(true)
          setPosts(data.posts)
          setCategories(defaultCategories)
          return
        }
      } catch {
        /* fall back */
      }
      if (cancelled) return
      loadLocalCategoriesAndPosts()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // localStorage 변경 감지 (local-only mode: Admin 다른 탭에서 카테고리 변경)
  useEffect(() => {
    if (useRemoteCommunity) return

    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('community-categories')
        if (!stored) return
        const parsed = JSON.parse(stored) as CommunityCategory[]
        const incoming = new Set((parsed ?? []).map((c) => c.id))
        const wanted = new Set(CANONICAL_COMMUNITY_CATEGORY_ROWS.map((r) => r.id))
        const aligned =
          incoming.size === wanted.size && [...wanted].every((id) => incoming.has(id))
        setCategories(aligned ? parsed : (CANONICAL_COMMUNITY_CATEGORY_ROWS as unknown as CommunityCategory[]))
      } catch (error) {
        console.error('Error loading categories from storage:', error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [useRemoteCommunity])

  const postCategories = [...COMMUNITY_POST_CATEGORIES]

  useEffect(() => {
    if (selectedCategory === 'All') return
    if (!COMMUNITY_NAV_CHIPS.some((c) => c.name === selectedCategory)) setSelectedCategory('All')
  }, [selectedCategory])

  // 샘플 게시물 리셋 함수 (local-only; server-backed board uses admin tools)
  const resetToSamplePosts = () => {
    if (useRemoteCommunity) return
    if (confirm('This will reset all posts to sample posts. Are you sure?')) {
      console.log('=== Resetting to Sample Posts ===')
      setPosts(samplePosts)
      localStorage.setItem('community-posts', JSON.stringify(samplePosts))
      localStorage.setItem('community-posts-version', 'v3.0')
      alert('Sample posts have been restored!')
    }
  }

  // 관리자 확인 (이메일 기반)
  const isAdmin = user?.email === 'info@selpic.com.au'

  const navChipClasses = (stored: string) => {
    const { label } = navBadgeForStoredCategory(stored)
    return navPillClasses(label === 'All' ? 'Daily' : label)
  }

  const navChipMeta = (stored: string) => navBadgeForStoredCategory(stored)

  // 게시물이 변경될 때마다 localStorage에 저장 (local-only)
  useEffect(() => {
    if (useRemoteCommunity || posts.length === 0) return
    try {
      localStorage.setItem('community-posts', JSON.stringify(posts))
    } catch (error) {
      console.error('Error saving posts:', error)
    }
  }, [posts, useRemoteCommunity])

  useEffect(() => {
    console.log('=== User State Changed ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)
    
    if (isLoggedIn && user && user.email) {
      setNewPost(prev => ({ ...prev, author: user.name || user.email }))
    }
  }, [isLoggedIn, user])

  const filteredPosts = posts.filter((post) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q)
    const nav = mapStoredCategoryToNav(post.category)
    const matchesCategory = selectedCategory === 'All' || nav === selectedCategory
    const notHidden = !post.hidden
    return matchesSearch && matchesCategory && notHidden
  })

  const searchActive = Boolean(searchQuery.trim())
  const globalEmptyBoard = filteredPosts.length === 0 && posts.length === 0
  const searchEmptyBoard = filteredPosts.length === 0 && posts.length > 0 && searchActive
  const categoryEmptyBoard =
    filteredPosts.length === 0 && posts.length > 0 && !searchActive && selectedCategory !== 'All'

  // 사용자 글쓰기 권한 확인 함수 (currentUser 사용)
  const checkPostingPermission = (): { allowed: boolean; reason?: string } => {
    // currentUser를 우선 사용, 없으면 user 사용
    const userToCheck = currentUser || user
    
    if (!userToCheck) {
      return { allowed: false, reason: 'Please login to create a post' }
    }

    // 차단 여부 확인
    if (userToCheck.isBanned) {
      // 차단 만료 시간 확인
      if (userToCheck.banExpiresAt) {
        const banExpires = new Date(userToCheck.banExpiresAt)
        const now = new Date()
        
        if (now > banExpires) {
          // 차단 만료됨 - 자동으로 차단 해제
          return { allowed: true }
        } else {
          // 아직 차단 중
          const daysLeft = Math.ceil((banExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return { 
            allowed: false, 
            reason: userToCheck.banReason || `You are banned from posting. Ban expires in ${daysLeft} day(s).` 
          }
        }
      } else {
        // 영구 차단
        return { 
          allowed: false, 
          reason: userToCheck.banReason || 'You are permanently banned from posting.' 
        }
      }
    }

    // 글쓰기 권한 확인
    if (userToCheck.canPost === false) {
      return { 
        allowed: false, 
        reason: 'Your posting permission has been disabled by administrator.' 
      }
    }

    // 기본적으로 권한 있음
    return { allowed: true }
  }

  const handleOpenNewPost = () => {
    console.log('=== handleOpenNewPost ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)
    console.log('currentUser:', currentUser)
    
    // currentUser를 우선 사용
    const userToUse = currentUser || user
    
    if (!isLoggedIn || !userToUse || !userToUse.email) {
      alert('Please login to create a post')
      router.push('/login')
      return
    }

    // 글쓰기 권한 확인 (최신 사용자 정보 사용)
    const permission = checkPostingPermission()
    console.log('Permission check result:', permission)
    
    if (!permission.allowed) {
      alert(permission.reason || 'You do not have permission to create a post.')
      return
    }

    const topicDefault =
      selectedCategory !== 'All' &&
      (COMMUNITY_POST_CATEGORIES as readonly string[]).includes(selectedCategory)
        ? selectedCategory
        : 'Daily'

    setEditingPost(null)
    setNewPost({ 
      title: '', 
      content: '', 
      category: topicDefault, 
      author: userToUse.name || userToUse.email 
    })
    setIsModalOpen(true)
  }

  const handleOpenEditPost = (post: Post) => {
    console.log('=== handleOpenEditPost ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)
    
    if (!isLoggedIn || !user) {
      alert('Please login to edit posts')
      router.push('/login')
      return
    }
    if (post.author !== user.name && post.author !== user.email && !isAdmin) {
      alert('You can only edit your own posts')
      return
    }
    setEditingPost(post)
    setNewPost({
      title: post.title,
      content: post.content,
      category: editorCategoryValue(post.category),
      author: post.author
    })
    setIsModalOpen(true)
  }

  const handleSubmitPost = async () => {
    console.log('=== handleSubmitPost ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)
    console.log('newPost:', newPost)
    
    if (!isLoggedIn || !user || !user.email) {
      alert('Please login to post')
      router.push('/login')
      return
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    // 불법 컨텐츠 검사
    if (checkForBannedContent(newPost.title) || checkForBannedContent(newPost.content)) {
      alert('Your post contains prohibited content. Please review and modify your content.')
      return
    }

    if (useRemoteCommunity) {
      try {
        if (editingPost) {
          const res = await fetch(`/api/community/posts/${editingPost.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newPost.title.trim(),
              content: newPost.content.trim(),
              category: newPost.category,
              actorUserId: user.id,
              actorEmail: user.email,
              actorName: user.name,
            }),
          })
          const data = await res.json()
          if (!res.ok || !data.ok) {
            if (data.error === 'FORBIDDEN') alert('You can only edit your own posts.')
            else if (data.error === 'MODERATION_REJECT') alert('Your post contains prohibited content.')
            else alert('Failed to update post. Please try again.')
            return
          }
          setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? data.post : p)))
          alert('Post updated successfully!')
        } else {
          const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newPost.title.trim(),
              content: newPost.content.trim(),
              category: newPost.category,
              author: newPost.author || user.name || user.email,
              authorUserId: user.id,
            }),
          })
          const data = await res.json()
          if (!res.ok || !data.ok) {
            if (data.error === 'MODERATION_REJECT') alert('Your post contains prohibited content.')
            else if (data.error === 'RATE_LIMIT') alert('Too many posts. Please try again later.')
            else alert('Failed to create post. Please try again.')
            return
          }
          setPosts((prev) => [data.post as Post, ...prev])
          alert('Post created successfully!')
        }
      } catch {
        alert('Network error. Please try again.')
        return
      }

      setNewPost({ title: '', content: '', category: 'Daily', author: user.name || user.email })
      setEditingPost(null)
      setIsModalOpen(false)
      return
    }

    if (editingPost) {
      // 수정
      console.log('Updating post:', editingPost.id)
      const updatedPosts = posts.map(p => 
        p.id === editingPost.id 
          ? { ...p, title: newPost.title, content: newPost.content, category: newPost.category }
          : p
      )
      setPosts(updatedPosts)
      console.log('Post updated, total posts:', updatedPosts.length)
      alert('Post updated successfully!')
    } else {
      // 새 게시글 - 고유 ID 생성
      const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1
      const post: Post = {
        id: newId,
        title: newPost.title,
        author: newPost.author || user.name || user.email,
        date: new Date().toISOString().split('T')[0],
        content: newPost.content,
        likes: 0,
        comments: 0,
        category: newPost.category
      }
      const updatedPosts = [post, ...posts]
      console.log('Creating new post with ID:', newId)
      console.log('New post:', post)
      console.log('Total posts after creation:', updatedPosts.length)
      setPosts(updatedPosts)
      alert('Post created successfully!')
    }

    setNewPost({ title: '', content: '', category: 'Daily', author: user.name || user.email })
    setEditingPost(null)
    setIsModalOpen(false)
  }

  const handleDeletePost = async (postId: number, postAuthor: string) => {
    console.log('=== handleDeletePost ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)

    if (!isLoggedIn || !user) {
      alert('Please login to delete posts')
      router.push('/login')
      return
    }

    if (postAuthor !== user.name && postAuthor !== user.email && !isAdmin) {
      alert('You can only delete your own posts')
      return
    }

    if (!confirm('Are you sure you want to delete this post?')) return

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/community/posts/${postId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorUserId: user.id,
            actorEmail: user.email,
            actorName: user.name,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          if (data.error === 'FORBIDDEN') alert('You can only delete your own posts.')
          else alert('Failed to delete post.')
          return
        }
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        alert('Post deleted successfully!')
        setIsViewModalOpen(false)
      } catch {
        alert('Network error. Please try again.')
      }
      return
    }

    const updatedPosts = posts.filter(p => p.id !== postId)
    console.log('Deleting post ID:', postId)
    console.log('Remaining posts:', updatedPosts.length)
    setPosts(updatedPosts)
    alert('Post deleted successfully!')
    setIsViewModalOpen(false)
  }

  // 게시물 상세 보기
  const handleViewPost = (post: Post) => {
    setSelectedPost(post)
    setIsViewModalOpen(true)
  }

  // 댓글 추가
  const handleAddComment = async () => {
    if (!isLoggedIn || !user) {
      alert('Please login to comment')
      router.push('/login')
      return
    }

    if (!selectedPost || !newComment.trim()) {
      alert('Please enter a comment')
      return
    }

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/community/posts/${selectedPost.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newComment.trim(),
            author: user.name || user.email,
            authorUserId: user.id,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          if (data.error === 'MODERATION_REJECT') alert('Comment contains prohibited content.')
          else if (data.error === 'RATE_LIMIT') alert('Too many comments. Please try again later.')
          else alert('Failed to add comment.')
          return
        }
        const updated = data.post as Post
        setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? updated : p)))
        setSelectedPost(updated)
        setNewComment('')
        alert('Comment added successfully!')
      } catch {
        alert('Network error. Please try again.')
      }
      return
    }

    const comment: Comment = {
      id: Date.now(),
      postId: selectedPost.id,
      author: user.name || user.email,
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
    
    if (!isLoggedIn || !user) {
      alert('Please login to delete comments')
      router.push('/login')
      return
    }

    const comment = selectedPost.postComments?.find(c => c.id === commentId)
    if (comment && comment.author !== user.name && comment.author !== user.email && !isAdmin) {
      alert('You can only delete your own comments')
      return
    }
    
    if (!confirm('Are you sure you want to delete this comment?')) return

    if (useRemoteCommunity) {
      try {
        const res = await fetch(`/api/community/posts/${selectedPost.id}/comments/${commentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorUserId: user.id,
            actorEmail: user.email,
            actorName: user.name,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          if (data.error === 'FORBIDDEN') alert('You can only delete your own comments.')
          else alert('Failed to delete comment.')
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
        alert('Network error. Please try again.')
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 pb-12 px-4 bg-gradient-to-b from-purple-50 via-white to-blue-50/80">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/80 shadow-sm border border-purple-100/80 mb-6">
            <MessageSquare className="w-8 h-8 text-[#7000FF]" aria-hidden />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900 mb-3">
            Selpic N
          </h1>
          <p className="text-5xl font-black tracking-tight text-gray-900 max-w-4xl mx-auto leading-[1.1] mb-5">
            Connect.{' '}
            <span className="text-[#7000FF]">Share.</span>{' '}
            Inspire.
          </p>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A welcoming space for stories, projects, tips, and conversation. Be yourself and meet people who love making
            things as much as you do.
          </p>
          
          {/* Community guidelines — compact icon cards */}
          <div className="max-w-4xl mx-auto mt-10 mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
              <div className="rounded-2xl bg-white/90 border border-purple-100/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                  <HeartHandshake className="w-5 h-5 text-rose-500" aria-hidden />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Be kind</h3>
                <p className="text-xs text-gray-600 leading-snug">
                  Respect others. No harassment, hate, or personal attacks.
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-purple-100/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-amber-600" aria-hidden />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Keep it safe</h3>
                <p className="text-xs text-gray-600 leading-snug">
                  No violence, illegal activity, scams, spam, or adult content.
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-purple-100/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-[#7000FF]" aria-hidden />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Own your words</h3>
                <p className="text-xs text-gray-600 leading-snug">
                  You are responsible for what you post. Respect copyright and privacy.
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-purple-100/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-sky-600" aria-hidden />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Need help?</h3>
                <p className="text-xs text-gray-600 leading-snug">
                  Report issues to{' '}
                  <a href="mailto:info@selpic.com.au" className="text-[#7000FF] font-medium hover:underline">
                    info@selpic.com.au
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setLegalTermsOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#7000FF] bg-white border border-[#7000FF]/25 hover:bg-[#7000FF]/5 transition-colors"
              >
                <Scale className="w-4 h-4" aria-hidden />
                Terms &amp; legal notice
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${legalTermsOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {legalTermsOpen && (
                <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white/95 p-4 text-left text-xs text-gray-600 space-y-3 shadow-sm">
                  <p>
                    This board is a space for customers to share information and experiences. Content may be moderated;
                    posts that break the law or these guidelines may be removed. Serious cases may be reported to
                    authorities.
                  </p>
                  <p className="text-gray-500">
                    By posting, you agree you are responsible for your content. The platform is not liable for user
                    posts. Violations may lead to suspension or a permanent ban.
                  </p>
                  <p>
                    <Link href="/terms" className="text-[#7000FF] font-semibold hover:underline">
                      View full Terms &amp; Conditions
                    </Link>
                  </p>
                </div>
              )}
              <p className="text-[11px] sm:text-xs text-gray-400 max-w-xl">
                Legal notice: use of this community is subject to our site terms and applicable law. Monitoring may
                apply to keep the space safe.
              </p>
            </div>
          </div>
          
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <div className="relative w-full max-w-md sm:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#7000FF] focus:outline-none transition-all focus:ring-2 focus:ring-[#7000FF]/20"
              />
            </div>
            {isAdmin && !useRemoteCommunity && (
              <button
                type="button"
                onClick={resetToSamplePosts}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl text-sm"
                title="Reset to sample posts (local board only)"
              >
                🔄 Reset
              </button>
            )}
          </div>

          {/* User welcome (logged in only — posting uses FAB +) */}
          {isLoggedIn && user && (
            <div className="flex items-center justify-center gap-2 text-sm mb-5">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-sm border border-gray-100">
                <User className="w-4 h-4 text-purple-600" aria-hidden />
                <span className="text-gray-700">
                  Welcome, <span className="font-semibold">{user.name || user.email}</span>
                </span>
                {isAdmin && (
                  <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full inline-flex items-center gap-1">
                    <Shield className="w-3 h-3" aria-hidden />
                    Admin
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Category chips: horizontal scroll + compose FAB */}
          <div className="w-full max-w-5xl mx-auto pt-1">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory scroll-smooth gap-2 overflow-x-auto overflow-y-hidden py-2 pl-1 pr-1"
                role="tablist"
                aria-label="Post categories"
              >
                {COMMUNITY_NAV_CHIPS.map((category) => {
                  const selected = selectedCategory === category.name
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSelectedCategory(category.name)}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      className={[
                        'snap-start shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold',
                        'flex items-center space-x-2',
                        'transition-all duration-200 ease-out motion-reduce:transition-none',
                        'touch-manipulation select-none',
                        selected
                          ? 'scale-105 bg-[#7000FF] text-white shadow-lg shadow-[#7000FF]/35'
                          : 'scale-100 border border-transparent bg-white/40 text-gray-600 backdrop-blur-sm hover:border-gray-200/80 hover:bg-white/70 hover:scale-105 hover:shadow-md active:scale-[1.02]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7000FF]/40 focus-visible:ring-offset-2',
                      ].join(' ')}
                    >
                      <span aria-hidden>{category.emoji}</span>
                      <span>{category.name}</span>
                    </button>
                  )
                })}
              </div>
              {/* Floating-style compose (+): next to chip strip on desktop; stacks on narrow screens */}
              <button
                type="button"
                onClick={handleOpenNewPost}
                className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-[#7000FF] text-white shadow-lg shadow-[#7000FF]/35 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7000FF] focus-visible:ring-offset-2"
                aria-label={isLoggedIn ? 'Create new post' : 'Log in to create a post'}
                title={isLoggedIn ? 'New post' : 'Log in to post'}
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>

          {!isLoggedIn && (
            <p className="text-center text-xs text-gray-500 mt-2">
              Tap <span className="font-semibold text-[#7000FF]">+</span> to log in and write a post.
            </p>
          )}
        </div>
      </section>

      {/* Posts Section */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => handleViewPost(post)}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-purple-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 bg-gradient-to-r ${navChipClasses(post.category).bg} ${navChipClasses(post.category).text} rounded-full text-sm font-medium inline-flex items-center gap-2`}
                      >
                        <span aria-hidden>{navChipMeta(post.category).emoji}</span>
                        {navChipMeta(post.category).label}
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 hover:text-purple-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-gray-500">
                          <User className="w-4 h-4" />
                          <span className="text-sm font-medium">{post.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm font-medium">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">{post.comments}</span>
                        </div>
                      </div>
                      
                      {/* Edit/Delete buttons - only for author or admin */}
                      {isLoggedIn && user && (user.name === post.author || user.email === post.author || isAdmin) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEditPost(post)
                            }}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                            title="Edit post"
                          >
                            <Edit className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePost(post.id, post.author)
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="max-w-md mx-auto rounded-3xl bg-gradient-to-br from-violet-50 via-white to-sky-50 border border-purple-100/80 p-10 shadow-inner">
                {searchEmptyBoard && (
                  <>
                    <MessageSquare className="w-14 h-14 text-gray-300 mx-auto mb-4" aria-hidden />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No matching posts</h3>
                    <p className="text-sm text-gray-600 mb-6">Try a different search term or pick another topic.</p>
                  </>
                )}
                {categoryEmptyBoard && (
                  <>
                    <div className="flex justify-center gap-3 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center border border-purple-50">
                        <Sparkles className="w-7 h-7 text-[#7000FF]" aria-hidden />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                      No stories in {selectedCategory} yet
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
                      Nothing here yet — want to be the first to share your story?
                      <span aria-hidden> ✨</span>
                    </p>
                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => handleOpenNewPost()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7000FF] text-white text-sm font-semibold hover:bg-[#5c00d4] transition-colors shadow-md"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                        Start a post in {selectedCategory}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7000FF] text-white text-sm font-semibold hover:bg-[#5c00d4] transition-colors shadow-md"
                      >
                        Log in to post in {selectedCategory}
                      </Link>
                    )}
                  </>
                )}
                {globalEmptyBoard && (
                  <>
                    <div className="flex justify-center gap-3 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center border border-purple-50">
                        <PartyPopper className="w-7 h-7 text-amber-500" aria-hidden />
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center border border-purple-50 -mt-2">
                        <Sparkles className="w-7 h-7 text-[#7000FF]" aria-hidden />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                      No threads yet — you could be first!
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
                      Welcome to Selpic N — drop a hello, share a project, or ask for advice and start the timeline.
                    </p>
                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => handleOpenNewPost()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7000FF] text-white text-sm font-semibold hover:bg-[#5c00d4] transition-colors shadow-md"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                        Write the first post
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7000FF] text-white text-sm font-semibold hover:bg-[#5c00d4] transition-colors shadow-md"
                      >
                        Log in to start the first post
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Back to Home */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Link href="/">
            <button className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl">
              Back to Home
            </button>
          </Link>
        </div>
      </section>

      {/* New Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingPost(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            {/* Content Policy Warning */}
            <div className="mx-6 mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">Content Policy</h3>
                  <p className="text-sm text-yellow-800">
                    Posts containing violence, hate speech, illegal activities, adult content, or other prohibited content will be automatically rejected.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Author Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={newPost.author}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                >
                  {postCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Enter post title"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Write your post content here..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingPost(null)
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPost}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                >
                  {editingPost ? 'Update' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Post Modal with Comments */}
      {isViewModalOpen && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Post Details</h3>
              </div>
              <button
                onClick={() => {
                  setIsViewModalOpen(false)
                  setNewComment('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Post Header */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1 bg-gradient-to-r ${navChipClasses(selectedPost.category).bg} ${navChipClasses(selectedPost.category).text} rounded-full text-sm font-medium inline-flex items-center gap-2`}
                  >
                    <span aria-hidden>{navChipMeta(selectedPost.category).emoji}</span>
                    {navChipMeta(selectedPost.category).label}
                  </span>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    {selectedPost.date}
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedPost.title}</h2>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedPost.author}</span>
                </div>
              </div>

              {/* Post Content */}
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              {/* Post Stats */}
              <div className="flex items-center gap-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="font-medium">{selectedPost.likes} likes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{selectedPost.postComments?.length || 0} comments</span>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                  Comments ({selectedPost.postComments?.length || 0})
                </h3>

                {/* Add Comment */}
                {isLoggedIn && user ? (
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="flex items-start gap-3">
                      <User className="w-6 h-6 text-purple-600 mt-2" />
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddComment()
                            }}
                            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Add Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 bg-gray-50 rounded-xl p-4 border-2 border-gray-200 text-center">
                    <p className="text-gray-600">
                      Please <Link href="/login" className="text-purple-600 font-semibold hover:underline">login</Link> to add comments
                    </p>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedPost.postComments && selectedPost.postComments.length > 0 ? (
                    selectedPost.postComments.map((comment) => (
                      <div key={comment.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-colors shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-400" />
                            <span className="font-semibold text-gray-900">{comment.author}</span>
                            <span className="text-sm text-gray-500">{comment.date}</span>
                          </div>
                          {isLoggedIn && user && (comment.author === user.name || comment.author === user.email || isAdmin) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteComment(comment.id)
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No comments yet</p>
                      <p className="text-sm text-gray-400 mt-2">Be the first to comment on this post!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {isLoggedIn && user && (user.name === selectedPost.author || user.email === selectedPost.author || isAdmin) && (
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenEditPost(selectedPost)
                      setIsViewModalOpen(false)
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePost(selectedPost.id, selectedPost.author)
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

