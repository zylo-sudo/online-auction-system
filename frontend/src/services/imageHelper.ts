// High-Resolution Product Photography Helper for Auctions

export const PRESET_IMAGES = [
  {
    name: 'CTF Pink Star Diamond',
    url: '/items_photo/Jewelry/CTF Pink Star Diamond.webp',
    category: 'Jewelry'
  },
  {
    name: 'The Oppenheimer Blue',
    url: '/items_photo/Jewelry/The Oppenheimer Blue.jpg',
    category: 'Jewelry'
  },
  {
    name: 'The Williamson Pink Star',
    url: '/items_photo/Jewelry/The Williamson Pink Star.jpg',
    category: 'Jewelry'
  },
  {
    name: 'The Winston Pink Legacy',
    url: '/items_photo/Jewelry/The Winston Pink Legacy.webp',
    category: 'Jewelry'
  },
  {
    name: 'Grandmaster Chime 6300A',
    url: '/items_photo/Experiences, Homeware & Luxury Fashion/Patek Philippe Grandmaster Chime 6300A-010.webp',
    category: 'Experiences, Homeware & Luxury Fashion'
  },
  {
    name: 'Blue Origin Space Flight',
    url: '/items_photo/Experiences, Homeware & Luxury Fashion/Blue Origin New Shepard 1st Flight Seat.jpg',
    category: 'Experiences, Homeware & Luxury Fashion'
  },
  {
    name: 'Hermès Diamond Himalaya Birkin 30',
    url: '/items_photo/Experiences, Homeware & Luxury Fashion/Hermes Diamond Himalaya Birkin 30.jpg',
    category: 'Experiences, Homeware & Luxury Fashion'
  },
  {
    name: "David Gilmour 'Black Strat'",
    url: '/items_photo/Autographed Music Memorabilia/David Gilmours Black Strat.jpg',
    category: 'Autographed Music Memorabilia'
  },
  {
    name: 'Jerry Garcia Tiger Guitar',
    url: '/items_photo/Autographed Music Memorabilia/Jerry Garcias Tiger Guitar.png',
    category: 'Autographed Music Memorabilia'
  },
  {
    name: '1952 Mickey Mantle Card',
    url: '/items_photo/Autographed Sports Memorabilia & Game Tickets/1952 Topps Mickey Mantle #311 (SGC 9.5).jpg',
    category: 'Autographed Sports Memorabilia & Game Tickets'
  },
  {
    name: 'Michael Jordan 1998 Finals Jersey',
    url: '/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan 1998 Last Dance Game 1 NBA Finals Jersey.jpg',
    category: 'Autographed Sports Memorabilia & Game Tickets'
  },
  {
    name: 'Diego Maradona Hand of God Shirt',
    url: '/items_photo/Autographed Sports Memorabilia & Game Tickets/Diego Maradona 1986 Hand of God Argentina Shirt.jpg',
    category: 'Autographed Sports Memorabilia & Game Tickets'
  },
  {
    name: 'Shohei Ohtani 50/50 Baseball',
    url: '/items_photo/Autographed Sports Memorabilia & Game Tickets/Shohei Ohtani 50-50 Home Run Baseball.webp',
    category: 'Autographed Sports Memorabilia & Game Tickets'
  },
  {
    name: 'Rolex Daytona (Panda)',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    category: 'Watches & Luxury'
  },
  {
    name: 'Apple Vision Pro',
    url: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80',
    category: 'Electronics'
  }
];

