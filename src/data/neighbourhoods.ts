/**
 * Curated London drinking neighbourhoods.
 *
 * Each neighbourhood points users at a particular vibe — for the "I don't
 * know where to go" Discover page. Tapping one drills into the main map
 * filtered to that area.
 */

export interface Neighbourhood {
  id: string;
  name: string;
  blurb: string;          // one-liner, shows on card
  description: string;    // 2-3 sentences, shown when expanded
  vibe: string[];         // 3-5 short tags
  bestFor: string;        // "A sunny Saturday afternoon"
  center: { lat: number; lng: number };
  /** Roughly how wide the area is — used to set map zoom + filter radius */
  radiusKm: number;
  /** Postcode-ish label for the chip on the area-filtered map */
  placeLabel: string;
  /** Hint of which featured pub photos to use as hero (first match wins) */
  heroPubNames: string[];
}

export const NEIGHBOURHOODS: Neighbourhood[] = [
  {
    id: "bermondsey",
    name: "Bermondsey",
    blurb: "London's Beer Mile — railway arches stuffed with breweries",
    description:
      "A string of indie breweries hidden under the Southern Rail viaducts between London Bridge and South Bermondsey. Most are taproom-only on Saturdays and feel more like warehouse parties than pubs. Pair it with Maltby Street food market.",
    vibe: ["Craft beer", "Beer mile", "Saturday session", "Food markets", "Industrial"],
    bestFor: "A long Saturday afternoon with mates",
    center: { lat: 51.4978, lng: -0.0738 },
    radiusKm: 1.0,
    placeLabel: "Bermondsey",
    heroPubNames: ["Brew By Numbers", "The Kernel Brewery", "Anspach & Hobday", "Maltby Street Market"],
  },
  {
    id: "borough",
    name: "Borough",
    blurb: "Historic pubs around the oldest food market in London",
    description:
      "Borough Market's surrounding streets pack four of the best historic pubs in London within a 4-minute walk — The Anchor, George Inn (only galleried coaching inn left), Market Porter and the Rake. Foodie tourist crowd in daytime, lock-in atmosphere by 10pm.",
    vibe: ["Historic", "Food market", "Riverside", "Tourist-friendly", "Real ale"],
    bestFor: "A weekday afternoon escape with great food on tap",
    center: { lat: 51.5054, lng: -0.0905 },
    radiusKm: 0.5,
    placeLabel: "Borough Market",
    heroPubNames: ["The Market Porter", "George Inn", "The Anchor", "The Rake", "Southwark Tavern"],
  },
  {
    id: "soho",
    name: "Soho",
    blurb: "Heritage drinking dens at the heart of theatreland",
    description:
      "Tight maze of streets between Oxford Circus and Leicester Square. Compact pubs with serious character — the Coach & Horses (Soho institution), the French House (drinks in halves only), Dog & Duck and the Lyric. Spills onto the street in summer.",
    vibe: ["Heritage", "Theatre crowd", "Late-night", "No mobile phones", "Iconic"],
    bestFor: "Pre or post-theatre, weekday pint with old friends",
    center: { lat: 51.5128, lng: -0.1340 },
    radiusKm: 0.5,
    placeLabel: "Soho",
    heroPubNames: ["The French House", "Coach and Horses", "The Dog and Duck", "Lyric"],
  },
  {
    id: "shoreditch",
    name: "Shoreditch",
    blurb: "Craft beer + late nights in former-industrial East London",
    description:
      "The unofficial capital of London craft beer. Howling Hops, BrewDog, Old Street Records, and a wave of newer taprooms. Sunday roasts run late, Friday nights run later. Spitalfields Market on the doorstep for daytime backup.",
    vibe: ["Craft beer", "Late-night", "Hip", "DJ sets", "Markets"],
    bestFor: "Friday night that turns into Saturday morning",
    center: { lat: 51.5264, lng: -0.0784 },
    radiusKm: 0.9,
    placeLabel: "Shoreditch",
    heroPubNames: ["The Old Blue Last", "Howling Hops", "BrewDog Shoreditch", "Strongroom Bar"],
  },
  {
    id: "camden",
    name: "Camden",
    blurb: "Canal-side pints with a punk-rock heritage",
    description:
      "Regent's Canal threads through Camden Market and a dozen riverside pubs — The Constitution, Edinboro Castle, The Spread Eagle. Brewery-owned (Camden Town Brewery is the local). Loud, lively, slightly chaotic in a way that's been Camden's whole brand for decades.",
    vibe: ["Canal-side", "Markets", "Live music", "Punk heritage", "Brewery"],
    bestFor: "A long lunch by the water turning into evening",
    center: { lat: 51.5390, lng: -0.1426 },
    radiusKm: 0.9,
    placeLabel: "Camden",
    heroPubNames: ["The Constitution", "Edinboro Castle", "The Spread Eagle", "The Hawley Arms"],
  },
  {
    id: "hampstead",
    name: "Hampstead",
    blurb: "Country pubs in the city — heath views, fireplaces, dogs",
    description:
      "The closest you'll get to a village pub in Zone 2. The Spaniards Inn (Dickens drank here), the Holly Bush, The Flask — all wooden floors, real fires and proper Sunday roasts. Walking distance from Hampstead Heath if you fancy a hangover-clearing wander.",
    vibe: ["Village feel", "Dog-friendly", "Real fire", "Heath walks", "Sunday roasts"],
    bestFor: "A weekend afternoon with a long walk and a Sunday roast",
    center: { lat: 51.5562, lng: -0.1762 },
    radiusKm: 1.2,
    placeLabel: "Hampstead",
    heroPubNames: ["The Spaniards Inn", "The Holly Bush", "The Flask", "The Magdala"],
  },
  {
    id: "notting-hill",
    name: "Notting Hill",
    blurb: "Gastropubs and pretty streets west of Hyde Park",
    description:
      "Pastel houses, antique-market Saturdays and a strip of top-tier gastropubs — Cow, Pelican, Cock & Bottle, Walmer Castle. The food is the headline; the pints are very drinkable; the people-watching is the bonus.",
    vibe: ["Gastropub", "Pretty streets", "Brunch", "Sunday roasts", "Antiques"],
    bestFor: "Weekend lunch with someone you want to impress",
    center: { lat: 51.5155, lng: -0.2058 },
    radiusKm: 1.0,
    placeLabel: "Notting Hill",
    heroPubNames: ["The Cow", "The Pelican", "The Cock and Bottle", "Walmer Castle"],
  },
  {
    id: "clerkenwell",
    name: "Clerkenwell",
    blurb: "Foodie pubs and cocktail dens just north of the City",
    description:
      "Where the City suit crowd goes off-duty. The Eagle (the original gastropub), Three Kings, Jerusalem Tavern. Plus a strong cocktail scene in St John's and Exmouth Market. Lively weekdays, calmer Saturdays.",
    vibe: ["Gastropub", "Cocktails", "Foodie", "Weekday crowd", "Markets"],
    bestFor: "Post-work pints that turn into food",
    center: { lat: 51.5226, lng: -0.1067 },
    radiusKm: 0.7,
    placeLabel: "Clerkenwell",
    heroPubNames: ["The Eagle", "Three Kings", "Jerusalem Tavern", "The Sekforde"],
  },
];
