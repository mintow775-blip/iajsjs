// Enhanced configuration with official software logos
const CONFIG = {
  ...window.CONFIG,
  
  // Official Minecraft Software Logos
  softwareLogos: {
    // Server Software
    paper: 'https://docs.papermc.io/img/paper.svg',
    purpur: 'https://purpurmc.org/docs/purpur.svg',
    spigot: 'https://static.spigotmc.org/img/spigot.png',
    bukkit: 'https://dev.bukkit.org/images/logo-bukkit.png',
    velocity: 'https://docs.papermc.io/img/velocity.svg',
    waterfall: 'https://docs.papermc.io/img/waterfall.svg',
    
    // Mod Loaders
    fabric: 'https://fabricmc.net/assets/logo.png',
    forge: 'https://files.minecraftforge.net/static/images/logo.svg',
    neoforge: 'https://neoforged.net/img/authors/neoforged.png',
    quilt: 'https://quiltmc.org/assets/img/logo.svg',
    
    // Shader Loaders
    iris: 'https://irisshaders.dev/logo.png',
    optifine: 'https://optifine.net/logo.png',
    
    // Bedrock
    bedrock: 'https://www.minecraft.net/content/dam/games/minecraft/marketplace/mediablock-icon-square-realmplus.svg'
  },
  
  // Software names
  softwareNames: {
    paper: 'Paper',
    purpur: 'Purpur',
    spigot: 'Spigot',
    bukkit: 'Bukkit',
    velocity: 'Velocity',
    waterfall: 'Waterfall',
    fabric: 'Fabric',
    forge: 'Forge',
    neoforge: 'NeoForge',
    quilt: 'Quilt',
    iris: 'Iris Shaders',
    optifine: 'OptiFine',
    bedrock: 'Bedrock'
  }
};

// Update global config
Object.assign(window.CONFIG, CONFIG);
