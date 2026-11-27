// AR X Mine - Configuration
const CONFIG = {
  site: {
    name: 'AR X Mine',
    tagline: 'Premium Minecraft Content Sharing Platform',
    description: 'Discover, share, and download the best Minecraft mods, modpacks, shaders, resource packs, and more.',
    url: 'https://arxmine.netlify.app'
  },
  
  images: {
    logo: '/assets/logos/logo.svg',
    favicon: '/assets/logos/favicon.svg',
    defaultProjectIcon: '/assets/images/default-icon.svg',
    defaultAvatar: '/assets/images/default-avatar.svg',
    defaultBanner: '/assets/images/default-banner.svg',
    defaultScreenshot: '/assets/images/default-icon.svg'
  },
  
  categories: {
    java: {
      mods: {
        name: 'Mods',
        icon: '/assets/icons/mods.svg',
        description: 'Enhance your Minecraft experience'
      },
      modpacks: {
        name: 'Modpacks',
        icon: '/assets/icons/modpacks.svg',
        description: 'Curated collections of mods'
      },
      shaders: {
        name: 'Shaders',
        icon: '/assets/icons/shaders.svg',
        description: 'Beautiful graphics enhancements'
      },
      resourcePacks: {
        name: 'Resource Packs',
        icon: '/assets/icons/resourcepacks.svg',
        description: 'Custom textures and sounds'
      },
      dataPacks: {
        name: 'Data Packs',
        icon: '/assets/icons/datapacks.svg',
        description: 'Customize game mechanics'
      },
      plugins: {
        name: 'Plugins',
        icon: '/assets/icons/plugins.svg',
        description: 'Server-side modifications'
      },
      maps: {
        name: 'Maps',
        icon: '/assets/icons/maps.svg',
        description: 'Adventure and custom worlds'
      }
    },
    bedrock: {
      addons: {
        name: 'Addons',
        icon: '/assets/icons/addons.svg',
        description: 'Bedrock modifications'
      },
      behaviorPacks: {
        name: 'Behavior Packs',
        icon: '/assets/icons/datapacks.svg',
        description: 'Change mob behaviors'
      },
      resourcePacks: {
        name: 'Resource Packs',
        icon: '/assets/icons/resourcepacks.svg',
        description: 'Textures and UI'
      },
      worlds: {
        name: 'Worlds',
        icon: '/assets/icons/worlds.svg',
        description: 'Pre-built worlds'
      },
      skins: {
        name: 'Skins',
        icon: '/assets/icons/skins.svg',
        description: 'Character customization'
      },
      maps: {
        name: 'Maps',
        icon: '/assets/icons/maps.svg',
        description: 'Custom maps'
      }
    }
  },
  
  loaders: {
    forge: 'Forge',
    fabric: 'Fabric',
    quilt: 'Quilt',
    neoforge: 'NeoForge',
    bukkit: 'Bukkit',
    spigot: 'Spigot',
    paper: 'Paper',
    purpur: 'Purpur',
    sponge: 'Sponge',
    bedrock: 'Bedrock'
  },
  
  minecraftVersions: [
    '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
    '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
    '1.18.2', '1.18.1', '1.18',
    '1.17.1', '1.17',
    '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1',
    '1.12.2', '1.7.10'
  ],
  
  tags: [
    'Adventure', 'Technology', 'Magic', 'Optimization', 'Decoration',
    'Survival', 'PvP', 'Exploration', 'Multiplayer', 'Automation',
    'Building', 'Combat', 'Farming', 'Redstone', 'Transportation',
    'Storage', 'World Generation', 'Mobs', 'Dimensions', 'Food',
    'Tools', 'Armor', 'Weapons', 'Energy', 'Graphics'
  ],
  
  licenses: [
    'All Rights Reserved',
    'MIT License',
    'Apache License 2.0',
    'GNU GPL v3',
    'GNU LGPL v3',
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC 4.0',
    'CC BY-NC-SA 4.0'
  ],
  
  sortOptions: [
    { value: 'downloads', label: 'Most Downloaded' },
    { value: 'newest', label: 'Newest' },
    { value: 'updated', label: 'Recently Updated' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' }
  ],
  
  pagination: {
    itemsPerPage: 20,
    maxPages: 10
  }
};

// Make config globally available
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