export const getItemImage = (auction: {
  title?: string;
  category?: string;
  image_url?: string;
}): string => {
  if (auction.image_url && auction.image_url.trim().length > 3) {
    return auction.image_url.trim();
  }

  const title = (auction.title || '').toLowerCase();
  const category = (auction.category || '').toLowerCase();

  // Jewelry Matches
  if (title.includes('pink star') && title.includes('ctf')) {
    return '/items_photo/Jewelry/CTF Pink Star Diamond.webp';
  }
  if (title.includes('williamson')) {
    return '/items_photo/Jewelry/The Williamson Pink Star.jpg';
  }
  if (title.includes('oppenheimer')) {
    return '/items_photo/Jewelry/The Oppenheimer Blue.jpg';
  }
  if (title.includes('de beers')) {
    return '/items_photo/Jewelry/The De Beers Blue.jpg';
  }
  if (title.includes('winston pink')) {
    return '/items_photo/Jewelry/The Winston Pink Legacy.webp';
  }
  if (title.includes('blue moon') || title.includes('josephine')) {
    return '/items_photo/Jewelry/The Blue Moon of Josephine.jpg';
  }
  if (title.includes('graff pink')) {
    return '/items_photo/Jewelry/The Graff Pink.jpg';
  }
  if (title.includes('marie antoinette') || title.includes('pendant') || title.includes('pearl')) {
    return '/items_photo/Jewelry/Marie Antoinettes Pearl Pendant.jpg';
  }

  // Experiences & Luxury Homeware
  if (title.includes('badminton')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/The Badminton Cabinet.webp';
  }
  if (title.includes('blue origin') || title.includes('shepard') || title.includes('space')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Blue Origin New Shepard 1st Flight Seat.jpg';
  }
  if (title.includes('grandmaster chime') || title.includes('6300a')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Patek Philippe Grandmaster Chime 6300A-010.webp';
  }
  if (title.includes('buffett') || title.includes('power lunch')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Warren Buffett Annual Charity Power Lunch.png';
  }
  if (title.includes('birkin') || title.includes('herm')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Hermes Diamond Himalaya Birkin 30.jpg';
  }
  if (title.includes('zeppelin') || title.includes('backstage')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Led Zeppelin 2007 O2 Reunion VIP Backstage Passes.webp';
  }

  // Music Memorabilia
  if (title.includes('gilmour') || title.includes('black strat')) {
    return '/items_photo/Autographed Music Memorabilia/David Gilmours Black Strat.jpg';
  }
  if (title.includes('garcia') || title.includes('tiger')) {
    return '/items_photo/Autographed Music Memorabilia/Jerry Garcias Tiger Guitar.png';
  }
  if (title.includes('cobain') && (title.includes('mustang') || title.includes('teen spirit'))) {
    return '/items_photo/Autographed Music Memorabilia/Kurt Cobain 1969 Smells Like Teen Spirit Fender Mustang.jpg';
  }
  if (title.includes('cobain') || title.includes('unplugged') || title.includes('d-18e')) {
    return '/items_photo/Autographed Music Memorabilia/Kurt Cobain 1959 Martin D-18E MTV Unplugged.jpg';
  }
  if (title.includes('clapton') || title.includes('000-42')) {
    return '/items_photo/Autographed Music Memorabilia/Eric Clapton 1939 Martin 000-42.jpg';
  }
  if (title.includes('lennon') || title.includes('broadwood') || title.includes('piano')) {
    return '/items_photo/Autographed Music Memorabilia/John Lennon Broadwood Upright Piano.jpg';
  }
  if (title.includes('ringo') || title.includes('drum head') || title.includes('ed sullivan')) {
    return '/items_photo/Autographed Music Memorabilia/Ringo Starr Beatles Ed Sullivan Drum Head.jpg';
  }
  if (title.includes('dylan') || title.includes('changin')) {
    return '/items_photo/Autographed Music Memorabilia/Bob Dylan Handwritten The Times They Are A-Changin Lyrics.jpg';
  }

  // Sports Memorabilia
  if (title.includes('mickey mantle') || title.includes('topps')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/1952 Topps Mickey Mantle #311 (SGC 9.5).jpg';
  }
  if (title.includes('last dance') || (title.includes('jordan') && title.includes('jersey'))) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan 1998 Last Dance Game 1 NBA Finals Jersey.jpg';
  }
  if (title.includes('jordan') && title.includes('ticket')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan NBA Debut Ticket Stub.jpg';
  }
  if (title.includes('maradona') || title.includes('hand of god')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Diego Maradona 1986 Hand of God Argentina Shirt.jpg';
  }
  if (title.includes('manifesto') || title.includes('coubertin') || title.includes('olympic')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Pierre de Coubertin 1892 Olympic Manifesto.jpg';
  }
  if (title.includes('kobe') || title.includes('bryant')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Kobe Bryant 2007-08 Signed MVP Game-Worn Jersey.jpg';
  }
  if (title.includes('babe ruth') || title.includes('ruth')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Babe Ruth 1927-1930 New York Yankees Jersey.jpg';
  }
  if (title.includes('ohtani') || title.includes('50/50') || title.includes('50-50') || title.includes('baseball')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Shohei Ohtani 50-50 Home Run Baseball.webp';
  }

  // Original items
  if (title.includes('rolex') || title.includes('daytona') || title.includes('panda')) {
    return 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('patek') || title.includes('nautilus')) {
    return 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('vision pro') || title.includes('apple')) {
    return 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('rtx') || title.includes('gaming rig')) {
    return 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('katana') || title.includes('cyberpunk')) {
    return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80';
  }
  if (title.includes('shelby') || title.includes('eleanor') || title.includes('gt500')) {
    return 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80';
  }

  // Category fallbacks
  if (category.includes('jewelry') || category.includes('gem')) {
    return '/items_photo/Jewelry/CTF Pink Star Diamond.webp';
  }
  if (category.includes('music')) {
    return '/items_photo/Autographed Music Memorabilia/David Gilmours Black Strat.jpg';
  }
  if (category.includes('sport')) {
    return '/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan 1998 Last Dance Game 1 NBA Finals Jersey.jpg';
  }
  if (category.includes('fashion') || category.includes('homeware') || category.includes('experience')) {
    return '/items_photo/Experiences, Homeware & Luxury Fashion/Hermes Diamond Himalaya Birkin 30.jpg';
  }

  return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
};
