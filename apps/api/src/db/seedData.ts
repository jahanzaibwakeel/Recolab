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
  ["aaaaaaaa-0012-4000-8000-000000000012", "ml-12", "The Grand Budapest Hotel", "A concierge and lobby boy become entangled in a stylish mystery across Europe.", ["Adventure", "Comedy"], ["style", "mystery", "hotel"], 2014],
  ["aaaaaaaa-0013-4000-8000-000000000013", "ml-13", "Blade Runner 2049", "A replicant officer uncovers a secret that could reshape the boundary between humans and machines.", ["Drama", "Sci-Fi"], ["androids", "cyberpunk", "identity"], 2017],
  ["aaaaaaaa-0014-4000-8000-000000000014", "ml-14", "Ex Machina", "A programmer evaluates a humanoid AI and confronts questions of agency, control, and deception.", ["Drama", "Sci-Fi", "Thriller"], ["artificial intelligence", "ethics", "research"], 2014],
  ["aaaaaaaa-0015-4000-8000-000000000015", "ml-15", "The Martian", "An astronaut stranded on Mars uses science, humor, and engineering to survive.", ["Adventure", "Sci-Fi"], ["space", "nasa", "engineering"], 2015],
  ["aaaaaaaa-0016-4000-8000-000000000016", "ml-16", "Ratatouille", "A young rat with culinary talent follows his craft in a Paris kitchen.", ["Animation", "Comedy"], ["food", "family", "craft"], 2007],
  ["aaaaaaaa-0017-4000-8000-000000000017", "ml-17", "Inside Out", "Emotions inside a young girl's mind help her navigate change and identity.", ["Animation", "Comedy", "Drama"], ["family", "feelings", "coming-of-age"], 2015],
  ["aaaaaaaa-0018-4000-8000-000000000018", "ml-18", "The Imitation Game", "A mathematician and cryptography team race to break encrypted wartime messages.", ["Drama", "History"], ["math", "language", "systems"], 2014],
  ["aaaaaaaa-0019-4000-8000-000000000019", "ml-19", "Ford v Ferrari", "Engineers and drivers build a race car to challenge an industry giant.", ["Action", "Drama", "Sports"], ["engineering", "racing", "craft"], 2019],
  ["aaaaaaaa-0020-4000-8000-000000000020", "ml-20", "The Founder", "A salesman turns a small restaurant into a global franchise while testing ethics and ambition.", ["Drama"], ["business", "founder", "strategy"], 2016],
  ["aaaaaaaa-0021-4000-8000-000000000021", "ml-21", "Her", "A lonely writer develops a relationship with an intelligent operating system.", ["Drama", "Romance", "Sci-Fi"], ["artificial intelligence", "language", "relationships"], 2013],
  ["aaaaaaaa-0022-4000-8000-000000000022", "ml-22", "Wall-E", "A small waste-collecting robot discovers connection, care, and a path back to Earth.", ["Animation", "Sci-Fi"], ["robots", "family", "environment"], 2008],
  ["aaaaaaaa-0023-4000-8000-000000000023", "ml-23", "Apollo 13", "NASA engineers and astronauts solve cascading failures during a lunar mission.", ["Drama", "History"], ["nasa", "space", "engineering"], 1995],
  ["aaaaaaaa-0024-4000-8000-000000000024", "ml-24", "Steve Jobs", "A product visionary confronts personal and professional tensions behind major launches.", ["Drama"], ["product", "founder", "software"], 2015],
  ["aaaaaaaa-0025-4000-8000-000000000025", "ml-25", "Dune", "A gifted heir enters a desert world where ecology, empire, and prophecy collide.", ["Adventure", "Sci-Fi"], ["space", "strategy", "systems"], 2021],
  ["aaaaaaaa-0026-4000-8000-000000000026", "ml-26", "Minority Report", "A detective in a predictive policing unit questions the system after becoming its target.", ["Action", "Sci-Fi", "Thriller"], ["prediction", "systems", "ethics"], 2002],
  ["aaaaaaaa-0027-4000-8000-000000000027", "ml-27", "Edge of Tomorrow", "A reluctant soldier learns through repeated timelines during an alien invasion.", ["Action", "Sci-Fi"], ["time", "aliens", "learning"], 2014],
  ["aaaaaaaa-0028-4000-8000-000000000028", "ml-28", "Gravity", "Astronauts fight to survive after debris destroys their orbital mission.", ["Drama", "Sci-Fi", "Thriller"], ["space", "survival", "engineering"], 2013],
  ["aaaaaaaa-0029-4000-8000-000000000029", "ml-29", "Contact", "A scientist interprets an alien signal while balancing evidence, belief, and discovery.", ["Drama", "Sci-Fi"], ["aliens", "language", "research"], 1997],
  ["aaaaaaaa-0030-4000-8000-000000000030", "ml-30", "Ready Player One", "Players compete inside a virtual world filled with puzzles, culture, and hidden control.", ["Action", "Adventure", "Sci-Fi"], ["simulation", "gaming", "systems"], 2018],
  ["aaaaaaaa-0031-4000-8000-000000000031", "ml-31", "Guardians of the Galaxy", "A group of misfits protects a powerful artifact while forming an unlikely team.", ["Action", "Adventure", "Sci-Fi"], ["space", "teamwork", "comedy"], 2014],
  ["aaaaaaaa-0032-4000-8000-000000000032", "ml-32", "Tron: Legacy", "A programmer enters a digital world shaped by identity, control, and rebellion.", ["Action", "Adventure", "Sci-Fi"], ["simulation", "software", "cyberpunk"], 2010]
] as const;

