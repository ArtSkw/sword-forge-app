import type { ArchetypeKey } from '../store/configStore';
import type { BladeProfile, Form } from './forge';

// The per-type catalogue: named blade profiles (Geibig / Oakeshott) and Forms, each Form anchored to a
// surviving object verified in the research (.plan/research/). Forms use only the parts that exist
// today; Forms that need parts we do not have yet are listed at the end of this file.

const NBSP = ' ';
const c = (span: string) => `c.${NBSP}${span}`;
const wallace = (objectId: number) =>
  `https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?service=ExternalInterface&module=collection&viewType=detailView&objectId=${objectId}`;

export const BLADE_PROFILES: Record<ArchetypeKey, BladeProfile[]> = {
  vikingSword: [
    // Ids hedeby / ulfberht / late are kept so saved configs still resolve.
    { id: 'hedeby', name: 'Broad', era: c('750–1000'), length: 'short', width: 'wide', fuller: 'single',
      note: 'Broad and near-parallel, with a wide fuller and a rounded point. Made for cutting.',
      story: 'The classic Viking blade (Geibig types 2 and 3): edges running almost parallel and a wide, shallow fuller down most of its length. Such blades were often pattern-welded, or carried an inlaid maker’s name.' },
    { id: 'ulfberht', name: 'Ulfberht', era: '9th–11th c.', length: 'medium', width: 'wide', fuller: 'single', shape: { bodyTaperMidWidth: 0.7, tipShoulderRound: 0.04 },
      note: 'The name +VLFBERH+T is inlaid down the fuller, and the blade narrows to a keener point.',
      story: 'About 170 blades carry the name +VLFBERH+T, inlaid near the hilt in letters of twisted steel rod, with a woven lattice on the reverse. Other smiths copied the name, sometimes garbled, as on a Finnish find that reads +VLEHRAHLDH+.' },
    { id: 'late', name: 'Late Viking', era: c('950–1100'), length: 'medium', width: 'standard', fuller: 'single', shape: { bodyTaperEnd: 0.86, bodyTaperMidWidth: 0.55, tipShoulderRound: 0 },
      note: 'Longer and more tapered, already close to the knightly swords that came after.',
      story: 'Geibig’s types 4 and 5, from the mid tenth to the late eleventh century: the strongest taper, narrower fullers and a longer run to the point. Type 5, the longest Viking blade, leads straight into the knightly type X.' },
  ],
  armingSword: [
    { id: 'x', name: 'Type X', era: c('975–1225'), length: 'medium', width: 'wide', fuller: 'single', shape: { bodyTaperEnd: 0.9, bodyTaperMidWidth: 0.75, tipShoulderRound: 0.05 },
      note: 'Broad, with a very wide, shallow fuller fading just before a rounded point.',
      story: 'Oakeshott’s first knightly type carries on the late Viking blade: about 80 cm long, broad, with only slight taper. The fuller is very wide and shallow and runs almost to the point.' },
    { id: 'xi', name: 'Type XI', era: c('1100–1175'), length: 'long', width: 'narrow', fuller: 'single', shape: { bodyTaperEnd: 0.88, bodyTaperMidWidth: 0.62, tipShoulderRound: 0 },
      note: 'Long and slender, tapering gradually to an acute point, with a narrow fuller.',
      story: 'A long, slender blade of the twelfth century, its narrow fuller running nearly the full length. One in the Klingenmuseum, Solingen, has a blade of about 99 cm under a 20 cm cross.' },
    { id: 'xii', name: 'Type XII', era: c('1150–1300'), length: 'medium', width: 'standard', fuller: 'single',
      note: 'Broad at the hilt with a marked taper to a good point; the fuller stops about two-thirds down.',
      story: 'The blade of the crusading age: broad at the hilt and tapering markedly to a point that can thrust, with the fuller shortened to about two-thirds of the length. Szczerbiec, the Polish coronation sword, has a type XII blade.' },
    { id: 'xiv', name: 'Type XIV', era: c('1270–1340'), length: 'short', width: 'wide', fuller: 'double', shape: { bodyTaperEnd: 0.72, bodyTaperMidWidth: 0.5, tipShoulderRound: 0 },
      note: 'Short, broad and sharply triangular; the fullers run about half the blade.',
      story: 'A short, broad blade of the later thirteenth and early fourteenth centuries, tapering hard to an acute point. Its fullers run about half the blade, as one broad groove or several narrow ones. The typology pairs it with a wheel pommel and a long, curved cross.' },
  ],
  longsword: [
    { id: 'xv', name: 'Type XV', era: c('1350–1500'), length: 'long', width: 'narrow', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.8, bodyTaperMidWidth: 0.45 },
      note: 'Straight edges converging to an acute point, no fuller, a crisp ridge down the middle.',
      story: 'A stiff, strongly tapering blade of flattened-diamond section, made for the thrust. Later examples have hollowed faces on either side of the ridge, which catch the light as two long highlights.' },
    { id: 'xvii', name: 'Type XVII', era: c('1360–1420'), length: 'long', width: 'standard', fuller: 'none', section: 'hexagonal', shape: { bodyTaperEnd: 0.84, bodyTaperMidWidth: 0.55 },
      note: 'Long, heavy and evenly tapering, hexagonal in section: a stiff two-handed thruster.',
      story: 'A long, evenly tapering blade with a flat band down its centre between sharp shoulders. The Wallace Collection’s A461, of the later fourteenth century, shows this stiff hexagonal section on a shorter sword.' },
    { id: 'xviiia', name: 'Type XVIIIa', era: c('1400–1450'), length: 'long', width: 'standard', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.9, bodyTaperMidWidth: 0.72 },
      note: 'Broad at the base; the taper starts gently and quickens toward the point, over a raised rib.',
      story: 'A fairly slender blade that holds its width and then curves in quickly to the point. The section is a diamond with a raised mid-rib, as on the broad, flattened-diamond blades of the fish-tail hilts of the mid fifteenth century.' },
    { id: 'xx', name: 'Type XX', era: '14th–15th c.', length: 'long', width: 'wide', fuller: 'double', section: 'lenticular', shape: { bodyTaperEnd: 0.9, bodyTaperMidWidth: 0.82, tipShoulderRound: 0.03 },
      note: 'Wide, with nearly parallel edges and two or three fullers below the cross.',
      story: 'A wide blade with little taper and two or three fullers, often a short central one flanked by two shorter ones. The point is rounded on type XX and acute on its variant XXa.' },
  ],
  bastardSword: [
    { id: 'xva', name: 'Type XVa', era: c('1350–1425'), length: 'long', width: 'narrow', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.82, bodyTaperMidWidth: 0.42 },
      note: 'Long, slender and strongly tapering, with a crisp mid-ridge and no fuller.',
      story: 'The long, narrow, acutely tapering blade carried by most bastard swords on effigies of about 1360 to 1420. The Met’s hand-and-a-half sword 2006.564 has a blade of 97.8 cm on this pattern.' },
    { id: 'xviiib', name: 'Type XVIIIb', era: c('1450–1520'), length: 'long', width: 'narrow', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.86, bodyTaperMidWidth: 0.6 },
      note: 'Slender and stiff, diamond in section, usually under a straight cross.',
      story: 'A slender diamond-section blade of the later fifteenth century. The typology pairs it with a distinctly waisted grip of 11 to 12 inches and, usually, a straight cross.' },
    { id: 'xviiic', name: 'Type XVIIIc', era: '15th c.', length: 'medium', width: 'wide', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.88, bodyTaperMidWidth: 0.7 },
      note: 'Broad and fairly short, up to about 86 cm, often under a wheel pommel.',
      story: 'A broad blade up to 34 inches long, on a long grip with a pronounced swell in the middle. The typology often gives it an S-curved cross and usually a wheel pommel.' },
    { id: 'fullered', name: 'Broad fullered', era: c('1500–1580'), length: 'long', width: 'standard', fuller: 'single', section: 'lenticular', shape: { bodyTaperEnd: 0.83, bodyTaperMidWidth: 0.45 },
      note: 'Broad, with one central fuller running two-thirds to three-quarters of the blade.',
      story: 'The German hand-and-a-half blade of the sixteenth century: broad, with a single central fuller that stops well short of the point. Smiths often struck their marks inside the fuller.' },
  ],
  greatsword: [
    { id: 'gothic', name: 'Gothic', era: c('1400–1460'), length: 'long', width: 'wide', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.88, bodyTaperMidWidth: 0.6 },
      note: 'Broad, of flattened-diamond section, running straight from the cross with no ricasso.',
      story: 'The two-hander before the Landsknechts: a broad blade of flattened-diamond section with no ricasso and no hooks. Wallace A474 has a blade of 117 cm, and the whole sword weighs 2.9 kg.' },
    { id: 'zweihander', name: 'Zweihänder', era: c('1500–1600'), length: 'extraLong', width: 'standard', fuller: 'none', section: 'hexagonal',
      ricasso: { cm: 30, cover: 'leather', hooks: 'crescent' }, shape: { bodyTaperEnd: 0.84, bodyTaperMidWidth: 0.55 },  // Cleveland 1919.70: ricasso 34.7 cm; Wallace A468: leather over wood
      note: 'The full Landsknecht blade, 118–150 cm, with a long unsharpened ricasso below the cross.',
      story: 'The sixteenth-century two-hander blade, flattened-diamond or hexagonal in section, with a ricasso of 11 to 43 cm that could be held as a second grip. War swords of this size weigh about 2.5 to 3.8 kg.' },
    { id: 'montante', name: 'Montante', era: c('1540–1600'), length: 'extraLong', width: 'narrow', fuller: 'none', section: 'diamond',
      ricasso: { cm: 19, cover: 'bare', hooks: 'lugs' }, shape: { bodyTaperEnd: 0.9, bodyTaperMidWidth: 0.65 },  // Cleveland 1916.1509: ricasso 20.3 cm, small lugs
      note: 'Very long and straight, with a short ricasso: the Iberian two-hander.',
      story: 'The Toledo two-hander of the later sixteenth century: a very long, straight blade with a short ricasso of about 17 to 20 cm.' },
  ],
  falchion: [
    { id: 'cleaver', name: 'Cleaver', era: c('1250–1350'), length: 'medium', width: 'wide', fuller: 'single', swell: 1.3, clip: 0.82, shape: { bodyTaperEnd: 0.78, bodyTaperMidWidth: 0.92, tipShoulderRound: 0.04 },  // 'single' = the groove near the back
      note: 'A nearly straight back and a belly that widens toward a short, diagonal clip at the point.',
      story: 'The Conyers type: a thin, light blade whose convex edge swells toward the tip before a short clip runs back to the spine. In place of a fuller it has a narrow groove about 25 mm from the back.' },
    { id: 'narrow', name: 'Narrow', era: c('1275–1350'), length: 'medium', width: 'narrow', fuller: 'single', swell: 0.25, clip: 0.85, shape: { bodyTaperEnd: 0.82, bodyTaperMidWidth: 0.85, tipShoulderRound: 0 },  // Thorpe: 48 → 56 mm; its fuller is on one face only, shown here as a groove
      note: 'Narrow, widening only slightly toward a clipped point.',
      story: 'The Thorpe type of the late thirteenth and early fourteenth centuries: 48 mm wide at the hilt and 56 mm at its widest, with a false edge bevelled like the true one.' },
    { id: 'short', name: 'Short broad', era: c('1250'), length: 'short', width: 'wide', fuller: 'none', swell: 0.9, clip: 0.76, shape: { bodyTaperEnd: 0.72, bodyTaperMidWidth: 0.95, tipShoulderRound: 0.05 },
      note: 'Short and broad, swelling to the tip, as painted in thirteenth-century manuscripts.',
      story: 'Known mostly from pictures: the Maciejowski Bible of about 1250 shows short, broad falchions swelling toward the tip. Surviving falchion blades run from 62 to 80 cm; this is the short end.' },
  ],
  estoc: [
    { id: 'gothicStiff', name: 'Gothic stiff', era: c('1375–1400'), length: 'long', width: 'narrow', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.8, bodyTaperMidWidth: 0.45 },
      note: 'Long and acutely tapering, with a strong central ridge and a very narrow point.',
      story: 'The early stiff thrusting blade of the late fourteenth century. One in Chicago, made in Germany about 1390–1400, has a ridged blade of 87.6 cm.' },
    { id: 'saddle', name: 'Saddle', era: c('1500–1540'), length: 'extraLong', width: 'narrow', fuller: 'none', section: 'triangular', shape: { bodyTaperEnd: 0.88, bodyTaperMidWidth: 0.5 },  // Cleveland 1916.686, AIC 1982.3325
      note: 'A long, edgeless spike up to 125 cm, triangular or diamond in section.',
      story: 'The estoc at its fullest: a rigid blade of up to 125 cm, often triangular with hollow-ground faces, so three hard lines of light run its length. It was made to thrust through mail and into the gaps of plate.' },
    { id: 'panzerstecher', name: 'Panzerstecher', era: c('1530–1550'), length: 'long', width: 'narrow', fuller: 'none', section: 'diamond', shape: { bodyTaperEnd: 0.9, bodyTaperMidWidth: 0.65 },
      note: 'A lighter needle from Hungary and the Ottoman lands, about 115 cm overall.',
      story: 'The Panzerstecher of Kasim Beg in Vienna, made about 1530, is 114.5 cm long and weighs only 0.85 kg.' },
  ],
};

