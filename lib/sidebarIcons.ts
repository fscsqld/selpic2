// 사이드바 메뉴 아이콘 설정을 위한 타입 및 상수 정의

export interface SidebarMenuItem {
  id: string
  label: string
  href: string
  icon: string // Lucide React 아이콘 이름
  color?: string
  isActive?: boolean
}

// 사용 가능한 아이콘 목록 (12개만 선택)
export const AVAILABLE_ICONS = [
  // 기본 아이콘 (6개)
  'Home',
  'BarChart3',
  'Users',
  'Package',
  'ShoppingCart',
  'Settings',
  // 이모지 아이콘 (6개)
  '🏷️', // 스티커
  '📮', // 스템프  
  '📱', // 핸드폰케이스
  '🔥', // Market S
  '📦', // 기타
  '⭐'  // 별
] as const

// 기본 사이드바 메뉴 설정
export const DEFAULT_SIDEBAR_MENU: SidebarMenuItem[] = [
  {
    id: 'home',
    label: '홈',
    href: '/',
    icon: 'Home',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'dashboard',
    label: '대시보드',
    href: '/admin/dashboard',
    icon: 'BarChart3',
    color: 'text-blue-600',
    isActive: true
  },
  {
    id: 'orders',
    label: '주문 관리',
    href: '/admin/orders',
    icon: 'ShoppingCart',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'users',
    label: '사용자 관리',
    href: '/admin/users',
    icon: 'Users',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'products',
    label: '상품 관리',
    href: '/admin/products',
    icon: 'Package',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'content',
    label: '콘텐츠 관리',
    href: '/admin/content',
    icon: '📝',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'images',
    label: '이미지 관리',
    href: '/admin/images',
    icon: '🖼️',
    color: 'text-gray-700',
    isActive: false
  },
  {
    id: 'settings',
    label: '설정',
    href: '/admin/settings',
    icon: 'Settings',
    color: 'text-gray-700',
    isActive: false
  }
]

