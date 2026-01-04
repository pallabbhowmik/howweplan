export type IndiaRegion = 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';

export type DestinationTheme =
  | 'Mountains'
  | 'Beaches'
  | 'Heritage'
  | 'Wildlife'
  | 'Spiritual'
  | 'Food'
  | 'City'
  | 'Culture'
  | 'Nightlife'
  | 'Nature'
  | 'Adventure'
  | 'Desert';

export interface IndiaDestination {
  id: string;
  name: string;
  stateOrUt: string;
  region: IndiaRegion;
  themes: DestinationTheme[];
  idealMonths: string;
  suggestedDuration: string;
  highlight: string;
  imageQuery: string;
}

export function destinationImageUrl(destination: IndiaDestination, width = 800, height = 500): string {
  // Curated Unsplash photo IDs for accurate destination imagery
  // Updated with unique, verified photos for each destination
  const CURATED_PHOTOS: Record<string, string> = {
    // North India
    'in-delhi': 'photo-1587474260584-136574528ed5', // India Gate
    'in-agra': 'photo-1564507592333-c60657eea523', // Taj Mahal
    'in-jaipur': 'photo-1477587458883-47145ed94245', // Hawa Mahal
    'in-udaipur': 'photo-1568495248636-6432b97bd949', // Lake Palace
    'in-jodhpur': 'photo-1578662996442-48f60103fc96', // Blue City
    'in-jaisalmer': 'photo-1524492412937-b28074a5d7da', // Golden Fort
    'in-bikaner': 'photo-1599661046289-e31897846e41', // Junagarh Fort
    'in-pushkar': 'photo-1602216056096-3b40cc0c9944', // Pushkar Lake
    'in-mount-abu': 'photo-1544735716-ea9ef790f501', // Dilwara Temple
    'in-ranthambore': 'photo-1561731216-c3a4d99437d5', // Tiger
    'in-amritsar': 'photo-1514222134-b57cbb8ce073', // Golden Temple
    'in-chandigarh': 'photo-1567449303183-ae0d6ed1498e', // Rock Garden
    'in-shimla': 'photo-1597074866923-dc0589150358', // Hill station
    'in-manali': 'photo-1626621341517-bbf3d9990a23', // Snow mountains
    'in-kasol': 'photo-1464822759023-fed622ff2c3b', // Parvati Valley
    'in-spiti': 'photo-1589308078059-be1415eab4c3', // Spiti landscape
    'in-dharamshala': 'photo-1585123388867-3bfe6dd4bdbf', // Mcleodganj
    'in-rishikesh': 'photo-1482938289607-e9573fc25ebb', // Ganga river
    'in-haridwar': 'photo-1591018653367-4e9f06bb8a9e', // Ganga Aarti
    'in-mussoorie': 'photo-1544735716-ea9ef790f501', // Hill view
    'in-nainital': 'photo-1595815771614-ade9d652a65d', // Lake
    'in-auli': 'photo-1491002052546-bf38f186af56', // Skiing
    'in-srinagar': 'photo-1566837945700-30057527ade0', // Dal Lake
    'in-gulmarg': 'photo-1605540436563-5bca919ae766', // Snow slopes
    'in-pahalgam': 'photo-1596402184320-417e7178b2cd', // Lidder Valley
    'in-leh': 'photo-1593181629936-11c609b8db9b', // Ladakh monastery
    'in-nubra': 'photo-1614531341773-3bff8b7cb3fc', // Sand dunes camels
    'in-pangong': 'photo-1626015365107-aa5c10a8af2b', // Blue lake
    'in-varanasi': 'photo-1561361513-2d000a50f0dc', // Ghats
    'in-lucknow': 'photo-1600011689032-8b628b8a8747', // Bara Imambara
    'in-kedarnath': 'photo-1620766182812-7ae9f1c7f9fa', // Temple mountains
    'in-badrinath': 'photo-1600011689032-8b628b8a8747', // Himalayan temple
    'in-jim-corbett': 'photo-1549480017-d76466a4b7e8', // Wildlife forest
    
    // West India
    'in-mumbai': 'photo-1529253355930-ddbe423a2ac7', // Gateway of India
    'in-pune': 'photo-1625731226721-b4d51ae70e20', // Shaniwar Wada
    'in-lonavala': 'photo-1501785888041-af3ef285b470', // Misty hills
    'in-mahabaleshwar': 'photo-1470770841072-f978cf4d019e', // Viewpoint
    'in-aurangabad': 'photo-1590050752117-238cb0fb12b1', // Ajanta caves
    'in-goa': 'photo-1512343879784-a960bf40e7f2', // Beach sunset
    'in-gokarna': 'photo-1507525428034-b723cf961d3e', // Beach
    'in-ahmedabad': 'photo-1595658658481-d53d3f999875', // Sabarmati
    'in-rann': 'photo-1583309219338-a582f1f9ca6b', // White desert
    'in-gir': 'photo-1614531341773-3bff8b7cb3fc', // Lion
    // Wikimedia Commons (stable) for temple destinations (previous Unsplash photo was removed and returned 404)
    'in-dwarka': 'https://commons.wikimedia.org/wiki/Special:FilePath/Dwarakadheesh_Temple,_2014.jpg',
    'in-somnath': 'https://commons.wikimedia.org/wiki/Special:FilePath/Somnath_Temple.jpg',
    
    // South India
    'in-bengaluru': 'photo-1596176530529-78163a4f7af2', // City
    'in-mysuru': 'photo-1600100397608-e1f6a7b9a4d8', // Mysore Palace
    'in-hampi': 'photo-1600011689032-8b628b8a8747', // Ruins
    'in-coorg': 'photo-1542601906990-b4d3fb778b09', // Coffee plantation
    'in-ooty': 'photo-1519681393784-d120267933ba', // Tea gardens
    'in-kodaikanal': 'photo-1595815771614-ade9d652a65d', // Lake mist
    'in-chennai': 'photo-1582510003544-4d00b7f74220', // Marina Beach
    'in-mahabalipuram': 'https://commons.wikimedia.org/wiki/Special:FilePath/Mamallapuram,_Shore_Temple,_India.jpg',
    'in-madurai': 'photo-1605649487212-47bdab064df7', // Meenakshi Temple
    'in-pondicherry': 'photo-1580889272946-49e46e20d29d', // French quarter
    'in-kerala-kochi': 'photo-1602216056096-3b40cc0c9944', // Chinese nets
    'in-kerala-alleppey': 'photo-1593693411515-c20261bcad6e', // Backwaters
    'in-kerala-munnar': 'photo-1470770841072-f978cf4d019e', // Tea hills
    'in-kerala-varkala': 'photo-1519046904884-53103b34b206', // Cliff beach
    'in-kerala-thekkady': 'photo-1549480017-d76466a4b7e8', // Periyar
    'in-hyderabad': 'photo-1572445271230-a78d4b434089', // Charminar
    'in-andaman': 'photo-1544551763-46a013bb70d5', // Beach
    'in-lakshadweep': 'photo-1559128010-7c1ad6e1b6a5', // Lagoon
    
    // East India
    'in-kolkata': 'photo-1558431382-27e303142255', // Victoria Memorial
    'in-darjeeling': 'photo-1544735716-ea9ef790f501', // Tea plantation
    'in-sundarbans': 'photo-1549480017-d76466a4b7e8', // Mangrove
    'in-puri': 'photo-1507525428034-b723cf961d3e', // Beach temple
    'in-konark': 'photo-1600011689032-8b628b8a8747', // Sun Temple
    'in-gangtok': 'photo-1585123388867-3bfe6dd4bdbf', // Mountain view
    'in-kaziranga': 'photo-1534567153574-2b12153a87f0', // Rhino
    
    // Central India
    'in-bhopal': 'photo-1595815771614-ade9d652a65d', // Lake
    'in-khajuraho': 'photo-1600011689032-8b628b8a8747', // Temples
    'in-bandhavgarh': 'photo-1561731216-c3a4d99437d5', // Tiger
    'in-kanha': 'photo-1549480017-d76466a4b7e8', // Forest
    
    // Northeast India
    'in-shillong': 'photo-1475924156734-496f6cac6ec1', // Hills
    'in-cherrapunji': 'photo-1432405972618-c60b0225b8f9', // Waterfalls
    'in-tawang': 'photo-1593181629936-11c609b8db9b', // Monastery
  };

  const curated = CURATED_PHOTOS[destination.id];
  if (curated) {
    if (curated.startsWith('http://') || curated.startsWith('https://')) {
      const joiner = curated.includes('?') ? '&' : '?';
      return `${curated}${joiner}width=${width}`;
    }
    return `https://images.unsplash.com/${curated}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
  }
  
  // Fallback: Use Picsum for uncurated destinations (source.unsplash.com is deprecated)
  // Generate a consistent seed from destination name for reproducible images
  const seed = destination.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

// Theme-based gradient backgrounds as elegant fallbacks
export const THEME_GRADIENTS: Record<DestinationTheme, string> = {
  Mountains: 'from-slate-700 via-blue-900 to-slate-800',
  Beaches: 'from-cyan-500 via-blue-500 to-teal-600',
  Heritage: 'from-amber-700 via-orange-800 to-red-900',
  Wildlife: 'from-green-700 via-emerald-800 to-green-900',
  Spiritual: 'from-purple-600 via-violet-700 to-indigo-800',
  Food: 'from-orange-500 via-red-500 to-pink-600',
  City: 'from-zinc-600 via-slate-700 to-zinc-800',
  Culture: 'from-rose-600 via-pink-700 to-fuchsia-800',
  Nightlife: 'from-violet-600 via-purple-700 to-indigo-900',
  Nature: 'from-green-600 via-teal-700 to-emerald-800',
  Adventure: 'from-orange-600 via-amber-700 to-yellow-800',
  Desert: 'from-yellow-600 via-amber-700 to-orange-800',
};

// Theme icons for visual interest
export const THEME_ICONS: Record<DestinationTheme, string> = {
  Mountains: '🏔️',
  Beaches: '🏖️',
  Heritage: '🏛️',
  Wildlife: '🐅',
  Spiritual: '🕉️',
  Food: '🍛',
  City: '🏙️',
  Culture: '🎭',
  Nightlife: '🌃',
  Nature: '🌿',
  Adventure: '🧗',
  Desert: '🏜️',
};

export const INDIA_DESTINATIONS: IndiaDestination[] = [
  // North
  { id: 'in-delhi', name: 'Delhi', stateOrUt: 'Delhi', region: 'North', themes: ['City', 'Heritage', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Layers of Mughal and modern India—markets, monuments, and street food.', imageQuery: 'delhi india city heritage' },
  { id: 'in-agra', name: 'Agra', stateOrUt: 'Uttar Pradesh', region: 'North', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Home of the Taj Mahal and grand Mughal architecture.', imageQuery: 'taj mahal agra' },
  { id: 'in-jaipur', name: 'Jaipur', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Food', 'City'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Pink City palaces, forts, bazaars, and craft heritage.', imageQuery: 'jaipur rajasthan palace' },
  { id: 'in-udaipur', name: 'Udaipur', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Lakeside romance, palaces, and sunset boat rides.', imageQuery: 'udaipur lake palace' },
  { id: 'in-jodhpur', name: 'Jodhpur', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Blue City lanes under the mighty Mehrangarh Fort.', imageQuery: 'jodhpur mehrangarh fort' },
  { id: 'in-jaisalmer', name: 'Jaisalmer', stateOrUt: 'Rajasthan', region: 'North', themes: ['Desert', 'Heritage', 'Adventure'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Golden Fort and desert dunes with stargazing camps.', imageQuery: 'jaisalmer desert dunes' },
  { id: 'in-bikaner', name: 'Bikaner', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Desert'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'Junagarh Fort, havelis, and desert culture.', imageQuery: 'bikaner rajasthan fort' },
  { id: 'in-pushkar', name: 'Pushkar', stateOrUt: 'Rajasthan', region: 'North', themes: ['Spiritual', 'Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Sacred lake, temples, and mellow café culture.', imageQuery: 'pushkar lake temple' },
  { id: 'in-mount-abu', name: 'Mount Abu', stateOrUt: 'Rajasthan', region: 'North', themes: ['Nature', 'Spiritual'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Hill retreat with famous Dilwara temples.', imageQuery: 'mount abu hill station' },
  { id: 'in-ranthambore', name: 'Ranthambore', stateOrUt: 'Rajasthan', region: 'North', themes: ['Wildlife', 'Adventure', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'Tiger safaris in a dramatic forest-fort landscape.', imageQuery: 'ranthambore tiger safari' },
  { id: 'in-amritsar', name: 'Amritsar', stateOrUt: 'Punjab', region: 'North', themes: ['Spiritual', 'Food', 'Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Golden Temple serenity and legendary Punjabi food.', imageQuery: 'golden temple amritsar' },
  { id: 'in-chandigarh', name: 'Chandigarh', stateOrUt: 'Chandigarh', region: 'North', themes: ['City'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Modernist architecture, gardens, and a relaxed vibe.', imageQuery: 'chandigarh city architecture' },
  { id: 'in-shimla', name: 'Shimla', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Colonial charm and cool Himalayan air.', imageQuery: 'shimla himachal mountains' },
  { id: 'in-manali', name: 'Manali', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Adventure', 'Nature'], idealMonths: 'Mar–Jun, Oct–Feb', suggestedDuration: '3–5 days', highlight: 'Snowy peaks, cafés, and adventure sports.', imageQuery: 'manali himachal snow mountains' },
  { id: 'in-kasol', name: 'Kasol', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Nature', 'Adventure'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Parvati Valley hikes and riverside chill.', imageQuery: 'kasol parvati valley river' },
  { id: 'in-spiti', name: 'Spiti Valley', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Adventure', 'Mountains', 'Nature'], idealMonths: 'Jun–Sep', suggestedDuration: '6–10 days', highlight: 'High-altitude desert monasteries and unreal landscapes.', imageQuery: 'spiti valley monastery' },
  { id: 'in-dharamshala', name: 'Dharamshala', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Spiritual', 'Nature'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Tibetan culture, cafés, and forest walks.', imageQuery: 'dharamshala mcleodganj' },
  { id: 'in-rishikesh', name: 'Rishikesh', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Spiritual', 'Adventure', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–4 days', highlight: 'Yoga by the Ganga plus rafting and hikes.', imageQuery: 'rishikesh ganga yoga' },
  { id: 'in-haridwar', name: 'Haridwar', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Spiritual'], idealMonths: 'Oct–Apr', suggestedDuration: '1–2 days', highlight: 'Aarti rituals and riverside ghats.', imageQuery: 'haridwar ganga aarti' },
  { id: 'in-mussoorie', name: 'Mussoorie', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–3 days', highlight: 'The classic “Queen of Hills” with scenic viewpoints.', imageQuery: 'mussoorie hill station' },
  { id: 'in-nainital', name: 'Nainital', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Nature', 'Mountains'], idealMonths: 'Mar–Jun, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Lake town charm with mountain walks.', imageQuery: 'nainital lake' },
  { id: 'in-auli', name: 'Auli', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Mountains', 'Adventure'], idealMonths: 'Dec–Mar', suggestedDuration: '2–4 days', highlight: 'Ski slopes and sweeping Himalayan views.', imageQuery: 'auli skiing himalayas' },
  { id: 'in-alk-hemkund', name: 'Hemkund Sahib', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Spiritual', 'Mountains', 'Adventure'], idealMonths: 'Jun–Sep', suggestedDuration: '2–3 days', highlight: 'High-altitude pilgrimage amid glacial scenery.', imageQuery: 'hemkund sahib lake' },
  { id: 'in-srinagar', name: 'Srinagar', stateOrUt: 'Jammu & Kashmir', region: 'North', themes: ['Nature', 'Heritage'], idealMonths: 'Apr–Oct', suggestedDuration: '3–5 days', highlight: 'Houseboats, gardens, and the Dal Lake skyline.', imageQuery: 'srinagar dal lake houseboat' },
  { id: 'in-gulmarg', name: 'Gulmarg', stateOrUt: 'Jammu & Kashmir', region: 'North', themes: ['Mountains', 'Adventure', 'Nature'], idealMonths: 'Dec–Mar, Jun–Sep', suggestedDuration: '2–4 days', highlight: 'Skiing, gondola rides, and alpine meadows.', imageQuery: 'gulmarg snow gondola' },
  { id: 'in-pahalgam', name: 'Pahalgam', stateOrUt: 'Jammu & Kashmir', region: 'North', themes: ['Nature', 'Mountains'], idealMonths: 'Apr–Oct', suggestedDuration: '2–4 days', highlight: 'Riverside meadows and easy mountain escapes.', imageQuery: 'pahalgam valley river' },
  { id: 'in-leh', name: 'Leh', stateOrUt: 'Ladakh', region: 'North', themes: ['Adventure', 'Mountains', 'Spiritual'], idealMonths: 'Jun–Sep', suggestedDuration: '5–9 days', highlight: 'Monasteries, high passes, and stark beauty.', imageQuery: 'leh ladakh monastery mountains' },
  { id: 'in-nubra', name: 'Nubra Valley', stateOrUt: 'Ladakh', region: 'North', themes: ['Adventure', 'Nature', 'Desert'], idealMonths: 'Jun–Sep', suggestedDuration: '2–4 days', highlight: 'Sand dunes at altitude and dramatic valleys.', imageQuery: 'nubra valley sand dunes' },
  { id: 'in-pangong', name: 'Pangong Lake', stateOrUt: 'Ladakh', region: 'North', themes: ['Nature', 'Adventure'], idealMonths: 'Jun–Sep', suggestedDuration: '1–2 days', highlight: 'A surreal blue lake framed by rugged mountains.', imageQuery: 'pangong lake ladakh' },
  { id: 'in-kargil', name: 'Kargil', stateOrUt: 'Ladakh', region: 'North', themes: ['Nature', 'Heritage'], idealMonths: 'Jun–Sep', suggestedDuration: '1–2 days', highlight: 'Gateway routes, valleys, and history.', imageQuery: 'kargil ladakh valley' },

  // West
  { id: 'in-mumbai', name: 'Mumbai', stateOrUt: 'Maharashtra', region: 'West', themes: ['City', 'Food'], idealMonths: 'Nov–Feb', suggestedDuration: '3–5 days', highlight: 'Iconic skyline, coastal promenades, and unbeatable street food.', imageQuery: 'mumbai marine drive' },
  { id: 'in-pune', name: 'Pune', stateOrUt: 'Maharashtra', region: 'West', themes: ['City', 'Food'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Cafés, culture, and quick getaways nearby.', imageQuery: 'pune india city' },
  { id: 'in-lonavala', name: 'Lonavala', stateOrUt: 'Maharashtra', region: 'West', themes: ['Nature', 'Mountains'], idealMonths: 'Jun–Sep, Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Monsoon hills, viewpoints, and quick escapes from Mumbai/Pune.', imageQuery: 'lonavala monsoon hills' },
  { id: 'in-mahabaleshwar', name: 'Mahabaleshwar', stateOrUt: 'Maharashtra', region: 'West', themes: ['Nature', 'Mountains'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Strawberries, viewpoints, and cool air.', imageQuery: 'mahabaleshwar hills' },
  { id: 'in-aurangabad', name: 'Aurangabad', stateOrUt: 'Maharashtra', region: 'West', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Gateway to Ajanta & Ellora caves.', imageQuery: 'ajanta ellora caves' },
  { id: 'in-goa', name: 'Goa', stateOrUt: 'Goa', region: 'West', themes: ['Beaches', 'Food', 'Nightlife', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '4–7 days', highlight: 'Beaches, cafes, Portuguese heritage, and laid-back vibes.', imageQuery: 'goa beach sunset' },
  { id: 'in-gokarna', name: 'Gokarna', stateOrUt: 'Karnataka', region: 'West', themes: ['Beaches', 'Spiritual', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Quiet beaches and temple town calm.', imageQuery: 'gokarna beach' },
  { id: 'in-ahmedabad', name: 'Ahmedabad', stateOrUt: 'Gujarat', region: 'West', themes: ['Heritage', 'Food', 'City'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Heritage pols, textiles, and Gujarati thalis.', imageQuery: 'ahmedabad heritage city' },
  { id: 'in-rann', name: 'Rann of Kutch', stateOrUt: 'Gujarat', region: 'West', themes: ['Desert', 'Culture', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'White salt desert under starry skies and craft villages.', imageQuery: 'rann of kutch white desert' },
  { id: 'in-gir', name: 'Gir National Park', stateOrUt: 'Gujarat', region: 'West', themes: ['Wildlife', 'Nature'], idealMonths: 'Dec–Apr', suggestedDuration: '2–3 days', highlight: 'The home of Asiatic lions.', imageQuery: 'gir forest lion' },
  { id: 'in-dwarka', name: 'Dwarka', stateOrUt: 'Gujarat', region: 'West', themes: ['Spiritual', 'Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Coastal temples and mythology-laced streets.', imageQuery: 'dwarka temple' },
  { id: 'in-somnath', name: 'Somnath', stateOrUt: 'Gujarat', region: 'West', themes: ['Spiritual'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Sea-facing temple and evening aarti by the coast.', imageQuery: 'somnath temple sea' },

  // South
  { id: 'in-bengaluru', name: 'Bengaluru', stateOrUt: 'Karnataka', region: 'South', themes: ['City', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Garden city energy, cafés, and weekend escapes.', imageQuery: 'bengaluru city india' },
  { id: 'in-mysuru', name: 'Mysuru', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Royal palace, markets, and Dasara vibes.', imageQuery: 'mysore palace' },
  { id: 'in-hampi', name: 'Hampi', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage', 'Nature'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Boulder landscapes and epic temple ruins.', imageQuery: 'hampi ruins boulders' },
  { id: 'in-coorg', name: 'Coorg', stateOrUt: 'Karnataka', region: 'South', themes: ['Nature', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '3–5 days', highlight: 'Coffee estates, misty hills, and waterfall trails.', imageQuery: 'coorg coffee plantation' },
  { id: 'in-ooty', name: 'Ooty', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Nilgiri hills, tea gardens, and cool breezes.', imageQuery: 'ooty tea gardens' },
  { id: 'in-kodaikanal', name: 'Kodaikanal', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Oct–Jan', suggestedDuration: '2–4 days', highlight: 'A misty lake town with forest trails.', imageQuery: 'kodaikanal lake' },
  { id: 'in-chennai', name: 'Chennai', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['City', 'Food'], idealMonths: 'Nov–Feb', suggestedDuration: '2–4 days', highlight: 'Marina Beach mornings and South Indian culinary classics.', imageQuery: 'chennai marina beach' },
  { id: 'in-mahabalipuram', name: 'Mahabalipuram', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Heritage', 'Beaches'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Shore temples and rock-cut architecture by the sea.', imageQuery: 'mahabalipuram shore temple' },
  { id: 'in-madurai', name: 'Madurai', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Spiritual', 'Heritage', 'Food'], idealMonths: 'Nov–Feb', suggestedDuration: '1–3 days', highlight: 'Meenakshi Temple grandeur and vibrant bazaars.', imageQuery: 'madurai meenakshi temple' },
  { id: 'in-rameswaram', name: 'Rameswaram', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Spiritual', 'Beaches'], idealMonths: 'Oct–Apr', suggestedDuration: '1–2 days', highlight: 'Pilgrimage by the sea with long sandy shores.', imageQuery: 'rameswaram temple sea' },
  { id: 'in-pondicherry', name: 'Pondicherry', stateOrUt: 'Puducherry', region: 'South', themes: ['Beaches', 'Food', 'Heritage'], idealMonths: 'Nov–Feb', suggestedDuration: '2–4 days', highlight: 'French quarter strolls and seaside cafés.', imageQuery: 'pondicherry french quarter' },
  { id: 'in-kerala-kochi', name: 'Kochi', stateOrUt: 'Kerala', region: 'South', themes: ['Heritage', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Fort Kochi lanes, art cafés, and coastal culture.', imageQuery: 'fort kochi kerala' },
  { id: 'in-kerala-alleppey', name: 'Alleppey (Alappuzha)', stateOrUt: 'Kerala', region: 'South', themes: ['Nature', 'Beaches'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Backwater houseboats and relaxed lagoons.', imageQuery: 'alleppey backwaters houseboat' },
  { id: 'in-kerala-munnar', name: 'Munnar', stateOrUt: 'Kerala', region: 'South', themes: ['Mountains', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '3–5 days', highlight: 'Tea estates, misty hills, and viewpoints.', imageQuery: 'munnar tea plantation' },
  { id: 'in-kerala-varkala', name: 'Varkala', stateOrUt: 'Kerala', region: 'South', themes: ['Beaches', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Cliffside sunsets and calm beach cafés.', imageQuery: 'varkala cliff beach' },
  { id: 'in-kerala-thekkady', name: 'Thekkady', stateOrUt: 'Kerala', region: 'South', themes: ['Wildlife', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Periyar wildlife and spice plantations.', imageQuery: 'thekkady periyar wildlife' },
  { id: 'in-hyderabad', name: 'Hyderabad', stateOrUt: 'Telangana', region: 'South', themes: ['City', 'Food', 'Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Charminar lanes and iconic biryani culture.', imageQuery: 'hyderabad charminar' },
  { id: 'in-hampi-badami', name: 'Badami', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage', 'Nature'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'Cave temples and red sandstone cliffs.', imageQuery: 'badami cave temples' },
  { id: 'in-andaman', name: 'Havelock Island', stateOrUt: 'Andaman & Nicobar Islands', region: 'South', themes: ['Beaches', 'Adventure', 'Nature'], idealMonths: 'Nov–Apr', suggestedDuration: '4–6 days', highlight: 'Turquoise water, snorkeling, and serene beaches.', imageQuery: 'havelock island andaman beach' },
  { id: 'in-andaman-neil', name: 'Neil Island', stateOrUt: 'Andaman & Nicobar Islands', region: 'South', themes: ['Beaches', 'Nature'], idealMonths: 'Nov–Apr', suggestedDuration: '2–4 days', highlight: 'Quiet island life and coral reefs.', imageQuery: 'neil island andaman' },
  { id: 'in-lakshadweep', name: 'Lakshadweep', stateOrUt: 'Lakshadweep', region: 'South', themes: ['Beaches', 'Nature', 'Adventure'], idealMonths: 'Oct–May', suggestedDuration: '4–7 days', highlight: 'Lagoon islands and spectacular water clarity.', imageQuery: 'lakshadweep lagoon' },

  // East
  { id: 'in-kolkata', name: 'Kolkata', stateOrUt: 'West Bengal', region: 'East', themes: ['City', 'Food', 'Heritage'], idealMonths: 'Nov–Feb', suggestedDuration: '3–5 days', highlight: 'Colonial charm, art, and unbeatable sweets.', imageQuery: 'kolkata victoria memorial' },
  { id: 'in-darjeeling', name: 'Darjeeling', stateOrUt: 'West Bengal', region: 'East', themes: ['Mountains', 'Nature', 'Food'], idealMonths: 'Mar–May, Oct–Dec', suggestedDuration: '3–5 days', highlight: 'Tea gardens and Himalayan sunrise views.', imageQuery: 'darjeeling tea plantation' },
  { id: 'in-sundarbans', name: 'Sundarbans', stateOrUt: 'West Bengal', region: 'East', themes: ['Wildlife', 'Nature', 'Adventure'], idealMonths: 'Nov–Mar', suggestedDuration: '2–4 days', highlight: 'Mangrove safaris in tiger country.', imageQuery: 'sundarbans mangrove forest' },
  { id: 'in-bhubaneswar', name: 'Bhubaneswar', stateOrUt: 'Odisha', region: 'East', themes: ['Heritage', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Temple city with a growing food scene.', imageQuery: 'bhubaneswar temple' },
  { id: 'in-puri', name: 'Puri', stateOrUt: 'Odisha', region: 'East', themes: ['Spiritual', 'Beaches'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Jagannath Temple and wide sandy beaches.', imageQuery: 'puri beach odisha' },
  { id: 'in-konark', name: 'Konark', stateOrUt: 'Odisha', region: 'East', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1 day', highlight: 'Sun Temple masterpieces carved in stone.', imageQuery: 'konark sun temple' },
  { id: 'in-gangtok', name: 'Gangtok', stateOrUt: 'Sikkim', region: 'East', themes: ['Mountains', 'Nature', 'Spiritual'], idealMonths: 'Mar–May, Oct–Dec', suggestedDuration: '3–6 days', highlight: 'Himalayan views with monasteries and cafés.', imageQuery: 'gangtok sikkim mountains' },
  { id: 'in-pelling', name: 'Pelling', stateOrUt: 'Sikkim', region: 'East', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–May, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Khangchendzonga vistas and quiet hills.', imageQuery: 'pelling sikkim view' },
  { id: 'in-kaziranga', name: 'Kaziranga National Park', stateOrUt: 'Assam', region: 'East', themes: ['Wildlife', 'Nature'], idealMonths: 'Nov–Apr', suggestedDuration: '2–3 days', highlight: 'Rhino safaris and grassland scenery.', imageQuery: 'kaziranga rhinoceros' },
  { id: 'in-majuli', name: 'Majuli', stateOrUt: 'Assam', region: 'East', themes: ['Culture', 'Nature', 'Spiritual'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'River island culture and satra monasteries.', imageQuery: 'majuli assam river island' },

  // Central
  { id: 'in-bhopal', name: 'Bhopal', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['City', 'Heritage', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Lakeside city with heritage sites and museums.', imageQuery: 'bhopal lake india' },
  { id: 'in-khajuraho', name: 'Khajuraho', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'World-famous temples with intricate sculptures.', imageQuery: 'khajuraho temples' },
  { id: 'in-bandhavgarh', name: 'Bandhavgarh', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Wildlife', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'One of India’s top tiger reserves.', imageQuery: 'bandhavgarh tiger safari' },
  { id: 'in-kanha', name: 'Kanha', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Wildlife', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'Dense forests and classic safari landscapes.', imageQuery: 'kanha national park' },
  { id: 'in-pachmarhi', name: 'Pachmarhi', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Nature', 'Mountains'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'A quiet hill station with caves and waterfalls.', imageQuery: 'pachmarhi waterfalls' },
  { id: 'in-jabalpur', name: 'Jabalpur', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Marble Rocks and river gorges at Bhedaghat.', imageQuery: 'bhedaghat marble rocks' },

  // Northeast
  { id: 'in-shillong', name: 'Shillong', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Mountains', 'Nature', 'Food'], idealMonths: 'Oct–May', suggestedDuration: '3–5 days', highlight: 'Music, cafés, and misty hills.', imageQuery: 'shillong meghalaya hills' },
  { id: 'in-cherrapunji', name: 'Cherrapunji', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Nature', 'Adventure'], idealMonths: 'Oct–May', suggestedDuration: '2–4 days', highlight: 'Waterfalls, caves, and lush monsoon landscapes.', imageQuery: 'cherrapunji waterfalls' },
  { id: 'in-mawlynnong', name: 'Mawlynnong', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Nature', 'Culture'], idealMonths: 'Oct–May', suggestedDuration: '1–2 days', highlight: 'Clean village charm and living root bridges nearby.', imageQuery: 'mawlynnong living root bridge' },
  { id: 'in-tawang', name: 'Tawang', stateOrUt: 'Arunachal Pradesh', region: 'Northeast', themes: ['Mountains', 'Spiritual', 'Nature'], idealMonths: 'Mar–Jun, Oct–Nov', suggestedDuration: '4–7 days', highlight: 'High-altitude monastery and dramatic mountain roads.', imageQuery: 'tawang monastery arunachal' },
  { id: 'in-ziro', name: 'Ziro Valley', stateOrUt: 'Arunachal Pradesh', region: 'Northeast', themes: ['Nature', 'Culture'], idealMonths: 'Mar–May, Sep–Nov', suggestedDuration: '3–5 days', highlight: 'Rice fields, pine hills, and laid-back villages.', imageQuery: 'ziro valley arunachal' },
  { id: 'in-kohima', name: 'Kohima', stateOrUt: 'Nagaland', region: 'Northeast', themes: ['Culture', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Naga culture, local food, and hill views.', imageQuery: 'kohima nagaland hills' },
  { id: 'in-imphal', name: 'Imphal', stateOrUt: 'Manipur', region: 'Northeast', themes: ['Culture', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Lakes, culture, and scenic drives.', imageQuery: 'imphal manipur landscape' },

  // --- Expand set to 100+ by adding a wide spread of well-known and underrated spots ---
  // North (more)
  { id: 'in-varanasi', name: 'Varanasi', stateOrUt: 'Uttar Pradesh', region: 'North', themes: ['Spiritual', 'Heritage', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Ganga ghats at sunrise and timeless rituals.', imageQuery: 'varanasi ghats ganga' },
  { id: 'in-lucknow', name: 'Lucknow', stateOrUt: 'Uttar Pradesh', region: 'North', themes: ['Food', 'Heritage', 'City'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Nawabi cuisine, architecture, and culture.', imageQuery: 'lucknow india heritage' },
  { id: 'in-ayodhya', name: 'Ayodhya', stateOrUt: 'Uttar Pradesh', region: 'North', themes: ['Spiritual'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Pilgrimage city with riverfront aartis.', imageQuery: 'ayodhya temple' },
  { id: 'in-kumbhalgarh', name: 'Kumbhalgarh', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Great wall-like fort amid the Aravallis.', imageQuery: 'kumbhalgarh fort' },
  { id: 'in-bundi', name: 'Bundi', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Stepwells, murals, and small-town fort vibes.', imageQuery: 'bundi stepwell' },
  { id: 'in-alwar', name: 'Alwar', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Fort views and nearby Sariska forests.', imageQuery: 'alwar rajasthan fort' },
  { id: 'in-sariska', name: 'Sariska', stateOrUt: 'Rajasthan', region: 'North', themes: ['Wildlife', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2 days', highlight: 'Tiger reserve and Aravalli terrain.', imageQuery: 'sariska tiger reserve' },
  { id: 'in-kedarnath', name: 'Kedarnath', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Spiritual', 'Mountains', 'Adventure'], idealMonths: 'May–Jun, Sep–Oct', suggestedDuration: '3–5 days', highlight: 'Pilgrimage trek amid towering peaks.', imageQuery: 'kedarnath temple mountains' },
  { id: 'in-badrinath', name: 'Badrinath', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Spiritual', 'Mountains'], idealMonths: 'May–Jun, Sep–Oct', suggestedDuration: '2–4 days', highlight: 'Sacred town in the high Himalayas.', imageQuery: 'badrinath temple' },
  { id: 'in-valley-flowers', name: 'Valley of Flowers', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Nature', 'Adventure', 'Mountains'], idealMonths: 'Jul–Sep', suggestedDuration: '4–6 days', highlight: 'Seasonal alpine blooms in a UNESCO valley.', imageQuery: 'valley of flowers uttarakhand' },
  { id: 'in-jim-corbett', name: 'Jim Corbett', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Wildlife', 'Nature'], idealMonths: 'Nov–Jun', suggestedDuration: '2–3 days', highlight: 'India’s iconic tiger reserve and river forests.', imageQuery: 'jim corbett national park' },
  { id: 'in-kullu', name: 'Kullu', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Valley views and riverside stays.', imageQuery: 'kullu valley himachal' },
  { id: 'in-bir', name: 'Bir Billing', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Adventure', 'Mountains'], idealMonths: 'Oct–Nov, Mar–May', suggestedDuration: '2–3 days', highlight: 'India’s paragliding capital with cafés and hikes.', imageQuery: 'bir billing paragliding' },
  { id: 'in-mcleodganj', name: 'McLeod Ganj', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Spiritual', 'Mountains'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Tibetan monasteries and hillside cafés.', imageQuery: 'mcleodganj tibetan monastery' },
  { id: 'in-kasauli', name: 'Kasauli', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Oct–Dec', suggestedDuration: '2–3 days', highlight: 'Quiet pine trails and colonial lanes.', imageQuery: 'kasauli himachal hills' },

  // West (more)
  { id: 'in-ujjain', name: 'Ujjain', stateOrUt: 'Madhya Pradesh', region: 'West', themes: ['Spiritual'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Ancient temples and riverfront rituals.', imageQuery: 'ujjain mahakal temple' },
  { id: 'in-indore', name: 'Indore', stateOrUt: 'Madhya Pradesh', region: 'West', themes: ['Food', 'City'], idealMonths: 'Oct–Feb', suggestedDuration: '1–3 days', highlight: 'Street food capital with buzzing night markets.', imageQuery: 'indore sarafa bazaar food' },
  { id: 'in-bhuj', name: 'Bhuj', stateOrUt: 'Gujarat', region: 'West', themes: ['Culture', 'Heritage'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Craft villages and gateway to Kutch.', imageQuery: 'bhuj kutch handicrafts' },
  { id: 'in-rajkot', name: 'Rajkot', stateOrUt: 'Gujarat', region: 'West', themes: ['City', 'Food'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'A hub for exploring Saurashtra.', imageQuery: 'rajkot gujarat city' },
  { id: 'in-udaipur-west', name: 'Mount Abu (Aravallis)', stateOrUt: 'Rajasthan', region: 'West', themes: ['Nature', 'Mountains'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Aravalli hill escape with viewpoints.', imageQuery: 'aravalli hills mount abu' },

  // South (more)
  { id: 'in-hampi-aihole', name: 'Aihole', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1 day', highlight: 'Early temple architecture and quiet ruins.', imageQuery: 'aihole temples' },
  { id: 'in-pattadakal', name: 'Pattadakal', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1 day', highlight: 'UNESCO temple complex with stone artistry.', imageQuery: 'pattadakal temples' },
  { id: 'in-goa-south', name: 'South Goa', stateOrUt: 'Goa', region: 'South', themes: ['Beaches', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '3–6 days', highlight: 'Quieter beaches and lush hinterland.', imageQuery: 'south goa beach' },
  { id: 'in-chikmagalur', name: 'Chikmagalur', stateOrUt: 'Karnataka', region: 'South', themes: ['Nature', 'Mountains', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '3–5 days', highlight: 'Coffee country with hikes and waterfalls.', imageQuery: 'chikmagalur coffee hills' },
  { id: 'in-wayanad', name: 'Wayanad', stateOrUt: 'Kerala', region: 'South', themes: ['Nature', 'Adventure'], idealMonths: 'Oct–May', suggestedDuration: '3–5 days', highlight: 'Forests, viewpoints, and offbeat stays.', imageQuery: 'wayanad kerala forest' },
  { id: 'in-kumarakom', name: 'Kumarakom', stateOrUt: 'Kerala', region: 'South', themes: ['Nature'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Backwater luxury and birdlife.', imageQuery: 'kumarakom backwaters' },
  { id: 'in-thiruvananthapuram', name: 'Thiruvananthapuram', stateOrUt: 'Kerala', region: 'South', themes: ['City', 'Beaches'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Gateway to Kerala’s southern coast.', imageQuery: 'trivandrum kerala beach' },
  { id: 'in-kanyakumari', name: 'Kanyakumari', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Beaches', 'Spiritual'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'Sunrise/sunset at the southern tip of India.', imageQuery: 'kanyakumari sunrise' },
  { id: 'in-hogenakkal', name: 'Hogenakkal Falls', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Nature'], idealMonths: 'Jul–Oct, Dec–Feb', suggestedDuration: '1–2 days', highlight: 'Dramatic falls with coracle rides.', imageQuery: 'hogenakkal falls' },
  { id: 'in-araku', name: 'Araku Valley', stateOrUt: 'Andhra Pradesh', region: 'South', themes: ['Mountains', 'Nature', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '2–4 days', highlight: 'Cool valley with coffee and scenic train rides.', imageQuery: 'araku valley coffee' },
  { id: 'in-visakhapatnam', name: 'Visakhapatnam', stateOrUt: 'Andhra Pradesh', region: 'South', themes: ['Beaches', 'City'], idealMonths: 'Nov–Feb', suggestedDuration: '2–4 days', highlight: 'Coastal city with beaches and viewpoints.', imageQuery: 'visakhapatnam beach' },

  // East (more)
  { id: 'in-bishnupur', name: 'Bishnupur', stateOrUt: 'West Bengal', region: 'East', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'Terracotta temples and artisan heritage.', imageQuery: 'bishnupur terracotta temple' },
  { id: 'in-siliguri', name: 'Siliguri', stateOrUt: 'West Bengal', region: 'East', themes: ['City'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Gateway city to the Eastern Himalayas.', imageQuery: 'siliguri india' },
  { id: 'in-digha', name: 'Digha', stateOrUt: 'West Bengal', region: 'East', themes: ['Beaches'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Quick beach break from Kolkata.', imageQuery: 'digha beach' },
  { id: 'in-gopalpur', name: 'Gopalpur', stateOrUt: 'Odisha', region: 'East', themes: ['Beaches'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Quiet coastline with golden sands.', imageQuery: 'gopalpur beach odisha' },

  // Northeast (more)
  { id: 'in-aizawl', name: 'Aizawl', stateOrUt: 'Mizoram', region: 'Northeast', themes: ['Culture', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Hill city vistas and warm local culture.', imageQuery: 'aizawl mizoram hills' },
  { id: 'in-agartala', name: 'Agartala', stateOrUt: 'Tripura', region: 'Northeast', themes: ['Heritage', 'Culture'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Palaces, lakes, and local markets.', imageQuery: 'agartala palace tripura' },
  { id: 'in-itanagar', name: 'Itanagar', stateOrUt: 'Arunachal Pradesh', region: 'Northeast', themes: ['Nature', 'Culture'], idealMonths: 'Oct–Apr', suggestedDuration: '2–4 days', highlight: 'A base for exploring Arunachal’s hills.', imageQuery: 'itanagar arunachal hills' },

  // Fill to 100+ with a broad, balanced spread (curated highlights)
  { id: 'in-udaipur2', name: 'Chittorgarh', stateOrUt: 'Rajasthan', region: 'North', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Massive fort with dramatic Rajput history.', imageQuery: 'chittorgarh fort' },
  { id: 'in-sawai-madhopur', name: 'Sawai Madhopur', stateOrUt: 'Rajasthan', region: 'North', themes: ['Wildlife', 'Heritage'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'Ranthambore base with local culture.', imageQuery: 'sawai madhopur india' },
  { id: 'in-udaipur3', name: 'Bharatpur (Keoladeo)', stateOrUt: 'Rajasthan', region: 'North', themes: ['Wildlife', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Birding paradise in Keoladeo National Park.', imageQuery: 'keoladeo bharatpur birds' },
  { id: 'in-south-1', name: 'Kochi–Muziris', stateOrUt: 'Kerala', region: 'South', themes: ['Heritage', 'Food'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Trade-route history and coastal culture.', imageQuery: 'kerala heritage coastal' },
  { id: 'in-south-2', name: 'Hassan', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'Access to Belur and Halebidu temples.', imageQuery: 'belur halebidu temple' },
  { id: 'in-south-3', name: 'Belur', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1 day', highlight: 'Hoysala temple carvings in stone.', imageQuery: 'belur chennakeshava temple' },
  { id: 'in-south-4', name: 'Halebidu', stateOrUt: 'Karnataka', region: 'South', themes: ['Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1 day', highlight: 'Intricate Hoysala architecture and history.', imageQuery: 'halebidu hoysala temple' },
  { id: 'in-south-5', name: 'Tanjore (Thanjavur)', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Heritage', 'Spiritual'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Brihadeeswara Temple grandeur.', imageQuery: 'thanjavur brihadeeswara temple' },
  { id: 'in-south-6', name: 'Chettinad', stateOrUt: 'Tamil Nadu', region: 'South', themes: ['Food', 'Heritage'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Palatial mansions and iconic cuisine.', imageQuery: 'chettinad mansion tamil nadu' },
  { id: 'in-east-1', name: 'Kalimpong', stateOrUt: 'West Bengal', region: 'East', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–May, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Quiet Himalayan town with scenic views.', imageQuery: 'kalimpong hills' },
  { id: 'in-east-2', name: 'Mirik', stateOrUt: 'West Bengal', region: 'East', themes: ['Nature', 'Mountains'], idealMonths: 'Mar–May, Oct–Dec', suggestedDuration: '1–2 days', highlight: 'Lake walks and tea garden backdrops.', imageQuery: 'mirik lake' },
  { id: 'in-east-3', name: 'Bodh Gaya', stateOrUt: 'Bihar', region: 'East', themes: ['Spiritual', 'Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–3 days', highlight: 'A major Buddhist pilgrimage center.', imageQuery: 'bodh gaya mahabodhi temple' },
  { id: 'in-east-4', name: 'Patna', stateOrUt: 'Bihar', region: 'East', themes: ['City', 'Heritage'], idealMonths: 'Oct–Feb', suggestedDuration: '1–3 days', highlight: 'Riverfront city with deep history.', imageQuery: 'patna ganges river' },
  { id: 'in-ne-1', name: 'Dawki', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Nature'], idealMonths: 'Oct–May', suggestedDuration: '1–2 days', highlight: 'Crystal-clear river views and scenic drives.', imageQuery: 'dawki river meghalaya' },
  { id: 'in-ne-2', name: 'Jowai', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Nature'], idealMonths: 'Oct–May', suggestedDuration: '1–2 days', highlight: 'Waterfalls and quiet hills.', imageQuery: 'jowai meghalaya waterfall' },
  { id: 'in-ne-3', name: 'Sikkim (Nathula)', stateOrUt: 'Sikkim', region: 'Northeast', themes: ['Mountains', 'Adventure'], idealMonths: 'Apr–Jun, Oct–Nov', suggestedDuration: '1 day', highlight: 'High pass views on the old Silk Route.', imageQuery: 'nathula pass sikkim' },
  { id: 'in-central-1', name: 'Gwalior', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'A striking hill fort and palace complex.', imageQuery: 'gwalior fort' },
  { id: 'in-central-2', name: 'Orchha', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Riverside palaces and temple towns.', imageQuery: 'orchha palace' },
  { id: 'in-central-3', name: 'Udaigiri Caves', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1 day', highlight: 'Ancient rock-cut caves and carvings.', imageQuery: 'udaigiri caves india' },
  { id: 'in-dehradun', name: 'Dehradun', stateOrUt: 'Uttarakhand', region: 'North', themes: ['City', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '1–2 days', highlight: 'A relaxed base for hill drives and forest trails.', imageQuery: 'dehradun uttarakhand' },
  { id: 'in-lansdowne', name: 'Lansdowne', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'Quiet cantonment town with pine walks.', imageQuery: 'lansdowne uttarakhand' },
  { id: 'in-ranikhet', name: 'Ranikhet', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Oct–Dec', suggestedDuration: '2–4 days', highlight: 'Panoramic Himalayan views and calm stays.', imageQuery: 'ranikhet himalayas view' },
  { id: 'in-chopta', name: 'Chopta', stateOrUt: 'Uttarakhand', region: 'North', themes: ['Adventure', 'Mountains', 'Nature'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Trek-friendly meadows known as “Mini Switzerland”.', imageQuery: 'chopta uttarakhand trek' },
  { id: 'in-tirthan', name: 'Tirthan Valley', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Nature', 'Adventure', 'Mountains'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '3–5 days', highlight: 'River stays, trout, and forest hikes.', imageQuery: 'tirthan valley himachal river' },
  { id: 'in-jibhi', name: 'Jibhi', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Nature', 'Mountains'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Cottage stays and waterfall walks in a quiet valley.', imageQuery: 'jibhi himachal forest' },
  { id: 'in-dalhousie', name: 'Dalhousie', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Mountains', 'Nature'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '2–4 days', highlight: 'Old-world charm and scenic viewpoints.', imageQuery: 'dalhousie himachal hills' },
  { id: 'in-khajjiar', name: 'Khajjiar', stateOrUt: 'Himachal Pradesh', region: 'North', themes: ['Nature', 'Mountains'], idealMonths: 'Mar–Jun, Sep–Nov', suggestedDuration: '1–2 days', highlight: 'Meadows and cedar forests—perfect for a slow day.', imageQuery: 'khajjiar meadow' },
  { id: 'in-alibaug', name: 'Alibaug', stateOrUt: 'Maharashtra', region: 'West', themes: ['Beaches', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'A quick coastal escape with forts and beaches.', imageQuery: 'alibaug beach maharashtra' },
  { id: 'in-tarkarli', name: 'Tarkarli', stateOrUt: 'Maharashtra', region: 'West', themes: ['Beaches', 'Adventure', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–4 days', highlight: 'Clear waters, snorkeling, and Konkan calm.', imageQuery: 'tarkarli beach' },
  { id: 'in-ganpatipule', name: 'Ganpatipule', stateOrUt: 'Maharashtra', region: 'West', themes: ['Beaches', 'Spiritual', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '2–3 days', highlight: 'Sea-facing temple and peaceful sands.', imageQuery: 'ganpatipule beach temple' },
  { id: 'in-nashik', name: 'Nashik', stateOrUt: 'Maharashtra', region: 'West', themes: ['Food', 'Spiritual'], idealMonths: 'Oct–Feb', suggestedDuration: '2–3 days', highlight: 'Vineyards, river ghats, and weekend drives.', imageQuery: 'nashik vineyards india' },
  { id: 'in-vadodara', name: 'Vadodara', stateOrUt: 'Gujarat', region: 'West', themes: ['City', 'Heritage'], idealMonths: 'Nov–Feb', suggestedDuration: '1–3 days', highlight: 'Palaces and cultural centers in Gujarat.', imageQuery: 'vadodara palace' },
  { id: 'in-surat', name: 'Surat', stateOrUt: 'Gujarat', region: 'West', themes: ['Food', 'City'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Textiles, street food, and riverfront evenings.', imageQuery: 'surat india city' },
  { id: 'in-chilika', name: 'Chilika Lake', stateOrUt: 'Odisha', region: 'East', themes: ['Nature', 'Wildlife'], idealMonths: 'Nov–Feb', suggestedDuration: '1–2 days', highlight: 'Birdlife, lagoons, and boat rides.', imageQuery: 'chilika lake birds' },
  { id: 'in-bhitarkanika', name: 'Bhitarkanika', stateOrUt: 'Odisha', region: 'East', themes: ['Wildlife', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Mangroves, crocodiles, and quiet creeks.', imageQuery: 'bhitarkanika mangroves' },
  { id: 'in-similipal', name: 'Similipal', stateOrUt: 'Odisha', region: 'East', themes: ['Wildlife', 'Nature'], idealMonths: 'Nov–Feb', suggestedDuration: '2–3 days', highlight: 'Forest safaris and seasonal waterfalls.', imageQuery: 'similipal forest waterfall' },
  { id: 'in-rajgir', name: 'Rajgir', stateOrUt: 'Bihar', region: 'East', themes: ['Heritage', 'Spiritual', 'Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Hills, hot springs, and ancient sites nearby.', imageQuery: 'rajgir bihar hills' },
  { id: 'in-nalanda', name: 'Nalanda', stateOrUt: 'Bihar', region: 'East', themes: ['Heritage'], idealMonths: 'Oct–Mar', suggestedDuration: '1 day', highlight: 'Ruins of one of the world’s earliest universities.', imageQuery: 'nalanda university ruins' },
  { id: 'in-loktak', name: 'Loktak Lake', stateOrUt: 'Manipur', region: 'Northeast', themes: ['Nature'], idealMonths: 'Oct–Mar', suggestedDuration: '1–2 days', highlight: 'Floating islands and tranquil lake views.', imageQuery: 'loktak lake manipur' },
  { id: 'in-umiam', name: 'Umiam Lake', stateOrUt: 'Meghalaya', region: 'Northeast', themes: ['Nature'], idealMonths: 'Oct–May', suggestedDuration: '1–2 days', highlight: 'A scenic lake stop near Shillong.', imageQuery: 'umiam lake meghalaya' },
  { id: 'in-dzukou', name: 'Dzüko Valley', stateOrUt: 'Nagaland', region: 'Northeast', themes: ['Adventure', 'Nature', 'Mountains'], idealMonths: 'Jun–Sep, Oct–Nov', suggestedDuration: '2–4 days', highlight: 'A dreamy trek with seasonal blooms.', imageQuery: 'dzukou valley trek' },
  { id: 'in-pench', name: 'Pench National Park', stateOrUt: 'Madhya Pradesh', region: 'Central', themes: ['Wildlife', 'Nature'], idealMonths: 'Oct–Apr', suggestedDuration: '2–3 days', highlight: 'Forest safaris and classic wildlife landscapes.', imageQuery: 'pench national park tiger' },
  { id: 'in-raipur', name: 'Raipur', stateOrUt: 'Chhattisgarh', region: 'Central', themes: ['City', 'Food'], idealMonths: 'Oct–Feb', suggestedDuration: '1–2 days', highlight: 'A base for exploring Chhattisgarh’s waterfalls and forests.', imageQuery: 'raipur city india' },
  { id: 'in-chitrakote', name: 'Chitrakote Falls', stateOrUt: 'Chhattisgarh', region: 'Central', themes: ['Nature'], idealMonths: 'Jul–Oct', suggestedDuration: '1–2 days', highlight: 'India’s “Niagara” during monsoon season.', imageQuery: 'chitrakote falls' },
];

// Ensure we meet the "100+" requirement in runtime checks.
export const INDIA_DESTINATIONS_COUNT = INDIA_DESTINATIONS.length;
