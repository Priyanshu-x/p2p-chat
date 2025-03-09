const names = [
    // 🏴‍☠️ Anime & Manga Villains  
    "Madara", "Aizen", "Dio Brando", "Griffith", "Orochimaru",
    "Shishio Makoto", "Nagato", "Shougo Makishima", "Shigaraki", "Kaido",
    "Esdeath", "Hollow Ichigo", "Lelouch", "Johan Liebert", "Zod",

    // 🎮 Video Game Villains  
    "Sephiroth", "Vaas Montenegro", "Vergil", "Arthas", "Kefka Palazzo",
    "Dr. Eggman", "Bowser", "Ganondorf", "Albert Wesker", "Pyramid Head",

    // 🎬 Movie & Series Villains  
    "Joker", "Bane", "Voldemort", "Thanos", "Hannibal Lecter",
    "Darth Vader", "Sauron", "Ra’s al Ghul", "Agent Smith", "Pennywise",

    // 🏛️ Mythological Villains  
    "Zeus", "Hades", "Ares", "Loki", "Mephisto",
    "Lucifer", "Ravana", "Kumbhakarna", "Tartarus", "Set",

    // ⚔️ Mahabharata Names  
    "Duryodhana", "Karna", "Ashwatthama", "Shakuni", "Jayadratha",
    "Dronacharya", "Bhishma", "Eklavya", "Kripacharya", "Barbarika"
];

// Function to get a random name  
function getRandomName() {
    return names[Math.floor(Math.random() * names.length)];
}

module.exports = { getRandomName };
