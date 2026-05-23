/**
 * Curated London pub crawls — the "Pint Path" section of Discover.
 *
 * Each crawl is a sequence of named stops in walking order. We try to
 * match each stop to our existing pub data at render time; missing
 * matches still render as a stop but without the link/photo.
 */

export interface CrawlStop {
  /** Pub name to match against pubs.json — usually starts with "The " */
  name: string;
  /** What to do/order at this stop (optional) */
  note?: string;
}

export interface PubCrawl {
  id: string;
  name: string;
  blurb: string;          // short one-liner
  description: string;    // 2-3 sentences
  vibe: string[];
  /** Total walking distance in km */
  distanceKm: number;
  /** Realistic duration in hours (allowing drinking, not just walking) */
  hours: number;
  /** Stops in order */
  stops: CrawlStop[];
  /** Centre of the crawl — used for the route map */
  center: { lat: number; lng: number };
  /** Tube/rail station to meet at */
  meetAt: string;
}

export const PUB_CRAWLS: PubCrawl[] = [
  {
    id: "bermondsey-beer-mile",
    name: "Bermondsey Beer Mile",
    blurb: "Indie breweries under railway arches, Saturday only",
    description:
      "A linear crawl along the Southern Rail viaduct between South Bermondsey and London Bridge. Most stops are taproom-only and only open weekend afternoons — go early, pace yourself, eat at Maltby Street.",
    vibe: ["Craft beer", "Saturday only", "Brewery tours", "Industrial chic"],
    distanceKm: 2.4,
    hours: 4,
    stops: [
      { name: "Fourpure Brewing Co", note: "Start here — easiest from South Bermondsey station" },
      { name: "Partizan Brewing" },
      { name: "Brew By Numbers", note: "Two locations — go for the Enid Street one" },
      { name: "The Kernel Brewery", note: "Famous IPAs, takeaway bottles for the journey home" },
      { name: "Anspach & Hobday", note: "Try the Porter" },
      { name: "Southwark Brewing Co" },
      { name: "Maltby Street Market", note: "Finish with street food + extra drinks" },
    ],
    center: { lat: 51.4978, lng: -0.0738 },
    meetAt: "South Bermondsey or London Bridge",
  },
  {
    id: "borough-historic",
    name: "Borough Market & The South Bank Classics",
    blurb: "Five historic pubs in a 10-minute walking radius",
    description:
      "Borough Market's surrounds pack more proper historic pubs per square metre than anywhere else in London. Mix of galleried coaching inns, market traders' regulars and one shrine to real ale.",
    vibe: ["Historic", "Food market", "Real ale", "Galleried inn", "Riverside"],
    distanceKm: 1.0,
    hours: 3,
    stops: [
      { name: "Southwark Tavern", note: "Big airy boozer just outside the market" },
      { name: "Market Porter", note: "The classic — opens 6am for market traders" },
      { name: "The Rake", note: "Tiny craft beer specialist (10+ taps in a shoebox)" },
      { name: "George Inn", note: "Last galleried coaching inn in London (NT-owned)" },
      { name: "The Anchor", note: "Riverside terrace, finish here for the view" },
    ],
    center: { lat: 51.5054, lng: -0.0905 },
    meetAt: "London Bridge",
  },
  {
    id: "soho-heritage",
    name: "Soho Heritage Pub Crawl",
    blurb: "Compact wander through Soho's most characterful drinking dens",
    description:
      "Five legendary Soho pubs in 800m. The French House serves drinks only in halves (a Soho tradition). The Coach & Horses banned mobile phones long before that was fashionable. Each one is a story.",
    vibe: ["Heritage", "Iconic", "Theatre crowd", "Compact", "Eccentric"],
    distanceKm: 0.8,
    hours: 3,
    stops: [
      { name: "The French House", note: "Halves only. Order a pint and they'll send you out" },
      { name: "Coach and Horses", note: "Norman the legendary landlord's old place" },
      { name: "The Dog and Duck", note: "Tiny, tiled, Orwell drank here" },
      { name: "The John Snow", note: "Named after the doctor not the singer" },
      { name: "Lyric", note: "Big back room, often the final stop" },
    ],
    center: { lat: 51.5128, lng: -0.1340 },
    meetAt: "Tottenham Court Road or Leicester Square",
  },
  {
    id: "fleet-street-legal",
    name: "Fleet Street's Lost Newspaper Pubs",
    blurb: "The drinking holes that bankrolled British journalism",
    description:
      "When Fleet Street was the home of the British press, every pub had a phone for filing copy and a back room for editors. The journalists have gone but the pubs are still there, and they're some of the oldest in London.",
    vibe: ["Historic", "Literary", "Real ale", "Wood-panelled", "Old City"],
    distanceKm: 1.0,
    hours: 3,
    stops: [
      { name: "Ye Olde Cheshire Cheese", note: "Rebuilt 1667. Dickens drank here. So did Mark Twain." },
      { name: "The Tipperary", note: "Allegedly the first Irish pub in England" },
      { name: "The Punch Tavern", note: "Where Punch magazine was founded over lunch" },
      { name: "The Old Bell Tavern", note: "Built for Christopher Wren's stonemasons" },
      { name: "The Black Friar", note: "Wedge-shaped Art Nouveau gem opposite the station" },
    ],
    center: { lat: 51.5145, lng: -0.1057 },
    meetAt: "Chancery Lane or Blackfriars",
  },
  {
    id: "hampstead-village",
    name: "Hampstead Heath Country Crawl",
    blurb: "Real fires, dog walkers and proper Sunday roasts",
    description:
      "Three pubs that feel more Cotswolds than London. Best done as a Sunday afternoon walk between Hampstead and Highgate, looping across the Heath. Wear something muddy.",
    vibe: ["Village pubs", "Dog-friendly", "Real fire", "Heath walks", "Sunday roast"],
    distanceKm: 3.2,
    hours: 4,
    stops: [
      { name: "The Spaniards Inn", note: "1585. Dickens, Keats, Byron. Best beer garden in NW3." },
      { name: "The Holly Bush", note: "Hidden up a backstreet. Roaring fire in winter." },
      { name: "The Flask", note: "Hampstead's village local, Young's-owned" },
      { name: "The Magdala", note: "Famous (or infamous) — finish here" },
    ],
    center: { lat: 51.5562, lng: -0.1762 },
    meetAt: "Hampstead tube",
  },
  {
    id: "greenwich-maritime",
    name: "Greenwich Maritime Crawl",
    blurb: "Riverside pubs with views of the Cutty Sark",
    description:
      "Greenwich's pubs all face the Thames or the Royal Naval College. Start by the river, work towards the park. Plenty of food en route. Bring a hat if it's sunny.",
    vibe: ["Riverside", "Tourist-friendly", "Historic", "Naval", "Family-friendly"],
    distanceKm: 1.5,
    hours: 3,
    stops: [
      { name: "Cutty Sark", note: "Riverside terrace, named after the ship" },
      { name: "The Trafalgar Tavern", note: "Royal-connected, white-painted Georgian classic" },
      { name: "The Gipsy Moth", note: "Right next to Cutty Sark ship — touristy but solid" },
      { name: "The Plume of Feathers", note: "Greenwich's oldest pub (1691). Tucked behind Park Row." },
    ],
    center: { lat: 51.4825, lng: 0.0030 },
    meetAt: "Greenwich (DLR/National Rail)",
  },
  {
    id: "mayfair-hidden",
    name: "Mayfair's Hidden Drinking Dens",
    blurb: "Quiet old pubs tucked behind Mayfair's shopfronts",
    description:
      "Mayfair has the smartest postcode but the pubs are surprisingly down-to-earth. The Audley does an Egon Ronay sandwich, The Guinea Grill is famous for its pies, and The Punch Bowl was owned by Guy Ritchie. All within a 7-minute walk of each other.",
    vibe: ["Smart", "Old-school", "Pies", "Mews streets", "Wealthy crowd"],
    distanceKm: 0.9,
    hours: 3,
    stops: [
      { name: "The Guinea Grill", note: "Pies + Young's. Tiny, you might wait" },
      { name: "The Punch Bowl", note: "Off Berkeley Square, hidden in a mews" },
      { name: "The Audley", note: "Recently refurbed, now smart-casual" },
      { name: "Coach and Horses", note: "Bruton Street one — Beatles-era hangout" },
      { name: "The Footman", note: "Charles Street, end here for late dinner" },
    ],
    center: { lat: 51.5089, lng: -0.1500 },
    meetAt: "Green Park or Bond Street",
  },
  {
    id: "camden-canal",
    name: "Camden Canal Crawl",
    blurb: "Regent's Canal-side pubs from Camden Lock to Primrose Hill",
    description:
      "Follow Regent's Canal west from Camden Lock through to Primrose Hill. Each pub is either on the canal or 30 seconds off it. Best done as a Saturday afternoon when the market is packed.",
    vibe: ["Canal-side", "Markets", "Live music", "Indie", "Sunny garden"],
    distanceKm: 2.5,
    hours: 4,
    stops: [
      { name: "The Hawley Arms", note: "Amy Winehouse's old local — still indie/rock vibe" },
      { name: "The Lock Tavern", note: "Rooftop terrace, DJs at weekends" },
      { name: "Edinboro Castle", note: "Massive beer garden — the destination on sunny days" },
      { name: "The Spread Eagle", note: "Properly old-school boozer" },
      { name: "The Pembroke Castle", note: "Primrose Hill end, sunny corner pub" },
    ],
    center: { lat: 51.5408, lng: -0.1483 },
    meetAt: "Camden Town tube",
  },
  {
    id: "belgravia-mews",
    name: "Belgravia Mews Pub Crawl",
    blurb: "Tiny smart pubs hidden in Belgravia's cobbled mews",
    description:
      "Belgravia's pubs are mostly tucked in mews behind the white-stucco townhouses. The Grenadier is famous for its haunted ghost, The Star for its bottle list, The Nag's Head for being the smallest pub in central London. All within 600m.",
    vibe: ["Smart", "Mews", "Tiny", "Cobbled streets", "Hidden gems"],
    distanceKm: 0.6,
    hours: 3,
    stops: [
      { name: "The Grenadier", note: "Allegedly haunted by a guardsman flogged to death" },
      { name: "The Star Tavern", note: "Said to be where the Great Train Robbery was planned" },
      { name: "The Nag's Head", note: "Pre-decimal currency only on the games. No phones." },
      { name: "The Antelope", note: "Eaton Terrace — Young's-owned classic" },
    ],
    center: { lat: 51.4988, lng: -0.1520 },
    meetAt: "Hyde Park Corner or Knightsbridge",
  },
  {
    id: "spitalfields-brick-lane",
    name: "Spitalfields & Brick Lane",
    blurb: "East End traders' boozers + the city's prettiest pub",
    description:
      "Spitalfields' pubs are an interesting mix — old market trader haunts (Pride of Spitalfields) plus famous historic spots (The Ten Bells, with Jack the Ripper connections). Pair with a curry on Brick Lane or salt beef beigels at Beigel Bake.",
    vibe: ["East End", "Markets", "Historic", "Late-night", "Curry adjacent"],
    distanceKm: 1.1,
    hours: 3,
    stops: [
      { name: "Pride of Spitalfields", note: "Hidden down Heneage Street. Cat called Lenny." },
      { name: "The Ten Bells", note: "Jack the Ripper era. Now a busy modern boozer." },
      { name: "The Crown and Shuttle", note: "Wonderful beer garden in summer" },
      { name: "Owl & Pussycat", note: "Redchurch Street — gastro side, good Sunday roast" },
      { name: "The Carpenter's Arms", note: "The Krays bought this for their mum. No joke." },
    ],
    center: { lat: 51.5202, lng: -0.0727 },
    meetAt: "Liverpool Street or Aldgate East",
  },
  {
    id: "westminster-politicos",
    name: "Westminster's Political Pubs",
    blurb: "Where MPs, journalists and civil servants drink",
    description:
      "The pubs around Whitehall and Westminster have been the unofficial Parliament for centuries. The Red Lion is rumoured to have a division bell that rings when MPs need to vote. Wear something smart and listen carefully.",
    vibe: ["Politicos", "Heritage", "Suits", "Wood-panelled", "Insider gossip"],
    distanceKm: 1.0,
    hours: 3,
    stops: [
      { name: "The Red Lion", note: "Parliament Street — division bell rings here" },
      { name: "The Westminster Arms", note: "MPs' favourite when the Red Lion is rammed" },
      { name: "The Two Chairmen", note: "Dark wood, narrow snug, oldest in Westminster" },
      { name: "The Sherlock Holmes", note: "Pure tourist trap but the upstairs is OK" },
      { name: "The Old Shades", note: "Tucked behind Trafalgar Square — quiet by 7pm" },
    ],
    center: { lat: 51.5023, lng: -0.1268 },
    meetAt: "Westminster or Charing Cross",
  },
  {
    id: "clerkenwell-foodie",
    name: "Clerkenwell Foodie Pub Crawl",
    blurb: "Where gastropubs were invented + cocktail bars to finish",
    description:
      "The Eagle on Farringdon Road is widely credited as the first gastropub in the UK (1991). The vibe has spread across Clerkenwell — proper kitchens, no-reservations policies, and pub food worth queuing for. Three pubs, one cocktail bar.",
    vibe: ["Gastropub", "Foodie", "Cocktails", "Modern", "Weekday crowd"],
    distanceKm: 1.0,
    hours: 4,
    stops: [
      { name: "The Eagle", note: "The original gastropub. Chalkboard menu, no reservations" },
      { name: "The Jerusalem Tavern", note: "Tiny St Peter's Brewery tap. Looks 17th century, was actually 1996" },
      { name: "Three Kings", note: "Cosy local around the corner from Clerkenwell Green" },
      { name: "The Sekforde", note: "Beautiful Victorian dining room. Book ahead for food." },
    ],
    center: { lat: 51.5234, lng: -0.1066 },
    meetAt: "Farringdon",
  },
  {
    id: "islington-upper-street",
    name: "Islington & Upper Street",
    blurb: "Upper Street's strip of pre-theatre boozers",
    description:
      "Upper Street is a near-continuous line of pubs from Angel to Highbury Corner. Mix of pre-theatre crowd (Almeida just off Upper St), young professionals and Arsenal fans on match days. Worth doing as a north-bound walk.",
    vibe: ["Young crowd", "Theatre crowd", "Long strip", "Friday night", "Sunday roast"],
    distanceKm: 1.6,
    hours: 4,
    stops: [
      { name: "The Camden Head", note: "Camden Passage — antiques market beer garden" },
      { name: "The Old Queen's Head", note: "DJ nights, decent food" },
      { name: "The York", note: "Bigger boozer, the loud one in this list" },
      { name: "The Hope & Anchor", note: "Upstairs gig venue, downstairs proper pub" },
      { name: "The Marquess Tavern", note: "Quiet end near Canonbury — proper roasts" },
    ],
    center: { lat: 51.5375, lng: -0.1027 },
    meetAt: "Angel tube",
  },
  {
    id: "wapping-riverside",
    name: "Wapping & Limehouse Riverside",
    blurb: "Smugglers' pubs along the Thames Path, east of Tower Bridge",
    description:
      "The Wapping waterfront has the most authentic riverside pubs in London. The Prospect of Whitby (1520) is the oldest. The Grapes was owned by Gandalf actor Ian McKellen until recently. Lots of cobbles, cold air off the river, fewer tourists than Bankside.",
    vibe: ["Riverside", "Historic", "Smugglers", "Cobblestones", "Sunset views"],
    distanceKm: 2.5,
    hours: 4,
    stops: [
      { name: "The Town of Ramsgate", note: "1460s. Hanging dock where pirates were executed." },
      { name: "Captain Kidd", note: "Named after the pirate. Riverside beer garden." },
      { name: "Prospect of Whitby", note: "1520. London's oldest riverside pub." },
      { name: "The Narrow", note: "Modern gastropub by Gordon Ramsay, on Limehouse Basin" },
      { name: "The Grapes", note: "Ian McKellen's old pub. Tiny, perfect, river views from the back deck." },
    ],
    center: { lat: 51.5067, lng: -0.0476 },
    meetAt: "Wapping (Overground)",
  },
  {
    id: "notting-hill-gastropubs",
    name: "Notting Hill Gastropub Crawl",
    blurb: "West London's gastropub heartland",
    description:
      "Notting Hill is gastropub central — proper kitchens, gardens, weekend roasts that genuinely justify the £25 price tag. Best done as a long Saturday lunch crawling outwards from Portobello Road.",
    vibe: ["Gastropub", "Sunday roast", "Pretty streets", "Weekend lunch", "Antiques nearby"],
    distanceKm: 1.7,
    hours: 4,
    stops: [
      { name: "The Cow", note: "Westbourne Park Road — oysters + Guinness institution" },
      { name: "Walmer Castle", note: "Smart upstairs dining room, great beer garden" },
      { name: "The Pelican", note: "Newer, all natural wine — for the dressier crowd" },
      { name: "The Cock and Bottle", note: "Pretty corner pub on Needham Road" },
      { name: "The Churchill Arms", note: "Famous for the flowers covering the facade. Thai food in the back." },
    ],
    center: { lat: 51.5135, lng: -0.2046 },
    meetAt: "Notting Hill Gate",
  },
  {
    id: "marylebone-village",
    name: "Marylebone Village Pub Crawl",
    blurb: "Quiet smart pubs north of Oxford Street",
    description:
      "Marylebone gets ignored for drinking because Oxford Street steals all the attention, but its village section is full of proper pubs with proper food. Compact, walkable, less rowdy than Soho.",
    vibe: ["Village", "Smart", "Foodie", "Quiet", "Weekday"],
    distanceKm: 0.9,
    hours: 3,
    stops: [
      { name: "The Marylebone", note: "Marylebone Lane corner — busy by 5pm" },
      { name: "The Coach Makers Arms", note: "Three storeys, top floor for dinner" },
      { name: "The Volunteer", note: "Baker Street — wood-panelled, big enough never to feel rammed" },
      { name: "The Golden Eagle", note: "Marylebone Lane — piano singalongs Thurs/Fri" },
      { name: "The Beehive", note: "Crawford Street — small, locals-only feel" },
    ],
    center: { lat: 51.5176, lng: -0.1480 },
    meetAt: "Bond Street or Baker Street",
  },
  {
    id: "city-historic",
    name: "City of London Historic Pubs",
    blurb: "Centuries-old taverns inside the Square Mile",
    description:
      "The Square Mile is dotted with pubs that survived the Great Fire (some literally rebuilt the morning after). Best done on a weekday lunchtime when the City is working and the pubs are properly busy. Weekends they're closed or empty.",
    vibe: ["Historic", "City suits", "Real ale", "Weekday only", "Wood-panelled"],
    distanceKm: 1.4,
    hours: 3,
    stops: [
      { name: "Ye Olde Mitre", note: "1546. Tucked down an alley behind Hatton Garden." },
      { name: "Old Doctor Butler's Head", note: "1610. Named after James I's quack doctor." },
      { name: "Ye Olde Watling", note: "Rebuilt 1668 by Christopher Wren. Cosy upstairs." },
      { name: "The Hand & Shears", note: "Smithfield. Used by the Bartholomew Fair court for sentencing." },
      { name: "Hoop & Grapes", note: "1721. Only timber-framed building in the City." },
    ],
    center: { lat: 51.5160, lng: -0.0930 },
    meetAt: "Farringdon or St Paul's",
  },
];