export const FORMS: Record<ArchetypeKey, Form[]> = {
  vikingSword: [
    { id: 'typeX', name: 'Type X', era: c('950–1000'), years: [950, 1000],
      anchor: 'After Portable Antiquities Scheme PUBLIC-4221F3',
      anchorUrl: 'https://finds.org.uk/database/artefacts/record/id/567833',
      note: 'No upper guard: one iron nut-shaped pommel on the tang, over a plain straight guard.',
      story: 'In the tenth century the Viking hilt lost its upper guard, and a single pommel sat straight on the tang (Petersen’s type X). This form follows an iron brazil-nut pommel of c. 950–1000, 60 × 48 × 24 mm, recorded by the Portable Antiquities Scheme. Type X hilts are plain iron.',
      blade: 'hedeby', guard: 'straight', pommel: 'brazilNut', grip: 'wood', steel: 'satin', fittings: 'darkIron' },
    { id: 'ringerike', name: 'Ringerike', era: '11th c.', years: [1000, 1100],
      anchor: 'After Portable Antiquities Scheme NMS-CFA5A1',
      anchorUrl: 'https://finds.org.uk/database/artefacts/record/id/628549',
      note: 'A late type X with a cast bronze brazil-nut pommel on a tapering blade.',
      story: 'By the eleventh century some brazil-nut pommels were cast in bronze. This one, recorded by the Portable Antiquities Scheme, is worked in openwork with ribbons in the Ringerike style. The record is of the pommel alone; the guard here is matched to it in bronze.',
      blade: 'late', guard: 'straight', pommel: 'brazilNut', grip: 'leather', steel: 'satin', fittings: 'bronze' },
    { id: 'gicelin', name: 'Gicelin', era: c('1050–1250'), years: [1050, 1250],
      anchor: 'After Finnish Heritage Agency KM 3631:1',
      anchorUrl: 'http://museovirasto.finna.fi/Record/museovirasto.453FB6C8D87044003B391646E7A082C4',
      note: 'A disc pommel and a blade signed GICELIN ME FECIT: the step to the knightly sword.',
      story: 'A disc replaces the nut-shaped pommel, and the guard ends are round and slightly drooped. The blade reads +INNOMINEDOMINI+ on one face and +GICELINMEFECIT+, Gicelin made me, on the other. Disc pommels in Finnish graves of about 1050 mark the bridge to the knightly sword.',
      blade: 'late', guard: 'straight', pommel: 'disc', grip: 'leather', steel: 'satin', fittings: 'darkIron' },
  ],
  armingSword: [
    { id: 'whittlesea', name: 'Whittlesea Mere', era: c('1250–1300'), years: [1250, 1300],
      anchor: 'After V&A M.22-2002',
      anchorUrl: 'https://collections.vam.ac.uk/item/O67956/',
      note: 'A long straight cross, a bevelled wheel pommel, and latten letters inlaid in the blade.',
      story: 'An English sword of 1250–1300, found in Whittlesea Mere. Its blade is built around two pattern-welded rods that form a shallow fuller, inlaid with talismanic letters in latten. The quillons end in slightly flaring round terminals, and the wheel pommel has bevelled edges.',
      blade: 'xii', guard: 'straight', pommel: 'wheel', grip: 'leather', steel: 'polished', fittings: 'steel' },
    { id: 'norman', name: 'Norman', era: c('1050–1150'), years: [1050, 1150],
      anchor: 'After Finnish Heritage Agency KM 11840:1',
      anchorUrl: 'http://museovirasto.finna.fi/Record/museovirasto.BAA5F4D8856B07B87E99D27BFCB8B2F5',
      note: 'A broad blade, a low rounded pommel and a cross 13.9 cm long.',
      story: 'A sword of 1050–1150 on a Petersen type X hilt, with a low, rounded tea-cosy pommel (Oakeshott’s type B, shown here by its nearest shape) and a cross 13.9 cm long. The blade reads +NZOMEFECIT+ on one face and +INNOMNEDHI+, a shortened In nomine Domini, on the other.',
      blade: 'x', guard: 'straight', pommel: 'brazilNut', grip: 'leather', steel: 'satin', fittings: 'darkIron' },
    { id: 'imperial', name: 'Imperial', era: c('1200'), years: [1198, 1218],
      anchor: 'After Kunsthistorisches Museum WS XIII 17',
      anchorUrl: 'https://www.khm.at/en/objectdb/detail/100441',
      note: 'The Reichsschwert: gilded cross and pommel, a silver-wire grip, prayers on the hilt.',
      story: 'The Reichsschwert, the imperial sword now in Vienna, made between 1198 and 1218. Its pommel bears the imperial eagle and the arms of Otto IV, and the weakly gilded cross is inscribed CHRISTUS VINCIT CHRISTUS REGNAT CHRISTUS IMPERAT. The grip is wound with silver wire.',
      blade: 'xii', guard: 'straight', pommel: 'disc', grip: 'wire', steel: 'polished', fittings: 'brass' },
  ],
  longsword: [
    { id: 'italianGothic', name: 'Italian Gothic', era: '15th c.', years: [1400, 1500],
      anchor: 'After Wallace Collection A465',
      anchorUrl: wallace(60958),
      note: 'A faceted fig pommel with shield-shaped recesses, over a flat cross broadened at the ends.',
      story: 'A fifteenth-century longsword, probably Italian. The flat, straight cross broadens at the ends, each pierced with a small cross, and the faceted fig pommel has recesses shaped like shields.',
      blade: 'xv', guard: 'straight', pommel: 'scentStopper', grip: 'cord', steel: 'polished', fittings: 'steel' },
    { id: 'castillon', name: 'Castillon', era: c('1450–1520'), years: [1440, 1520],
      anchor: 'After Wallace Collection A475',
      anchorUrl: wallace(60968),
      note: 'A long fish-tail pommel over a round cross ending in knobs, on a blackened hilt.',
      story: 'A blackened hilt with a straight cross, round in section, ending in knobs, and a small leaf-shaped projection over the blade. The pommel is a long fish-tail, and a fleur-de-lys mark sits 24 cm below the guard. The Wallace compares it with a two-hander from Castillon in the Royal Armouries; its records give dates from about 1450 to 1520.',
      blade: 'xviiia', guard: 'ornate', pommel: 'fishtail', grip: 'cord', steel: 'satin', fittings: 'darkIron' },
    { id: 'milanese', name: 'Milanese court', era: c('1460'), years: [1450, 1470],
      anchor: 'After Wallace Collection A466',
      anchorUrl: wallace(60959),
      note: 'A gilt-bronze Italian fish-tail pommel and a black horn grip on a slim, acute blade.',
      story: 'An Italian longsword of about 1460 with what the Wallace calls an authentic medieval fish-tail pommel of gilt bronze. The grip is black horn. The catalogue notes a Visconti sword at the Cluny with the same kind of pommel.',
      blade: 'xv', guard: 'ornate', pommel: 'fishtail', grip: 'wood', gripColor: '#1f1b18', steel: 'polished', fittings: 'brass' },
  ],
  bastardSword: [
    { id: 'blued', name: 'Blued hilt', era: c('1550'), years: [1540, 1560],
      anchor: 'After Cleveland Museum of Art 1916.1506',
      anchorUrl: 'https://clevelandart.org/art/1916.1506',
      note: 'A blued cross and faceted pear pommel, and three marks struck in the fuller.',
      story: 'A German hand-and-a-half sword of about 1550, 123.9 cm long with a 30.5 cm grip. The plain straight cross and the faceted pear pommel with its button are blued. The blade has one long fuller with three marks struck inside it.',
      blade: 'fullered', guard: 'straight', pommel: 'scentStopper', grip: 'leather', steel: 'satin', fittings: 'darkIron' },
    { id: 'raisedWheel', name: 'Raised wheel', era: '15th c.', years: [1400, 1500],
      anchor: 'After the Met 14.25.1196',
      anchorUrl: 'https://www.metmuseum.org/art/collection/search/35888',
      note: 'A wheel pommel with a raised centre over a straight cross that widens at the tips.',
      story: 'A fifteenth-century hand-and-a-half sword, European or possibly British. Its straight cross, 25.4 cm across, widens toward the ends from a cross-shaped centre block, and the wheel pommel has a raised centre.',
      blade: 'xviiib', guard: 'straight', pommel: 'wheel', grip: 'cord', steel: 'satin', fittings: 'steel' },
    { id: 'hookedCross', name: 'Hooked cross', era: 'early 15th c.', years: [1400, 1430],
      anchor: 'After the Met 1973.27.1',
      anchorUrl: 'https://www.metmuseum.org/art/collection/search/27311',
      note: 'A cross with tips turned toward the blade, a wheel pommel and a sharply ridged blade.',
      story: 'An early fifteenth-century sword, probably French, 124.9 cm long. The straight arms of the cross end in short hooks turned toward the blade, and the wheel pommel is set with an enamel boss. Silver, gold and enamel are all listed among its materials.',
      blade: 'xva', guard: 'curved', pommel: 'wheel', grip: 'leather', steel: 'polished', fittings: 'steel' },
  ],
  greatsword: [
    { id: 'montante', name: 'Montante', era: c('1550–1600'), years: [1550, 1600],
      anchor: 'After Cleveland Museum of Art 1916.1509',
      anchorUrl: 'https://clevelandart.org/art/1916.1509',
      note: 'A plain straight cross, small lugs, a fluted pommel and a very long blade.',
      story: 'A two-hander made in Toledo, 168.3 cm long. A simple straight cross with small terminals and a single oval side ring sits over a short ricasso of 20.3 cm with small lugs, and the pommel is fluted.',
      blade: 'montante', guard: 'straight', pommel: 'scentStopper', grip: 'leather', gripColor: '#1f1b18', steel: 'polished', fittings: 'steel' },
    { id: 'gothic', name: 'Gothic', era: c('1450'), years: [1440, 1460],
      anchor: 'After Wallace Collection A474',
      anchorUrl: wallace(60967),
      note: 'A long fish-tail pommel, a straight cross with ball ends, a cord grip and a blackened hilt.',
      story: 'Possibly English, about 1450, and one of very few two-handed swords that date from before the sixteenth century. The straight cross ends in spheres and the pommel is a long fish-tail. The blade is 117 cm, and the sword weighs 2.9 kg.',
      blade: 'gothic', guard: 'ornate', pommel: 'fishtail', grip: 'cord', steel: 'satin', fittings: 'darkIron' },
    { id: 'earlyTwoHander', name: 'Early two-hander', era: c('1400–1450'), years: [1400, 1450],
      anchor: 'After the Met 2023.580.1',
      anchorUrl: 'https://www.metmuseum.org/art/collection/search/35388',
      note: 'A knobbed straight cross and a long fish-tail over a broad blade that tapers late.',
      story: 'A two-handed sword of about 1400–50, British or western European, 146.1 cm long with a 109.9 cm blade. Like Wallace A474 it pairs a straight cross ending in knobs with a long fish-tail pommel. The blade is broad at the shoulders and tapers quickly near the point.',
      blade: 'gothic', guard: 'ornate', pommel: 'fishtail', grip: 'leather', steel: 'polished', fittings: 'steel' },
  ],
  falchion: [
    { id: 'conyers', name: 'Conyers', era: c('1260'), years: [1250, 1272],
      anchor: 'After the Conyers falchion, Durham Cathedral',
      anchorUrl: 'https://www.durhamcathedral.co.uk/explore/treasures-collections/our-most-famous-items/the-conyers-falchion',
      note: 'A bronze cross hooked toward the blade, a bronze disc pommel and a broad cleaver blade.',
      story: 'Made before 1272 and kept at Durham Cathedral, where it was presented to each new Bishop of Durham. The bronze cross is engraved with winged dragons, and its tips hook sharply toward the blade. The bronze disc pommel shows the arms of England in red enamel on one face and a black eagle on the other.',
      blade: 'cleaver', guard: 'curved', pommel: 'disc', grip: 'wood', steel: 'satin', fittings: 'bronze' },
    { id: 'thorpe', name: 'Thorpe', era: c('1320'), years: [1300, 1340],
      anchor: 'After the Thorpe falchion, Norwich Castle Museum',
      anchorUrl: 'https://nhe.esdm.co.uk/Monument/MNF9645',
      note: 'A narrow clipped blade, a straight pierced cross and engraved brass fittings.',
      story: 'The Thorpe falchion in Norwich Castle Museum is dated about 1320 by its straight cross, pierced with a cruciform hole. The blade is 80 cm long and narrow, with a fuller on one face only and a small brass crown inlaid. The brass pommel is engraved with animals and monsters.',
      blade: 'narrow', guard: 'straight', pommel: 'disc', grip: 'leather', steel: 'satin', fittings: 'brass' },
    { id: 'maciejowski', name: 'Maciejowski', era: c('1250'), years: [1240, 1260],
      anchor: 'After Morgan Library MS M.638, fol. 14v',
      anchorUrl: 'https://commons.wikimedia.org/wiki/File:Maciejowski_falchion.png',
      note: 'As painted about 1250: a short, broad blade under a gilt cross bent hard toward it.',
      story: 'The Maciejowski Bible, painted in northern France about 1250, shows falchions with short, broad blades swelling to the tip. This one has a gilt hilt whose cross bends strongly toward the blade.',
      blade: 'short', guard: 'curved', pommel: 'wheel', grip: 'leather', steel: 'polished', fittings: 'brass' },
  ],
  estoc: [
    // The saddle estoc leads: its triangular hollow-ground blade is the most documented estoc section.
    { id: 'saddle', name: 'Saddle estoc', era: 'early 16th c.', years: [1500, 1540],
      anchor: 'After Cleveland Museum of Art 1916.686',
      anchorUrl: 'https://clevelandart.org/art/1916.686',
      note: 'A very long rigid blade, a 30 cm grip, a cross curled at the tips and a small cap pommel.',
      story: 'A German estoc of the early 1500s with a blade of 125.3 cm, three-sided for strength, and a grip 30 cm long. The long cross curls down at its ends into small hooks. Cleveland notes that such swords were sometimes carried from the saddle.',
      blade: 'saddle', guard: 'curved', pommel: 'disc', grip: 'leather', steel: 'satin', fittings: 'darkIron' },
    { id: 'gothicStiff', name: 'Gothic stiff sword', era: 'late 14th c.', years: [1375, 1400],
      anchor: 'After Kunsthistorisches Museum A 2058',
      anchorUrl: 'https://www.khm.at/en/artworks/gotisches-stossschwert-zu-anderthalb-hand-539422',
      note: 'A plain straight cross, a flat-topped cone pommel and a ridged blade with a needle point.',
      story: 'A late fourteenth-century thrusting sword for one and a half hands, 111 cm long, now in Vienna. It has a plain straight cross of thin square bar and a truncated-cone pommel, and it survives in excavated condition.',
      blade: 'gothicStiff', guard: 'straight', pommel: 'scentStopper', grip: 'leather', steel: 'satin', fittings: 'darkIron' },
    { id: 'hungarian', name: 'Hungarian Panzerstecher', era: c('1550'), years: [1540, 1560],
      anchor: 'After Kunsthistorisches Museum C 104',
      anchorUrl: 'https://www.khm.at/en/artworks/panzerstecher-373635-1',
      note: 'An all-gilt hilt: a short arched cross, a pear pommel and a sheathed grip.',
      story: 'A Hungarian thrusting sword of about 1550, now in Vienna. The hilt is fire-gilt silver with granulation: a short arched cross, a pear-shaped pommel and a metal-sheathed grip. Its wooden scabbard is covered in what may be fish leather.',
      blade: 'panzerstecher', guard: 'curved', pommel: 'scentStopper', grip: 'wire', steel: 'polished', fittings: 'brass' },
  ],
};

