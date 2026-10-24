// Internal: the two PURE safety detectors.
//
// Both run client-side the instant the student submits, with NO network and NO
// AI, so safety is never on the critical path. They are deliberately keyword-
// driven and conservative:
//
//   - detectEmergency  → an ACTIVE, life-threatening situation. A match renders
//     the full-screen Call-911 takeover immediately (before any AI runs). The
//     AI may independently RAISE an emergency later, but can never close one.
//   - detectSafetyHazard → a NON-active hazard (broken railing, exposed wiring,
//     ice on stairs, broken lock, missing extinguisher, chirping detector).
//     Drives a softer red note (campus-police number, no quick fixes), never a
//     takeover.
//
// The two are kept distinct on purpose: a broken handrail is a hazard note, not
// a 911 takeover (ticket 05 / spec cases 1, 2, 15).

/** Result of the instant emergency check. */
export interface EmergencyDetection {
  /** True when the text describes an active, life-threatening situation. */
  isEmergency: boolean;
  /** A short, human one-line reason shown on the takeover. */
  reason: string;
}

/** Result of the softer, non-takeover hazard check. */
export interface SafetyHazardDetection {
  /** True when the text describes a non-active safety hazard. */
  isHazard: boolean;
  /** A short label naming the hazard kind, for the red note. */
  reason: string;
}

/**
 * Active-emergency keyword table, checked in order; first match wins and
 * supplies the one-line reason. Phrases describe something HAPPENING NOW
 * (fire/smoke, medical collapse, violence, hazardous release).
 */