export const seedRatings = [
  [seedUsers[0]!.id, seedItems[0]![0], 5], [seedUsers[0]!.id, seedItems[1]![0], 5], [seedUsers[0]!.id, seedItems[5]![0], 4], [seedUsers[0]!.id, seedItems[9]![0], 4],
  [seedUsers[0]!.id, seedItems[12]![0], 5], [seedUsers[0]!.id, seedItems[13]![0], 4], [seedUsers[0]!.id, seedItems[14]![0], 4],
  [seedUsers[1]!.id, seedItems[2]![0], 5], [seedUsers[1]!.id, seedItems[6]![0], 4], [seedUsers[1]!.id, seedItems[11]![0], 4],
  [seedUsers[1]!.id, seedItems[15]![0], 5], [seedUsers[1]!.id, seedItems[16]![0], 5], [seedUsers[1]!.id, seedItems[21]![0], 4],
  [seedUsers[2]!.id, seedItems[3]![0], 5], [seedUsers[2]!.id, seedItems[4]![0], 5], [seedUsers[2]!.id, seedItems[7]![0], 4], [seedUsers[2]!.id, seedItems[8]![0], 4],
  [seedUsers[2]!.id, seedItems[18]![0], 4], [seedUsers[2]!.id, seedItems[19]![0], 5], [seedUsers[2]!.id, seedItems[23]![0], 5],
  [seedUsers[2]!.id, seedItems[24]![0], 5], [seedUsers[2]!.id, seedItems[25]![0], 4], [seedUsers[2]!.id, seedItems[27]![0], 4],
  [seedUsers[3]!.id, seedItems[8]![0], 5], [seedUsers[3]!.id, seedItems[9]![0], 5], [seedUsers[3]!.id, seedItems[2]![0], 4],
  [seedUsers[3]!.id, seedItems[17]![0], 5], [seedUsers[3]!.id, seedItems[20]![0], 4], [seedUsers[3]!.id, seedItems[22]![0], 5],
  [seedUsers[3]!.id, seedItems[24]![0], 4], [seedUsers[3]!.id, seedItems[28]![0], 5], [seedUsers[3]!.id, seedItems[31]![0], 4],
  [seedUsers[1]!.id, seedItems[26]![0], 4], [seedUsers[1]!.id, seedItems[29]![0], 4], [seedUsers[1]!.id, seedItems[30]![0], 5]
] as const;