/*
 * Future Forms: anchored and verified in the research, but their defining feature needs a part that
 * does not exist yet. Each line: Form · anchor · parts it needs.
 *
 * Viking
 * - Hersir's type H · FHA KM 18402:1 · upper guard; small pyramidal cap pommel; silver-and-copper
 *   chequer wire inlay (24 wires/cm); +VLFBERHT+ inscription layer.
 * - Frankish five-lobe · Wallace A456 · upper guard; five-lobed pommel; inscribed guard face.
 * - Wessex / Trewhiddle · Ashmolean AN1890.14, YORYM 1977.51 · curved upper and lower guards; lobed
 *   pommel with animal heads; silver and niello mounts; silver grip bands; pattern-welded steel.
 * - Jarl's three-lobe (type S) · PAS KENT-328AD5 · three-lobed pommel; engraved silver sheet.
 * - Crescent (type Z) · SHM 836967_HST · crescent upper guard that is the pommel; silver inlay.
 * - Ulfberht · GNM FG2187, Klingenmuseum 1973.W.005 · inscription layer with reverse lattice;
 *   three-part riveted pommel (FG2187).
 * - Ingelrii · Klingenmuseum 1959.W.128 · inscription layer; gilt accents (gold rope round the pommel,
 *   gold plaques on the guard ends) separate from the fittings tone.
 * - Animal-head (type R) · FHA KM 27141:1 · double animal-head pommel with bronze eyes; upper guard.
 *
 * Arming sword
 * - First Crusade · Klingenmuseum 1962.W.009 · orange-segment pommel; guard length 20 cm.
 * - Coronation · Szczerbiec (Wawel 137) · bow-tie cross; niello and gold plates.
 * - Effigy knight (type XIV, curved cross, wheel) · parts exist, but no museum object was verified.
 * - Rain guard · Klingenmuseum 1953.W.148 · leather rain guard; asymmetric cross; pommel unrecorded.
 * - Globular · V&A M.53-1921 · spherical pommel; inward-curving slender quillons.
 * - Cawood · Yorkshire Museum (V-wiki) · multi-lobed type M pommel.
 *
 * Longsword
 * - Imperial · KHM A 139 · etched motto band; embossed leather grip; gilt; pommel shape unrecorded.
 * - Pelican · KHM A 144 · gilt copper-wire grip; gold-inlaid mark; pommel shape unrecorded.
 * - Agincourt · Met 2006.564 · horizontally S-recurved cross; spherical pommel.
 *
 * Bastard sword
 * - Swiss / South German · Cleveland 1921.1253, V&A M.603-1927 · writhen (spiral-fluted) pommel;
 *   knobbed cross; two-stage or shouldered grip; serpentine guard loops (V&A).
 * - Saxon ring-hilt · Cleveland 1974.58 · finger rings and shell; cone pommel; shagreen grip.
 * - Munich cage · Wallace A480–A485 · knuckle guard and cage; onion or cone pommel; fish-skin grip;
 *   blued steel.
 * - Side rings · Wallace A477, V&A M.90-1930 · side rings or ring guard; roped collar; six-sided fig.
 *
 * Greatsword
 * - Landsknecht · Cleveland 1919.70, Wallace A468, A469 · crescent parrying hooks; side rings;
 *   S-scroll quillon terminals; leather-covered ricasso; two-stage grip with mouldings.
 * - Flamberge · Wallace A470, Cleveland 1919.71 · flame edge; brass-riveted leather grip; octagonal
 *   pommel; side rings with fleur-de-lys.
 * - Ducal Guard · Cleveland 1916.1508 · fish-shaped terminals; pierced crutch pommel; etched ricasso.
 * - Highland · Met 54.46.10 · forward-sloping quillons with quatrefoils; langets; turned wood grip.
 * - Milanese · Wallace A471 · baluster cross; side rings; etched-and-gilt ricasso.
 *
 * Falchion
 * - Landsknecht Messer · KHM A 123 · knife hilt (slab tang, riveted scales, Nagel shell, hooked cap);
 *   curved blade with clipped false edge.
 * - Grosses Messer · KHM A 173 · straight blade with chisel clip; cylindrical cap; Nagel lug.
 * - Medici · Wallace A710 · gilt lion's-head pommel; etched and gilt blade.
 * - Venetian · Met 1984.73 · knuckle bow and S-quillons; spiked disc pommel.
 * - All falchions: single-edged wedge section with a back groove.
 *
 * Estoc
 * - Crutch pommel · AIC 1982.2120 · crutch (T-bar) pommel.
 * - Saxon courtier · Met 14.25.1049 · lozenge-ended flat quillons; side rings; shagreen grip with wire;
 *   fluted pear pommel.
 * - Kasim Beg · KHM C 162 · blued-and-gilt forte; dragon-head cross.
 * - Milan armour · KHM A 747 · ring hilt; blued steel with gold and silver damascening.
 * - All estocs: triangular hollow-ground and square sections.
 */
