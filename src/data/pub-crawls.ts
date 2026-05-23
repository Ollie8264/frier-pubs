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
];
