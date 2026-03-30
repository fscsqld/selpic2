'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { MessageSquare, ThumbsUp, MessageCircle, Calendar, User, Plus, Search, X, Edit, Trash2, Shield } from 'lucide-react'
import { useUserAuth } from '@/lib/userAuth'

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
    title: "Welcome to SELPIC Community! 🎉",
    author: "Community Manager",
    date: "2025-10-10",
    content: "Hey everyone! Welcome to our vibrant community space where creativity meets conversation! This is YOUR space to share ideas, connect with like-minded people, and express yourself freely. Whether you're a designer, entrepreneur, student, or just looking for interesting conversations - you belong here! Jump in, introduce yourself, and let's make this community amazing together! 💫",
    likes: 127,
    comments: 45,
    category: "General"
  },
  {
    id: 2,
    title: "Just finished my first digital art piece! 🎨✨",
    author: "ArtisticSoul",
    date: "2025-10-09",
    content: "After months of learning Procreate, I finally completed my first digital artwork! It's a fantasy landscape inspired by Studio Ghibli films. The journey was challenging but so rewarding. To anyone starting their creative journey - don't give up! Every stroke teaches you something new. Would love your feedback! What should I work on next? 🌸",
    likes: 234,
    comments: 67,
    category: "Design Showcase"
  },
  {
    id: 3,
    title: "Built a standing desk from IKEA parts for $50! 🛠️",
    author: "DIYEnthusiast",
    date: "2025-10-08",
    content: "Tired of expensive standing desks, so I made my own! Used IKEA table legs, a countertop, and some brackets. Total cost: $50 vs $500+ for commercial ones!\n\nMaterials:\n- 4x adjustable OLOV legs ($40)\n- LINNMON tabletop ($10)\n- Corner brackets from hardware store\n\nTook 2 hours to assemble. Been using it for a month - game changer for my back! Happy to share detailed instructions if anyone's interested! 💪",
    likes: 389,
    comments: 102,
    category: "DIY Projects"
  },
  {
    id: 4,
    title: "Life hack: 5-minute morning routine that changed my life ☀️",
    author: "ProductivityGuru",
    date: "2025-10-07",
    content: "Struggled with morning motivation for years. Then I discovered this simple routine:\n\n1. Make bed immediately (2 min)\n2. Drink full glass of water (30 sec)\n3. 2-minute stretch or yoga\n4. Write down 3 goals for today (30 sec)\n\nSeems small but it creates momentum! My productivity increased by 40% and I feel more focused. The key is starting TINY and being consistent. Anyone else have morning rituals that work? 🌅",
    likes: 456,
    comments: 143,
    category: "Tips & Tricks"
  },
  {
    id: 5,
    title: "Career advice: Should I quit my job to pursue my passion? 🤔",
    author: "DreamChaser",
    date: "2025-10-06",
    content: "I'm 28 and working in marketing, but my real passion is photography. I've been doing it on weekends and getting some paid gigs. My savings could cover 6 months of expenses. Part of me wants to take the leap, but I'm scared. Has anyone made this jump? How did you know it was the right time? Any advice would be incredibly helpful! 🙏",
    likes: 189,
    comments: 87,
    category: "Questions"
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
    category: "Off-Topic"
  },
  {
    id: 8,
    title: "Suggestion: Add profile customization and avatars? 👤✨",
    author: "UIDesigner",
    date: "2025-10-03",
    content: "Love this community! Quick feedback: Would be awesome if we could customize our profiles with avatars, cover photos, and a short bio. It would make the community feel more personal and help us recognize regular members. Also, maybe badges for active contributors? Just some ideas to make this space even better! What does everyone think? 🎨",
    likes: 298,
    comments: 115,
    category: "Feedback"
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
    category: 'General',
    author: ''
  })
  const [newComment, setNewComment] = useState('')
  const [categories, setCategories] = useState<CommunityCategory[]>([])

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

  // 기본 카테고리 정의 (Admin과 동일)
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

  // 카테고리 로드 (localStorage에서)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('community-categories')
      if (stored) {
        const parsed = JSON.parse(stored)
        setCategories(parsed)
      } else {
        setCategories(defaultCategories)
        localStorage.setItem('community-categories', JSON.stringify(defaultCategories))
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories(defaultCategories)
    }
  }, [])

  // localStorage 변경 감지 (Admin에서 변경 시 반영)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('community-categories')
        if (stored) {
          const parsed = JSON.parse(stored)
          setCategories(parsed)
        }
      } catch (error) {
        console.error('Error loading categories from storage:', error)
      }
    }

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    window.addEventListener('storage', handleStorageChange)
    
    // 같은 탭에서 변경 감지를 위한 polling (1초마다)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // 활성 카테고리만 필터링
  const activeCategories = categories.filter(c => c.isActive).sort((a, b) => a.order - b.order)
  
  // 카테고리 이름 배열 (하위 호환성)
  const categoryNames = activeCategories.map(c => c.name)
  const postCategories = activeCategories.filter(c => c.id !== 'all').map(c => c.name)

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

  // 샘플 게시물 리셋 함수
  const resetToSamplePosts = () => {
    if (confirm('This will reset all posts to sample posts. Are you sure?')) {
      console.log('=== Resetting to Sample Posts ===')
      setPosts(samplePosts)
      localStorage.setItem('community-posts', JSON.stringify(samplePosts))
      localStorage.setItem('community-posts-version', 'v2.0')
      alert('Sample posts have been restored!')
    }
  }

  // 관리자 확인 (이메일 기반)
  const isAdmin = user?.email === 'admin@selpic.com'

  // 카테고리별 색상 및 이모지 (localStorage에서 로드한 카테고리 사용)
  const getCategoryStyle = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    if (category) {
      // bgColor를 gradient로 변환 (예: bg-blue-100 -> from-blue-100 to-blue-200)
      const baseColor = category.bgColor.replace('bg-', '').replace('-100', '')
      return {
        bg: `from-${baseColor}-100 to-${baseColor}-200`,
        text: category.textColor,
        emoji: category.emoji
      }
    }
    // 기본값 (하위 호환성)
    const styles: Record<string, { bg: string; text: string; emoji: string }> = {
      'General': { bg: 'from-blue-100 to-cyan-100', text: 'text-blue-700', emoji: '💬' },
      'Design Showcase': { bg: 'from-purple-100 to-pink-100', text: 'text-purple-700', emoji: '🎨' },
      'DIY Projects': { bg: 'from-green-100 to-emerald-100', text: 'text-green-700', emoji: '🛠️' },
      'Tips & Tricks': { bg: 'from-yellow-100 to-orange-100', text: 'text-orange-700', emoji: '💡' },
      'Questions': { bg: 'from-red-100 to-pink-100', text: 'text-red-700', emoji: '❓' },
      'Events': { bg: 'from-indigo-100 to-purple-100', text: 'text-indigo-700', emoji: '📅' },
      'Off-Topic': { bg: 'from-gray-100 to-slate-100', text: 'text-gray-700', emoji: '🎭' },
      'Feedback': { bg: 'from-teal-100 to-cyan-100', text: 'text-teal-700', emoji: '💭' }
    }
    return styles[categoryName] || styles['General']
  }

  // localStorage에서 게시물 불러오기
  useEffect(() => {
    console.log('=== Loading Posts from Storage ===')
    try {
      const storedPosts = localStorage.getItem('community-posts')
      const SAMPLE_VERSION = 'v2.0' // 샘플 버전 관리
      const storedVersion = localStorage.getItem('community-posts-version')
      
      // 버전이 다르거나 없으면 새 샘플 게시물로 초기화
      if (storedVersion !== SAMPLE_VERSION) {
        console.log('Version mismatch or missing, resetting to new sample posts')
        setPosts(samplePosts)
        localStorage.setItem('community-posts', JSON.stringify(samplePosts))
        localStorage.setItem('community-posts-version', SAMPLE_VERSION)
      } else if (storedPosts) {
        const parsedPosts = JSON.parse(storedPosts)
        console.log('Loaded posts:', parsedPosts.length)
        
        // 게시물이 비어있거나 샘플 게시물보다 적으면 샘플 게시물로 초기화
        if (parsedPosts.length === 0 || parsedPosts.length < samplePosts.length) {
          console.log('Posts are empty or incomplete, resetting to sample posts')
          setPosts(samplePosts)
          localStorage.setItem('community-posts', JSON.stringify(samplePosts))
          localStorage.setItem('community-posts-version', SAMPLE_VERSION)
        } else {
          setPosts(parsedPosts)
        }
      } else {
        // 저장된 게시물이 없으면 샘플 게시물 사용
        console.log('No stored posts, using sample posts')
        setPosts(samplePosts)
        localStorage.setItem('community-posts', JSON.stringify(samplePosts))
        localStorage.setItem('community-posts-version', SAMPLE_VERSION)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setPosts(samplePosts)
      localStorage.setItem('community-posts', JSON.stringify(samplePosts))
      localStorage.setItem('community-posts-version', 'v2.0')
    }
  }, [])

  // 게시물이 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (posts.length > 0) {
      console.log('=== Saving Posts to Storage ===')
      console.log('Saving', posts.length, 'posts')
      try {
        localStorage.setItem('community-posts', JSON.stringify(posts))
        console.log('Posts saved successfully')
      } catch (error) {
        console.error('Error saving posts:', error)
      }
    }
  }, [posts])

  useEffect(() => {
    console.log('=== User State Changed ===')
    console.log('isLoggedIn:', isLoggedIn)
    console.log('user:', user)
    
    if (isLoggedIn && user && user.email) {
      setNewPost(prev => ({ ...prev, author: user.name || user.email }))
    }
  }, [isLoggedIn, user])

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    // 선택된 카테고리 확인
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    
    // 게시물의 카테고리가 활성화되어 있는지 확인
    const postCategory = categories.find(c => c.name === post.category)
    const isCategoryActive = postCategory ? postCategory.isActive : true // 카테고리를 찾을 수 없으면 기본적으로 활성으로 간주
    
    return matchesSearch && matchesCategory && isCategoryActive
  })

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

    setEditingPost(null)
    setNewPost({ 
      title: '', 
      content: '', 
      category: 'General', 
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
      category: post.category,
      author: post.author
    })
    setIsModalOpen(true)
  }

  const handleSubmitPost = () => {
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

    setNewPost({ title: '', content: '', category: 'General', author: user.name || user.email })
    setEditingPost(null)
    setIsModalOpen(false)
  }

  const handleDeletePost = (postId: number, postAuthor: string) => {
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

    if (confirm('Are you sure you want to delete this post?')) {
      const updatedPosts = posts.filter(p => p.id !== postId)
      console.log('Deleting post ID:', postId)
      console.log('Remaining posts:', updatedPosts.length)
      setPosts(updatedPosts)
      alert('Post deleted successfully!')
      setIsViewModalOpen(false)
    }
  }

  // 게시물 상세 보기
  const handleViewPost = (post: Post) => {
    setSelectedPost(post)
    setIsViewModalOpen(true)
  }

  // 댓글 추가
  const handleAddComment = () => {
    if (!isLoggedIn || !user) {
      alert('Please login to comment')
      router.push('/login')
      return
    }

    if (!selectedPost || !newComment.trim()) {
      alert('Please enter a comment')
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
    
    // Update selected post to reflect new comment
    setSelectedPost({
      ...selectedPost,
      postComments: [...(selectedPost.postComments || []), comment],
      comments: (selectedPost.postComments?.length || 0) + 1
    })
    
    setNewComment('')
    alert('Comment added successfully!')
  }

  // 댓글 삭제
  const handleDeleteComment = (commentId: number) => {
    if (!selectedPost) return
    
    if (!isLoggedIn || !user) {
      alert('Please login to delete comments')
      return
    }

    const comment = selectedPost.postComments?.find(c => c.id === commentId)
    if (comment && comment.author !== user.name && comment.author !== user.email && !isAdmin) {
      alert('You can only delete your own comments')
      return
    }
    
    if (confirm('Are you sure you want to delete this comment?')) {
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
      
      // Update selected post
      const updatedPost = updatedPosts.find(p => p.id === selectedPost.id)
      if (updatedPost) {
        setSelectedPost(updatedPost)
      }
      
      alert('Comment deleted successfully!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold font-playfair tracking-wider mb-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
            SELPIC N
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Your Space to Connect, Share, and Inspire
          </p>
          <p className="text-base text-gray-500 max-w-3xl mx-auto">
            Join our vibrant community where people share life experiences, creative projects, helpful tips, and meaningful conversations. From career advice to DIY projects, from pet stories to productivity hacks - this is your space to be yourself and connect with amazing people! 💫✨
          </p>
          
          {/* Community Guidelines Notice */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Community Guidelines & Legal Notice</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    This board is a free communication space for customers to share information and experiences. 
                    Please use it responsibly and respect others.
                  </p>
                </div>
              </div>

              {/* Legal Warnings */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <h4 className="font-bold text-red-900 mb-2 text-sm flex items-center gap-2">
                    <span>⚠️</span> Prohibited Content
                  </h4>
                  <ul className="text-xs text-red-800 space-y-1">
                    <li>• Defamation or false information</li>
                    <li>• Hate speech or discrimination</li>
                    <li>• Violence or threats</li>
                    <li>• Adult or sexual content</li>
                    <li>• Illegal activities or drug-related content</li>
                    <li>• Copyright infringement</li>
                    <li>• Personal information exposure</li>
                    <li>• Commercial spam or advertisements</li>
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2 text-sm flex items-center gap-2">
                    <span>⚖️</span> Legal Responsibilities
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Authors are responsible for their posts</li>
                    <li>• Defamation may result in civil/criminal liability</li>
                    <li>• Copyright violations are subject to legal action</li>
                    <li>• Platform is not liable for user content</li>
                    <li>• Violations may lead to account suspension</li>
                    <li>• Law enforcement may request user information</li>
                    <li>• Posts may be deleted without notice</li>
                    <li>• Repeated violations result in permanent ban</li>
                  </ul>
                </div>
              </div>

              {/* Additional Notice */}
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-900">
                  <strong>⚠️ Important:</strong> All posts are subject to monitoring. Content violating laws or 
                  community guidelines will be immediately removed. Serious violations will be reported to authorities. 
                  By posting, you agree to these terms and accept full responsibility for your content.
                </p>
              </div>

              {/* Contact for Issues */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600">
                  Report inappropriate content: <a href="mailto:admin@selpic.com" className="text-purple-600 font-semibold hover:underline">admin@selpic.com</a>
                </p>
              </div>
            </div>
          </div>
          
          {/* Search and New Post */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleOpenNewPost}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                New Post
              </button>
              {isAdmin && (
                <button 
                  onClick={resetToSamplePosts}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl text-sm"
                  title="Reset to sample posts (Admin only)"
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </div>

          {/* User Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {isLoggedIn && user ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                <User className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">Welcome, <span className="font-semibold">{user.name || user.email}</span></span>
                {isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 bg-white rounded-full shadow-md text-gray-600">
                Please <Link href="/login" className="text-purple-600 font-semibold hover:underline">login</Link> to post
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 justify-center">
            {activeCategories.map((category) => {
              const style = getCategoryStyle(category.name)
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === category.name
                      ? `bg-gradient-to-r ${style.bg} ${style.text} shadow-lg`
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>
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
                      <span className={`px-3 py-1 bg-gradient-to-r ${getCategoryStyle(post.category).bg} ${getCategoryStyle(post.category).text} rounded-full text-sm font-medium flex items-center gap-1.5`}>
                        <span>{getCategoryStyle(post.category).emoji}</span>
                        {post.category}
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
            <div className="text-center py-20">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500">No posts found</p>
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
                  <span className={`px-3 py-1 bg-gradient-to-r ${getCategoryStyle(selectedPost.category).bg} ${getCategoryStyle(selectedPost.category).text} rounded-full text-sm font-medium flex items-center gap-1.5`}>
                    <span>{getCategoryStyle(selectedPost.category).emoji}</span>
                    {selectedPost.category}
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

