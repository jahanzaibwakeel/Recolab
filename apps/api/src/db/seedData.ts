export const seedUsers = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "ada@recolab.local",
    name: "Ada",
    role: "admin",
    preferredGenres: ["Action", "Sci-Fi"],
    preferredSkills: ["machine learning", "systems"],
    blockedGenres: ["Horror"],
    boostedProviders: ["MovieLens demo"],
    boostedTags: ["cyberpunk", "space"],
    personalExploration: 0.12
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "maya@recolab.local",
    name: "Maya",
    role: "viewer",
    preferredGenres: ["Animation", "Fantasy", "Comedy"],
    preferredSkills: ["design", "storytelling"],
    blockedGenres: ["Horror"],
    boostedProviders: ["MovieLens demo"],
    boostedTags: ["family", "style"],
    personalExploration: 0.1
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "sam@recolab.local",
    name: "Sam",
    role: "viewer",
    preferredGenres: ["Drama", "Sports", "History"],
    preferredSkills: ["product", "analytics"],
    blockedGenres: ["Fantasy"],
    boostedProviders: ["MovieLens demo"],
    boostedTags: ["analytics", "finance"],
    personalExploration: 0.07
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "nora@recolab.local",
    name: "Nora",
    role: "viewer",
    preferredGenres: ["Drama", "Sci-Fi", "History"],
    preferredSkills: ["research", "language"],
    blockedGenres: ["Sports"],
    boostedProviders: ["MovieLens demo"],
    boostedTags: ["language", "nasa"],
    personalExploration: 0.09
  }
];

export const seedItems = [
  ["aaaaaaaa-0001-4000-8000-000000000001", "ml-1", "The Matrix", "A hacker discovers a simulated reality and joins a rebellion against machine control.", ["Action", "Sci-Fi"], ["simulation", "cyberpunk", "philosophy"], 1999],
  ["aaaaaaaa-0002-4000-8000-000000000002", "ml-2", "Inception", "A thief enters dreams to plant an idea while memories distort the mission.", ["Action", "Sci-Fi", "Thriller"], ["dreams", "heist", "mind"], 2010],
  ["aaaaaaaa-0003-4000-8000-000000000003", "ml-3", "Spirited Away", "A young girl enters a spirit world and learns courage while rescuing her parents.", ["Animation", "Fantasy"], ["coming-of-age", "spirits", "family"], 2001],
  ["aaaaaaaa-0004-4000-8000-000000000004", "ml-4", "The Social Network", "A programmer builds a social platform while ambition reshapes friendships.", ["Drama"], ["startup", "software", "founder"], 2010],
  ["aaaaaaaa-0005-4000-8000-000000000005", "ml-5", "Moneyball", "A baseball manager uses data and unconventional analysis to build a competitive team.", ["Drama", "Sports"], ["analytics", "baseball", "strategy"], 2011],
  ["aaaaaaaa-0006-4000-8000-000000000006", "ml-6", "Interstellar", "A team travels through a wormhole to find a future home for humanity.", ["Adventure", "Sci-Fi"], ["space", "physics", "family"], 2014],
  ["aaaaaaaa-0007-4000-8000-000000000007", "ml-7", "Chef", "A chef rebuilds his career and family bonds through a food truck journey.", ["Comedy", "Drama"], ["food", "craft", "family"], 2014],
  ["aaaaaaaa-0008-4000-8000-000000000008", "ml-8", "The Big Short", "Analysts uncover structural risk before a financial crisis and bet against the market.", ["Comedy", "Drama"], ["finance", "markets", "analysis"], 2015],
  ["aaaaaaaa-0009-4000-8000-000000000009", "ml-9", "Hidden Figures", "Mathematicians at NASA overcome barriers while enabling a landmark space mission.", ["Drama", "History"], ["nasa", "math", "career"], 2016],
  ["aaaaaaaa-0010-4000-8000-000000000010", "ml-10", "Arrival", "A linguist decodes alien communication and changes how she understands time.", ["Drama", "Sci-Fi"], ["language", "aliens", "time"], 2016],
  ["aaaaaaaa-0011-4000-8000-000000000011", "ml-11", "Whiplash", "A drummer pursues greatness under an intense instructor.", ["Drama", "Music"], ["ambition", "practice", "mentor"], 2014],
  ["aaaaaaaa-0012-4000-8000-000000000012", "ml-12", "The Grand Budapest Hotel", "A concierge and lobby boy become entangled in a stylish mystery across Europe.", ["Adventure", "Comedy"], ["style", "mystery", "hotel"], 2014]
] as const;

export const seedRatings = [
  [seedUsers[0]!.id, seedItems[0]![0], 5], [seedUsers[0]!.id, seedItems[1]![0], 5], [seedUsers[0]!.id, seedItems[5]![0], 4], [seedUsers[0]!.id, seedItems[9]![0], 4],
  [seedUsers[1]!.id, seedItems[2]![0], 5], [seedUsers[1]!.id, seedItems[6]![0], 4], [seedUsers[1]!.id, seedItems[11]![0], 4],
  [seedUsers[2]!.id, seedItems[3]![0], 5], [seedUsers[2]!.id, seedItems[4]![0], 5], [seedUsers[2]!.id, seedItems[7]![0], 4], [seedUsers[2]!.id, seedItems[8]![0], 4],
  [seedUsers[3]!.id, seedItems[8]![0], 5], [seedUsers[3]!.id, seedItems[9]![0], 5], [seedUsers[3]!.id, seedItems[2]![0], 4]
] as const;
