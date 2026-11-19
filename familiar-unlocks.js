// Permanent collection milestones, keyed by the Joker each familiar represents.
(function (root) {
  "use strict";
  const goals = {};
  function goal(joker, hint, metric, target) {
    goals[joker] = {hint, metric, target};
  }
  goal("Golden Ticket", "Play five Gold cards together.");
  goal("Mr. Bones", "Lose 5 runs.", "losses", 5);
  goal("Acrobat", "Play 200 hands.", "hands", 200);
  goal("Sock and Buskin", "Play 300 face cards.", "faces", 300);
  goal("Swashbuckler", "Sell 20 Familiars.", "familiarsSold", 20);
  goal("Troubadour", "Win 5 consecutive rounds in one hand each.", "streak", 5);
  goal("Certificate", "Own a Gold card with a Gold Seal.");
  goal("Smeared Joker", "Have 3 Wild cards in your deck.");
  goal("Throwback", "Resume a saved run from the main menu.");
  goal("Hanging Chad", "Finish a boss blind with High Card.");
  const suitGoals = {D:"Rough Gem", H:"Bloodstone", S:"Arrowhead", C:"Onyx Agate"};
  const suitNames = {D:"Diamonds", H:"Hearts", S:"Spades", C:"Clubs"};
  for (const [suit, joker] of Object.entries(suitGoals)) goal(joker, "Have 30 " + suitNames[suit] + " in your deck.");
  goal("Glass Joker", "Have 5 Glass cards in your deck.");
  goal("Showman", "Reach Ante 4.");
  goal("Flower Pot", "Reach Ante 8.");
  goal("Blueprint", "Win a run.");
  goal("Wee Joker", "Win a run in 18 rounds or fewer.");
  goal("Merry Andy", "Win a run in 12 rounds or fewer.");
  goal("Oops! All 6s", "Score 10,000 in one hand.");
  goal("The Idol", "Score 1,000,000 in one hand.");
  goal("Seeing Double", "Play four 7s of Clubs together.");
  goal("Matador", "Beat a boss in one hand without discarding.");
  goal("Hit the Road", "Discard five Jacks together.");
  const skippedHands = {"The Duo":"Pair", "The Trio":"Three of a Kind", "The Family":"Four of a Kind",
    "The Order":"Straight", "The Tribe":"Flush"};
  for (const [joker, hand] of Object.entries(skippedHands)) goal(joker, "Win a run without playing " + hand + ".");
  goal("Stuntman", "Score 100,000,000 in one hand.");
  goal("Invisible Joker", "Win a run without ever owning more than 4 Familiars.");
  goal("Brainstorm", "Discard a Royal Flush.");
  goal("Satellite", "Hold $400 at once.");
  goal("Shoot the Moon", "Play every Heart in your deck in a single round.");
  goal("Driver's License", "Have 16 enhanced cards in your deck.");
  goal("Cartomancer", "Discover all 22 core Spells (excludes Witch’s Tally).", "spells", 22);
  goal("Astronomer", "Discover all 12 Constellations.", "stars", 12);
  goal("Burnt Joker", "Sell 50 Familiars or consumables.", "cardsSold", 50);
  goal("Bootstraps", "Own 2 Polychrome Familiars at the same time.");
  const legendaryHint = "Summon this Legendary with The Old Name.";
  const eligible = s => !s.seeded && !s.challengeId && !s.playtest;
  const isCoreSpell = def => def.rarity === "Spell" && def.id !== "witch_tally";
  const fresh = (peak = 0) => ({earned:{}, rounds:[], playedCards:{}, faces:0, familiarsSold:0, cardsSold:0, peak});
  function state(s) {
    // Earlier saves cannot establish the highest number of Familiars ever held.
    return s.familiarProgress ||= fresh(null);
  }
  function award(s, joker) {
    if (eligible(s)) state(s).earned[joker] = true;
  }
  function milestones(earned, ante, score) {
    if (ante >= 4) earned.Showman = true;
    if (ante >= 8) earned["Flower Pot"] = true;
    if (score >= 10000) earned["Oops! All 6s"] = true;
    if (score >= 1000000) earned["The Idol"] = true;
    if (score >= 100000000) earned.Stuntman = true;
  }
  function deck(s) {
    if (!eligible(s)) return;
    const tally = {D:0,H:0,S:0,C:0,wild:0,glass:0,enhanced:0};
    for (const card of s.deck) {
      if (card.enhancement !== "stone") tally[card.suit]++;
      if (card.enhancement) tally.enhanced++;
      if (card.enhancement === "wild") tally.wild++;
      if (card.enhancement === "glass") tally.glass++;
      if (card.enhancement === "gold" && card.seal === "gold") award(s, "Certificate");
    }
    for (const [suit, joker] of Object.entries(suitGoals)) if (tally[suit] >= 30) award(s, joker);
    if (tally.wild >= 3) award(s, "Smeared Joker");
    if (tally.glass >= 5) award(s, "Glass Joker");
    if (tally.enhanced >= 16) award(s, "Driver's License");
  }
  function inventory(s) {
    if (!eligible(s)) return;
    const p = state(s);
    if (p.peak !== null || s.familiars.length > 4) p.peak = Math.max(p.peak, s.familiars.length);
    if (s.familiars.filter(ref => ref.split("~")[1] === "polychrome").length >= 2) award(s, "Bootstraps");
  }
  function played(s, cards, isFace, isClub) {
    if (!eligible(s)) return;
    const p = state(s);
    p.faces += cards.filter(isFace).length;
    for (const card of cards) p.playedCards[card.id] = true;
    const hearts = s.deck.filter(c => c.suit === "H" && c.enhancement !== "stone");
    if (hearts.length && hearts.every(c => p.playedCards[c.id])) award(s, "Shoot the Moon");
    if (cards.length === 5 && cards.every(c => c.enhancement === "gold")) award(s, "Golden Ticket");
    if (cards.filter(c => c.rank === 7 && isClub(c)).length >= 4) award(s, "Seeing Double");
  }
  function discarded(s, cards, hand) {
    if (!eligible(s)) return;
    if (cards.length === 5 && cards.every(c => c.rank === 11 && c.enhancement !== "stone")) award(s, "Hit the Road");
    if (hand.name === "Straight Flush" && [10, 11, 12, 13, 14].every(rank => hand.scoring.some(c => c.rank === rank && c.enhancement !== "stone"))) award(s, "Brainstorm");
  }
  function roundWon(s, hand) {
    if (!eligible(s)) return;
    state(s).rounds.push(s.playedCount === 1);
    if (s.blind !== 2) return;
    if (hand === "High Card") award(s, "Hanging Chad");
    if (s.playedCount === 1 && !s.discardCount) award(s, "Matador");
  }
  function won(s) {
    if (!eligible(s)) return;
    award(s, "Blueprint");
    if (s.stats.roundsWon <= 18) award(s, "Wee Joker");
    if (s.stats.roundsWon <= 12) award(s, "Merry Andy");
    const peak = state(s).peak;
    if (peak !== null && Math.max(peak, s.familiars.length) <= 4) award(s, "Invisible Joker");
    if (s.seenHands) {
      for (const [joker, hand] of Object.entries(skippedHands)) if (!s.seenHands[hand]) award(s, joker);
    }
  }
  const api = {goals, legendaryHint, eligible, isCoreSpell, fresh, state, award, milestones, deck, inventory, played, discarded, roundWon, won};
  root.CWFamiliarUnlocks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