// 아이콘 이름을 실제 컴포넌트로 매핑하는 함수
export const getIconComponent = (iconName: string) => {
  // 이모지인지 확인
  const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName)
  
  if (isEmoji) {
    // 이모지는 컴포넌트가 필요 없음
    return () => Promise.resolve(null)
  }
  
  // 동적 import를 사용하여 아이콘 컴포넌트를 가져옴
  const iconMap: Record<string, any> = {}
  
  // 필요한 아이콘들을 import
  const iconImports = {
    Home: () => import('lucide-react').then(mod => mod.Home),
    BarChart3: () => import('lucide-react').then(mod => mod.BarChart3),
    Users: () => import('lucide-react').then(mod => mod.Users),
    Package: () => import('lucide-react').then(mod => mod.Package),
    ShoppingCart: () => import('lucide-react').then(mod => mod.ShoppingCart),
    Settings: () => import('lucide-react').then(mod => mod.Settings),
    FileText: () => import('lucide-react').then(mod => mod.FileText),
    Image: () => import('lucide-react').then(mod => mod.Image),
    Globe: () => import('lucide-react').then(mod => mod.Globe),
    LogOut: () => import('lucide-react').then(mod => mod.LogOut),
    Menu: () => import('lucide-react').then(mod => mod.Menu),
    X: () => import('lucide-react').then(mod => mod.X),
    TrendingUp: () => import('lucide-react').then(mod => mod.TrendingUp),
    Eye: () => import('lucide-react').then(mod => mod.Eye),
    Star: () => import('lucide-react').then(mod => mod.Star),
    AlertCircle: () => import('lucide-react').then(mod => mod.AlertCircle),
    Lock: () => import('lucide-react').then(mod => mod.Lock),
    DollarSign: () => import('lucide-react').then(mod => mod.DollarSign),
    Plus: () => import('lucide-react').then(mod => mod.Plus),
    Edit: () => import('lucide-react').then(mod => mod.Edit),
    Trash2: () => import('lucide-react').then(mod => mod.Trash2),
    Search: () => import('lucide-react').then(mod => mod.Search),
    Filter: () => import('lucide-react').then(mod => mod.Filter),
    CheckCircle: () => import('lucide-react').then(mod => mod.CheckCircle),
    ArrowRight: () => import('lucide-react').then(mod => mod.ArrowRight),
    RefreshCw: () => import('lucide-react').then(mod => mod.RefreshCw),
    Palette: () => import('lucide-react').then(mod => mod.Palette),
    Gift: () => import('lucide-react').then(mod => mod.Gift),
    Smartphone: () => import('lucide-react').then(mod => mod.Smartphone),
    Flame: () => import('lucide-react').then(mod => mod.Flame),
    Grid3X3: () => import('lucide-react').then(mod => mod.Grid3X3),
    ShoppingBag: () => import('lucide-react').then(mod => mod.ShoppingBag),
    Heart: () => import('lucide-react').then(mod => mod.Heart),
    Zap: () => import('lucide-react').then(mod => mod.Zap),
    Award: () => import('lucide-react').then(mod => mod.Award),
    Shield: () => import('lucide-react').then(mod => mod.Shield),
    Truck: () => import('lucide-react').then(mod => mod.Truck),
    Scissors: () => import('lucide-react').then(mod => mod.Scissors),
    Play: () => import('lucide-react').then(mod => mod.Play),
    Info: () => import('lucide-react').then(mod => mod.Info),
    Mail: () => import('lucide-react').then(mod => mod.Mail),
    Phone: () => import('lucide-react').then(mod => mod.Phone),
    MapPin: () => import('lucide-react').then(mod => mod.MapPin),
    Calendar: () => import('lucide-react').then(mod => mod.Calendar),
    Clock: () => import('lucide-react').then(mod => mod.Clock),
    Tag: () => import('lucide-react').then(mod => mod.Tag),
    Bookmark: () => import('lucide-react').then(mod => mod.Bookmark),
    Download: () => import('lucide-react').then(mod => mod.Download),
    Upload: () => import('lucide-react').then(mod => mod.Upload),
    Share: () => import('lucide-react').then(mod => mod.Share),
    Copy: () => import('lucide-react').then(mod => mod.Copy),
    Save: () => import('lucide-react').then(mod => mod.Save),
    Archive: () => import('lucide-react').then(mod => mod.Archive),
    Trash: () => import('lucide-react').then(mod => mod.Trash),
    Edit3: () => import('lucide-react').then(mod => mod.Edit3),
    MoreHorizontal: () => import('lucide-react').then(mod => mod.MoreHorizontal),
    MoreVertical: () => import('lucide-react').then(mod => mod.MoreVertical),
    ChevronDown: () => import('lucide-react').then(mod => mod.ChevronDown),
    ChevronUp: () => import('lucide-react').then(mod => mod.ChevronUp),
    ChevronLeft: () => import('lucide-react').then(mod => mod.ChevronLeft),
    ChevronRight: () => import('lucide-react').then(mod => mod.ChevronRight),
    ArrowLeft: () => import('lucide-react').then(mod => mod.ArrowLeft),
    ArrowUp: () => import('lucide-react').then(mod => mod.ArrowUp),
    ArrowDown: () => import('lucide-react').then(mod => mod.ArrowDown),
    ExternalLink: () => import('lucide-react').then(mod => mod.ExternalLink),
    Link: () => import('lucide-react').then(mod => mod.Link),
    Unlink: () => import('lucide-react').then(mod => mod.Unlink),
    Maximize: () => import('lucide-react').then(mod => mod.Maximize),
    Minimize: () => import('lucide-react').then(mod => mod.Minimize),
    Minus: () => import('lucide-react').then(mod => mod.Minus),
    PlusCircle: () => import('lucide-react').then(mod => mod.PlusCircle),
    MinusCircle: () => import('lucide-react').then(mod => mod.MinusCircle),
    XCircle: () => import('lucide-react').then(mod => mod.XCircle),
    CheckCircle2: () => import('lucide-react').then(mod => mod.CheckCircle2),
    AlertTriangle: () => import('lucide-react').then(mod => mod.AlertTriangle),
    HelpCircle: () => import('lucide-react').then(mod => mod.HelpCircle),
    Lightbulb: () => import('lucide-react').then(mod => mod.Lightbulb),
    Sun: () => import('lucide-react').then(mod => mod.Sun),
    Moon: () => import('lucide-react').then(mod => mod.Moon),
    Cloud: () => import('lucide-react').then(mod => mod.Cloud),
    CloudRain: () => import('lucide-react').then(mod => mod.CloudRain),
    CloudSnow: () => import('lucide-react').then(mod => mod.CloudSnow),
    Wind: () => import('lucide-react').then(mod => mod.Wind),
    Droplets: () => import('lucide-react').then(mod => mod.Droplets),
    Thermometer: () => import('lucide-react').then(mod => mod.Thermometer),
    Umbrella: () => import('lucide-react').then(mod => mod.Umbrella),
    Sunrise: () => import('lucide-react').then(mod => mod.Sunrise),
    Sunset: () => import('lucide-react').then(mod => mod.Sunset),
    Activity: () => import('lucide-react').then(mod => mod.Activity),
    Pulse: () => import('lucide-react').then(mod => mod.Pulse),
    Battery: () => import('lucide-react').then(mod => mod.Battery),
    BatteryLow: () => import('lucide-react').then(mod => mod.BatteryLow),
    BatteryMedium: () => import('lucide-react').then(mod => mod.BatteryMedium),
    BatteryFull: () => import('lucide-react').then(mod => mod.BatteryFull),
    Wifi: () => import('lucide-react').then(mod => mod.Wifi),
    WifiOff: () => import('lucide-react').then(mod => mod.WifiOff),
    Bluetooth: () => import('lucide-react').then(mod => mod.Bluetooth),
    BluetoothConnected: () => import('lucide-react').then(mod => mod.BluetoothConnected),
    BluetoothSearching: () => import('lucide-react').then(mod => mod.BluetoothSearching),
    Signal: () => import('lucide-react').then(mod => mod.Signal),
    SignalZero: () => import('lucide-react').then(mod => mod.SignalZero),
    SignalLow: () => import('lucide-react').then(mod => mod.SignalLow),
    SignalMedium: () => import('lucide-react').then(mod => mod.SignalMedium),
    SignalHigh: () => import('lucide-react').then(mod => mod.SignalHigh),
    SignalMax: () => import('lucide-react').then(mod => mod.SignalMax),
    Volume2: () => import('lucide-react').then(mod => mod.Volume2),
    VolumeX: () => import('lucide-react').then(mod => mod.VolumeX),
    Volume1: () => import('lucide-react').then(mod => mod.Volume1),
    Mic: () => import('lucide-react').then(mod => mod.Mic),
    MicOff: () => import('lucide-react').then(mod => mod.MicOff),
    Video: () => import('lucide-react').then(mod => mod.Video),
    VideoOff: () => import('lucide-react').then(mod => mod.VideoOff),
    Camera: () => import('lucide-react').then(mod => mod.Camera),
    CameraOff: () => import('lucide-react').then(mod => mod.CameraOff),
    Monitor: () => import('lucide-react').then(mod => mod.Monitor),
    MonitorOff: () => import('lucide-react').then(mod => mod.MonitorOff),
    Laptop: () => import('lucide-react').then(mod => mod.Laptop),
    Tablet: () => import('lucide-react').then(mod => mod.Tablet),
    Watch: () => import('lucide-react').then(mod => mod.Watch),
    Headphones: () => import('lucide-react').then(mod => mod.Headphones),
    HeadphonesIcon: () => import('lucide-react').then(mod => mod.HeadphonesIcon),
    Speaker: () => import('lucide-react').then(mod => mod.Speaker),
    SpeakerOff: () => import('lucide-react').then(mod => mod.SpeakerOff),
    Radio: () => import('lucide-react').then(mod => mod.Radio),
    Tv: () => import('lucide-react').then(mod => mod.Tv),
    Gamepad2: () => import('lucide-react').then(mod => mod.Gamepad2),
    Joystick: () => import('lucide-react').then(mod => mod.Joystick),
    Mouse: () => import('lucide-react').then(mod => mod.Mouse),
    Keyboard: () => import('lucide-react').then(mod => mod.Keyboard),
    HardDrive: () => import('lucide-react').then(mod => mod.HardDrive),
    Database: () => import('lucide-react').then(mod => mod.Database),
    Server: () => import('lucide-react').then(mod => mod.Server),
    Cpu: () => import('lucide-react').then(mod => mod.Cpu),
    MemoryStick: () => import('lucide-react').then(mod => mod.MemoryStick),
    Usb: () => import('lucide-react').then(mod => mod.Usb),
    SdCard: () => import('lucide-react').then(mod => mod.SdCard),
    Cd: () => import('lucide-react').then(mod => mod.Cd),
    Disc: () => import('lucide-react').then(mod => mod.Disc),
    Vinyl: () => import('lucide-react').then(mod => mod.Vinyl),
    Music: () => import('lucide-react').then(mod => mod.Music),
    Music2: () => import('lucide-react').then(mod => mod.Music2),
    Music3: () => import('lucide-react').then(mod => mod.Music3),
    Music4: () => import('lucide-react').then(mod => mod.Music4),
    PlayCircle: () => import('lucide-react').then(mod => mod.PlayCircle),
    PauseCircle: () => import('lucide-react').then(mod => mod.PauseCircle),
    StopCircle: () => import('lucide-react').then(mod => mod.StopCircle),
    SkipBack: () => import('lucide-react').then(mod => mod.SkipBack),
    SkipForward: () => import('lucide-react').then(mod => mod.SkipForward),
    Repeat: () => import('lucide-react').then(mod => mod.Repeat),
    Shuffle: () => import('lucide-react').then(mod => mod.Shuffle)
  }

  return iconImports[iconName as keyof typeof iconImports] || iconImports.Home
}

// Functions for saving and loading sidebar menu settings
export const saveSidebarMenuConfig = (menuConfig: SidebarMenuItem[]) => {
  try {
    localStorage.setItem('sidebar-menu-config', JSON.stringify(menuConfig))
    return true
  } catch (error) {
    console.error('Failed to save sidebar menu config:', error)
    return false
  }
}

export const loadSidebarMenuConfig = (): SidebarMenuItem[] => {
  try {
    const saved = localStorage.getItem('sidebar-menu-config')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load sidebar menu config:', error)
  }
  return DEFAULT_SIDEBAR_MENU
}

// 메뉴 아이템 업데이트 함수
export const updateMenuItemIcon = (menuId: string, newIcon: string, newColor?: string) => {
  const currentConfig = loadSidebarMenuConfig()
  const updatedConfig = currentConfig.map(item => 
    item.id === menuId 
      ? { ...item, icon: newIcon, color: newColor || item.color }
      : item
  )
  return saveSidebarMenuConfig(updatedConfig)
}