const EMERGENCY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(active shooter|gunman|shooting|someone (has|with) a gun)\b/i, "Possible active threat"],
  // "fire" / "smoke" as an active event — but NOT the hazard compounds
  // "fire extinguisher" or "smoke/CO detector", which are the softer note.
  [/\bfire\b(?!\s+extinguisher)|\bsmoke\b(?!\s+detector)|\bburning\b|\bflames?\b/i, "Possible fire"],
  [/\bgas leak\b|\bcarbon monoxide\b|\bchemical spill\b|\btoxic (fumes|gas)\b/i, "Possible hazardous leak"],
  [/\b(heart attack|stroke|seizure|overdose)\b/i, "Possible medical emergency"],
  [/\b(not breathing|can'?t breathe|unconscious|collapsed|passed out|unresponsive)\b/i, "Someone may be unresponsive"],
  [/\bbleeding (badly|out|heavily)\b|\bwon'?t stop bleeding\b/i, "Serious injury"],
  [/\b(being |getting )?(assault(ed|ing)?|attacked|stabbed|strangl)\b/i, "Possible violence in progress"],
  [/\bchoking\b|\bdrowning\b|\belectrocut/i, "Possible medical emergency"],
  // Death / dying — about a PERSON ("my laptop died" must not trigger).
  [
    /\b(some ?(one|body)|a (person|student|man|woman|guy|girl|kid|child)|my (friend|roommate)|he|she|they)\b[^.!?]{0,30}\b(died|is dead|are dead|dying|not moving|killed)\b|\bdead (body|person)\b|\b(found|there'?s) a body\b|\bkilled\b/i,
    "Someone may be seriously hurt or dead",
  ],
  // Self-harm — always get help now (988 is the US crisis line).
  [
    /\b(suicid(e|al)|kill (my|him|her|them)sel(f|ves)|end (my|his|her) life|want to die|hurt (my|him|her)self|self[- ]harm|overdos)/i,
    "Someone may be in crisis. You can also call or text 988",
  ],
  // Weapons, shootings, stabbings, threats, intruders.
  [
    /\b(gun|guns|firearm|knife|knives|weapon|(got|was|been|getting) shot|shot (at|him|her|them|someone|somebody)|stabb?(ed|ing)?|stabs|bomb|explosi(on|ve)|threaten(ed|ing)? to (kill|hurt|shoot))\b/i,
    "Possible weapon or threat",
  ],
  [/\b(intruder|break[- ]?in|broke in|breaking in|kidnap|abduct|rape|raped|sexual(ly)? assault)/i, "Possible crime in progress"],
  [/\b(fight|fighting|beating (him|her|them|someone|somebody) up|punch(ed|ing) (him|her|them|someone|somebody))\b/i, "Possible violence in progress"],
  // Serious injury.
  [
    /\b(bleeding|blood everywhere|badly hurt|seriously (hurt|injured)|hit by a (car|bus|truck|bike)|fell (down|off)[^.!?]{0,30}(hurt|can'?t move|not moving|unconscious)|broke (his|her|their|my) (neck|back|leg|arm)|can'?t move (his|her|their|my) (legs?|arms?|body)|allergic reaction|anaphyla)/i,
    "Someone may be seriously hurt",
  ],
  // More medical emergencies.
  [
    /\b(chest pain|heart (stopped|attack)|no pulse|cpr|faint(ed|ing)|blacked out|lost consciousness|seizing|convuls|asthma attack|can'?t stop (shaking|vomiting)|vomiting blood|coughing (up )?blood|diabetic|insulin|low blood sugar|head injury|hit (his|her|their|my) head|concussion|broken bone|bone (is )?sticking out|badly burn|severe(ly)? burn|burned (badly|bad)|hypotherm|frostbite|heat ?stroke)\b/i,
    "Possible medical emergency",
  ],
  // Drugs / alcohol.
  [
    /\b(alcohol poisoning|too drunk|passed out drunk|blackout drunk|won'?t wake up|drugged|roofied|spiked (my|her|his|their)? ?drinks?|drinks? (was|were|got|is) spiked|od'?(ed|ing)?|took too many (pills|drugs))\b/i,
    "Possible overdose or poisoning",
  ],
  // Trapped / falls / structural.
  [
    /\b(trapped|stuck (in|inside) (the|an?) (elevator|room|stairwell|building)|can'?t get out|locked in|fell (from|off) (a|the) (roof|balcony|window|stairs)|jump(ed|ing)? (off|from)|ceiling (fell|collapsed) on|collapsed on (him|her|them|someone|somebody|me)|building (is )?collapsing|power lines? (down|on the ground)|downed (power )?line|live wire)\b/i,
    "Someone may be trapped or in danger",
  ],
  // Gas / fumes / smoke smell.
  [/\b(smell(s|ing)? (of |like )?gas|gas smell|smells like (something )?burning|burning smell|fumes|can'?t breathe in here)\b/i, "Possible gas leak or fire"],
  // Water emergencies.
  [/\b(drown|under ?water and|flood(ing)? with (people|someone)|water (touching|near) (the )?(outlet|wires|electric))/i, "Possible water or electrical danger"],
  // Threats, stalking, people in danger.
  [
    /\b(hostage|riot|stalk(er|ing|ed)|following me|chasing me|someone is outside my (door|room)|domestic violence|hitting (her|him|me|them)|choking (her|him|me|them)|threatening (me|us|her|him|them)|said (he|she|they)'?(d| would| will) (kill|hurt|shoot)|bomb threat|shooter|armed)\b/i,
    "Possible threat to someone's safety",
  ],
  [/\b(missing (person|student|child|friend)|can'?t find (my|our) (friend|roommate|child|kid)|been missing)\b/i, "Someone may be missing"],
  [/\b(car (crash|accident)|crashed|hit and run|run over)\b/i, "Possible crash or injury"],
  // Someone explicitly asking for emergency help.
  [/\b(call 911|need an ambulance|call an ambulance|(this is an?|it'?s an?|we have an?|there'?s an?) emergency|help me|send help|life or death)\b/i, "You asked for emergency help"],
];

/**
 * Non-active hazard keyword table. These are real safety concerns that warrant
 * a warning + campus-police number, but are NOT an active 911 emergency.
 */
const HAZARD_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(hand ?rail|railing|banister)\b/i, "Broken railing"],
  [/\bexposed wir(e|ing)\b|\bbare wir(e|ing)\b|\bsparking\b/i, "Exposed wiring"],
  [/\bice\b.*\b(stairs?|steps?|walk|path|entrance)\b|\b(stairs?|steps?|walk|path)\b.*\bice\b/i, "Ice hazard"],
  [/\b(broken|busted|faulty) lock\b|\block is broken\b|\bdoor (won'?t|doesn'?t) lock\b/i, "Broken lock"],
  [/\b(missing|no) (fire )?extinguisher\b|\bextinguisher is (missing|gone)\b/i, "Missing extinguisher"],
  [/\b(smoke |carbon monoxide |co )?detector\b.*(chirp|beep|dead battery|low battery)|chirping (smoke )?detector\b/i, "Detector needs service"],
];

export function detectEmergency(text: string): EmergencyDetection {
  for (const [re, reason] of EMERGENCY_PATTERNS) {
    if (re.test(text)) return { isEmergency: true, reason };
  }
  return { isEmergency: false, reason: "" };
}

export function detectSafetyHazard(text: string): SafetyHazardDetection {
  // An active emergency is handled by the takeover, not the softer note.
  if (detectEmergency(text).isEmergency) {
    return { isHazard: false, reason: "" };
  }
  for (const [re, reason] of HAZARD_PATTERNS) {
    if (re.test(text)) return { isHazard: true, reason };
  }
  return { isHazard: false, reason: "" };
}
