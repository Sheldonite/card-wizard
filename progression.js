// Profile progression lives beside each player's resumable run.
(function (root) {
  "use strict";

  const familiarRules = root.CWFamiliarUnlocks || (typeof require === "function" && require("./familiar-unlocks.js"));
  const key = "card-wizard.profiles.1";
  const legacyKey = "card-wizard.run.1";
  const counterKeys = ["handsPlayed", "discardsUsed", "roundsWon", "skipped",
    "purchases", "moneyEarned", "packsOpened", "bossesWon", "spellsCast"];
  const initialDecks = ["arcane", "alchemist", "oracle"];
  const higherStakeWins = stats => Object.entries(stats.stakeWins)
    .filter(([id]) => id !== "ember").reduce((sum, [, wins]) => sum + wins, 0);
  const achievementRules = [
    ["clear_blind", "Light the Table", "Clear your first blind.", s => s.roundsWon >= 1],
    ["bench_tested", "Across the Felt", "Play 8 hands.", s => s.handsPlayed >= 8],
    ["market_stroll", "Market Token", "Make 3 shop purchases.", s => s.purchases >= 3],
    ["boss_broken", "The First Ward", "Defeat a boss blind.", s => s.bossesWon >= 1],
    ["deckwright", "Deckwright", "Cast 3 spells.", s => s.spellsCast >= 3],
    ["second_circle", "The Third Lantern", "Reach ante 3.", s => s.bestAnte >= 3],
    ["small_fortune", "The Purse Opens", "Earn $30 across runs.", s => s.moneyEarned >= 30],
    ["long_walk", "Midnight Crossing", "Reach ante 5.", s => s.bestAnte >= 5],
    ["first_victory", "Master of the Table", "Win a campaign run.", s => s.wins >= 1],
    ["trial_clear", "Passed the Trial", "Win a challenge.", s => Object.keys(s.challengeWins).length >= 1],
    ["earn_your_stripes", "Copper Temper", "Win a campaign at a higher stake.", s => higherStakeWins(s) >= 1],
    ["circle_of_three", "Three Schools", "Win with 3 different decks.", s => Object.keys(s.deckWins).length >= 3],
    ["candle_keeper", "Candle Keeper", "Clear 10 blinds.", s => s.roundsWon >= 10],
    ["watchtower", "Watchtower", "Clear 50 blinds.", s => s.roundsWon >= 50],
    ["steel_lantern", "Steel Lantern", "Defeat 10 boss blinds.", s => s.bossesWon >= 10],
    ["practice_makes", "Well-Worn Felt", "Play 100 hands.", s => s.handsPlayed >= 100],
    ["new_plan", "A New Plan", "Make 25 discards.", s => s.discardsUsed >= 25],
    ["take_a_chance", "The Unmarked Road", "Skip 10 blinds.", s => s.skipped >= 10],
    ["bigger_purse", "Silk Pockets", "Earn $250 across runs.", s => s.moneyEarned >= 250],
    ["open_road", "Packing Light", "Open 10 booster packs.", s => s.packsOpened >= 10],
    ["big_hand", "The Room Shakes", "Score 10,000 in a single hand.", s => s.bestScore >= 10000],
    ["huge_hand", "The Floor Gives Way", "Score 100,000 in a single hand.", s => s.bestScore >= 100000],
    ["endless", "Beyond the Eclipse", "Reach ante 9.", s => s.bestAnte >= 9],
    ["deep_end", "The Far Side", "Reach ante 12.", s => s.bestAnte >= 12],
    ["win_five", "Five Seals", "Win 5 campaign runs.", s => s.wins >= 5],
    ["win_ten", "Ten Seals", "Win 10 campaign runs.", s => s.wins >= 10],
    ["high_stakes", "Tempered by Fire", "Win at 4 different stakes.", s => Object.keys(s.stakeWins).length >= 4],
    ["last_stake", "The Last Ember", "Win at the highest stake.", s => Boolean(s.stakeWins.blackstar)],
    ["trial_circle", "The Trial Circle", "Win 10 different challenges.", s => Object.keys(s.challengeWins).length >= 10],
    ["trial_master", "The Trial Crown", "Win all 20 challenges.", s => Object.keys(s.challengeWins).length >= 20],
    ["collector", "Cabinet of Wonders", "Discover 75 different items.", (_, discovered) => Object.keys(discovered).length >= 75]
  ];

  const copy = value => JSON.parse(JSON.stringify(value));
  const count = value => Number.isFinite(value) && value > 0 ? value : 0;
  const own = (object, id) => Object.hasOwn(object, id) ? object[id] : undefined;
  const validId = id => typeof id === "string" && id.length > 0 && !Object.hasOwn(Object.prototype, id) && id !== "prototype";
  const add = (map, id, amount = 1) => {
    if (validId(id)) map[id] = count(own(map, id)) + amount;
  };
  const makeId = () => root.crypto?.randomUUID?.()
    || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

  function newStats() {
    return {
      runsStarted: 0, runsFinished: 0, runsAbandoned: 0, wins: 0, losses: 0,
      practiceRuns: 0, challengeVictories: 0, bestScore: 0, bestHand: "", bestAnte: 0,
      ...Object.fromEntries(counterKeys.map(id => [id, 0])),
      deckWins: {}, stakeWins: {}, deckStakeWins: {}, challengeWins: {}, itemUses: {}
    };
  }

  function newFamiliarCareer() {
    return {earned:{}, discovered:{}, totals:{hands:0, faces:0, familiarsSold:0, cardsSold:0, losses:0, streak:0}};
  }
  function newProfile(id, name) {
    return { id, name, stats: newStats(), familiarCareer:newFamiliarCareer(), discovered: {}, run: null, tracking: null };
  }

  function validRun(run) {
    return Boolean(run && Array.isArray(run.deck) && Array.isArray(run.familiars) && run.stats);
  }

  function savedStats(profile) {
    return { ...newStats(), ...profile.stats };
  }

  function earnedAchievements(stats, discovered) {
    return achievementRules.map(([id, name, description, met]) => ({
      id, name, description, earned: met(stats, discovered)
    }));
  }

  function dataForGame() {
    const engine = root.CW || {};
    const content = root.CWContent || {};
    const catalog = root.CWCatalog || {};
    const market = root.CWMarket || {};
    return {
      decks: { ...catalog.decks, ...engine.DECKS },
      stakes: { ...catalog.stakes, ...engine.STAKES },
      challenges: { ...catalog.challenges, ...engine.CHALLENGES },
      bosses: { ...catalog.bosses, ...engine.BOSSES },
      tags: { ...catalog.tags, ...engine.TAGS },
      familiars: { ...root.CWFamiliars?.definitions, ...content.familiars },
      spells: { ...market.spells, ...content.spells },
      packs: { ...market.packs, ...content.packs },
      vouchers: { ...market.vouchers, ...content.vouchers },
      enhancements: market.enhancements || {},
      seals: market.seals || {},
      editions: market.editions || {},
      stickers: market.stickers || {}
    };
  }

  function getAvailability(game, stats, achievements, career) {
    const earned = new Set(achievements.filter(item => item.earned).map(item => item.id));
    const checks = Object.fromEntries(achievements.map(item => [item.id, item.description]));
    const unlockHints = {};
    const unlocked = { decks: [], stakes: [], challenges: [], familiars: [], vouchers: [] };

    function reveal(group, id, available, hint) {
      if (available) unlocked[group].push(id);
      else unlockHints[id] = hint;
    }

    function definitionGate(group, id, definition) {
      const requirement = definition.unlock;
      if (requirement && typeof requirement === "object") {
        const available = Object.entries(requirement).every(([metric, minimum]) => count(stats[metric]) >= minimum);
        const ante = "Reach ante " + requirement.bestAnte + ".";
        const wins = "Win " + requirement.wins + (requirement.wins === 1 ? " campaign." : " campaigns.");
        return reveal(group, id, available, definition.unlockText || (requirement.bestAnte ? ante : wins));
      }
      return reveal(group, id, !checks[requirement] || earned.has(requirement), checks[requirement]);
    }
    for (const [id, def] of Object.entries(game.decks)) {
      if (initialDecks.includes(id)) reveal("decks", id, true);
      else definitionGate("decks", id, def);
    }
    const stakeIds = Object.keys(game.stakes);
    stakeIds.forEach((id, index) => {
      const previous = stakeIds[index - 1];
      reveal("stakes", id, index === 0 || Boolean(stats.stakeWins[previous]),
        "Win a campaign at " + game.stakes[previous]?.name + " stake.");
    });
    for (const [id, def] of Object.entries(game.challenges)) definitionGate("challenges", id, def);
    for (const [id, def] of Object.entries(game.vouchers)) definitionGate("vouchers", id, def);
    for (const def of Object.values(game.familiars)) {
      const goal = familiarRules.goals[def.joker];
      const hint = goal?.metric ? goal.hint + " (" + (career.totals[goal.metric] || 0) + "/" + goal.target + ")" : def.unlock;
      reveal("familiars", def.id, !def.unlock || career.earned[def.joker], hint);
    }
    return { unlocked, unlockHints };
  }

  function discoveryIds(run, game) {
    const ids = new Set(Array.isArray(run.discovered) ? run.discovered
      : Object.keys(run.discovered || {}).filter(id => run.discovered[id]));
    if (run.deckId) ids.add("deck_" + run.deckId);
    if (run.blind === 2 && run.bossId && run.phase !== "select") ids.add("boss_" + run.bossId);
    for (const owned of [run.familiars, run.consumables, run.vouchers]) {
      for (const entry of owned || []) {
        const [id, edition, sticker] = String(typeof entry === "string" ? entry : entry?.id || "").split("~");
        ids.add(id);
        if (edition) ids.add("edition_" + edition);
        if (sticker) ids.add("sticker_" + sticker);
      }
    }
    for (const card of run.deck) {
      if (card.enhancement) ids.add("enhance_" + card.enhancement);
      if (card.seal) ids.add("seal_" + card.seal);
      if (card.edition) ids.add("edition_" + card.edition);
    }
    for (const itemId of Object.keys(run.stats.itemUses || {})) ids.add(itemId);
    return [...ids].filter(validId)
      .map(id => {
        if (own(game.familiars, id) || own(game.spells, id) || own(game.vouchers, id) || own(game.packs, id)) return id;
        if (own(game.bosses, id)) return "boss_" + id;
        if (own(game.tags, id)) return "tag_" + id;
        if (own(game.enhancements, id)) return "enhance_" + id;
        if (own(game.seals, id)) return "seal_" + id;
        if (own(game.editions, id)) return "edition_" + id;
        if (own(game.stickers, id)) return "sticker_" + id;
        if (own(game.decks, id)) return "deck_" + id;
        return id;
      });
  }

  function checkCareerGoals(career, game) {
    let stars = 0, spells = 0;
    for (const id of Object.keys(career.discovered)) {
      const def = game.spells[id];
      if (!def) continue;
      if (def.rarity === "Constellation") stars++;
      if (familiarRules.isCoreSpell(def)) spells++;
    }
    Object.assign(career.totals, {stars, spells});
    for (const [joker, goal] of Object.entries(familiarRules.goals)) {
      if (goal.metric && career.totals[goal.metric] >= goal.target) career.earned[joker] = true;
    }
  }

  function familiarCareer(profile, game) {
    if (profile.familiarCareer) return profile.familiarCareer;
    const career = profile.familiarCareer = newFamiliarCareer();
    const stats = savedStats(profile);
    if (stats.wins) {
      career.earned.Blueprint = true;
      familiarRules.milestones(career.earned, 8, 0);
    }
    // Old totals include challenges. Only import shared counters when their origin is unambiguous.
    const hadChallenge = profile.run?.challengeId || Object.keys(stats.challengeWins).length ||
      Object.keys(profile.discovered || {}).some(id => id.startsWith("challenge_"));
    if (!hadChallenge) {
      career.totals.hands = stats.handsPlayed;
      career.totals.losses = stats.losses;
      familiarRules.milestones(career.earned, stats.bestAnte, stats.bestScore);
      for (const id of Object.keys(profile.discovered || {})) {
        if (game.spells[id]) career.discovered[id] = true;
        const f = game.familiars[id];
        if (f?.rarity === "Legendary") career.earned[f.joker] = true;
      }
      if (profile.tracking) profile.tracking.familiarCounters = {
        hands:profile.tracking.counters?.handsPlayed || 0,
        losses:Number(profile.tracking.finished && profile.run?.phase === "lost" && !profile.run?.victory)
      };
    }
    checkCareerGoals(career, game);
    return career;
  }

  function trackFamiliarCareer(career, tracking, run, game, discoveries) {
    if (!familiarRules.eligible(run)) return;
    const p = familiarRules.state(run);
    familiarRules.inventory(run);
    familiarRules.deck(run);
    if (run.phase === "won") familiarRules.won(run);
    if (run.victory) career.earned.Blueprint = true;
    Object.assign(career.earned, p.earned);
    if (run.money >= 400) career.earned.Satellite = true;
    familiarRules.milestones(career.earned, run.ante, run.stats.bestScore);
    const prior = tracking.familiarCounters ||= {};
    const current = {hands:run.stats.handsPlayed, faces:p.faces, familiarsSold:p.familiarsSold,
      cardsSold:p.cardsSold, losses:Number(run.phase === "lost" && !run.victory)};
    for (const [key, value] of Object.entries(current)) {
      const delta = count(value) - count(prior[key]);
      if (delta > 0) { career.totals[key] += delta; prior[key] = value; }
    }
    for (let i = prior.rounds || 0; i < p.rounds.length; i++) {
      career.totals.streak = p.rounds[i] ? career.totals.streak + 1 : 0;
      if (career.totals.streak >= familiarRules.goals.Troubadour.target) career.earned.Troubadour = true;
    }
    prior.rounds = Math.max(prior.rounds || 0, p.rounds.length);
    if (run.phase === "lost") career.totals.streak = 0;
    for (const id of discoveries) if (game.spells[id]) career.discovered[id] = true;
    checkCareerGoals(career, game);
  }

  function availableFamiliars(game, career) {
    return Object.values(game.familiars).filter(f => !f.unlock || career.earned[f.joker]).map(f => f.id);
  }

  function trackRun(profile, run) {
    const game = dataForGame();
    const career = familiarCareer(profile, game);
    const stats = profile.stats = savedStats(profile);
    const previous = profile.tracking;
    if (!previous || previous.id !== run.runId) {
      if (previous && !previous.finished && !previous.practice) stats.runsAbandoned++;
      profile.tracking = {
        id: run.runId, practice: Boolean(run.seeded), finished: false,
        counters: {}, itemUses: {}, seen: {}
      };
      if (run.seeded) stats.practiceRuns++;
      else stats.runsStarted++;
    }
    const tracking = profile.tracking;
    if (tracking.practice) return;

    function applyDelta(previousCounts, id, current, totals) {
      const earlier = count(own(previousCounts, id));
      if (!validId(id) || current <= earlier) return;
      add(totals, id, current - earlier);
      previousCounts[id] = current;
    }

    for (const id of counterKeys) applyDelta(tracking.counters, id, count(run.stats[id]), stats);
    for (const [id, total] of Object.entries(run.stats.itemUses || {})) {
      applyDelta(tracking.itemUses, id, count(total), stats.itemUses);
    }
    if (count(run.stats.bestScore) > stats.bestScore) {
      stats.bestScore = run.stats.bestScore;
      stats.bestHand = run.stats.bestHand || "";
    }
    stats.bestAnte = Math.max(stats.bestAnte, count(run.ante));

    const discoveries = discoveryIds(run, game);
    trackFamiliarCareer(career, tracking, run, game, discoveries);
    for (const id of discoveries) {
      if (run.challengeId && (game.familiars[id] || game.spells[id])) continue;
      if (own(tracking.seen, id)) continue;
      tracking.seen[id] = true;
      add(profile.discovered, id);
    }

    if (tracking.finished) return;
    if (run.victory || run.phase === "won") {
      tracking.finished = true;
      stats.runsFinished++;
      if (run.challengeId) {
        stats.challengeVictories++;
        add(stats.challengeWins, run.challengeId);
      } else {
        const stake = run.stakeId || "ember";
        stats.wins++;
        add(stats.deckWins, run.deckId);
        add(stats.stakeWins, stake);
        if (validId(run.deckId) && validId(stake)) {
          if (!own(stats.deckStakeWins, run.deckId)) stats.deckStakeWins[run.deckId] = {};
          add(stats.deckStakeWins[run.deckId], stake);
        }
      }
    } else if (run.phase === "lost") {
      tracking.finished = true;
      stats.runsFinished++;
      stats.losses++;
    }
  }

  function buildCollection(game, discovered, availability) {
    const { unlocked, unlockHints } = availability;
    const spectral = def => def.rarity?.toLowerCase() === "spectral" || def.pool === "spectral";
    const spells = Object.entries(game.spells);
    const groups = [
      ["decks", "Decks", Object.entries(game.decks), "deck_"],
      ["familiars", "Familiars", Object.entries(game.familiars), ""],
      ["spells", "Spells", spells.filter(([, def]) => def.effect !== "level" && !spectral(def)), ""],
      ["constellations", "Constellations", spells.filter(([, def]) => def.effect === "level" && !spectral(def)), ""],
      ["spectral", "Spectral", spells.filter(([, def]) => spectral(def)), ""],
      ["vouchers", "Vouchers", Object.entries(game.vouchers), ""],
      ["packs", "Booster packs", Object.entries(game.packs), ""],
      ["bosses", "Boss blinds", Object.entries(game.bosses), "boss_"],
      ["tags", "Skip charms", Object.entries(game.tags), "tag_"],
      ["enhancements", "Enhancements", Object.entries(game.enhancements), "enhance_"],
      ["seals", "Seals", Object.entries(game.seals), "seal_"],
      ["editions", "Editions", Object.entries(game.editions), "edition_"],
      ["stickers", "Stickers", Object.entries(game.stickers), "sticker_"]
    ];
    return groups.filter(([, , entries]) => entries.length).map(([key, name, entries, prefix]) => ({
      key, name, entries: entries.map(([id, raw]) => {
        const definition = typeof raw === "string" ? { description: raw } : raw;
        const discoveries = count(discovered[prefix + id]);
        const name = definition.name || id.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
        return {
          id: prefix + id, name, description: definition.description || "", kind: definition.kind || key,
          art: definition.art || (key === "decks" ? "grimoire" : "orb"),
          rarity: definition.rarity || "", count: discoveries,
          discovered: discoveries > 0 && (key !== "familiars" || unlocked.familiars.includes(id)),
          locked: Boolean(unlocked[key] && !unlocked[key].includes(id)), unlockHint: unlockHints[id]
        };
      })
    }));
  }

  function browserStorage() {
    try { return root.localStorage; } catch { return null; }
  }

  function createStore(storage = browserStorage()) {
    function read(storageKey) {
      try { return JSON.parse(storage?.getItem(storageKey) || "null"); } catch { return null; }
    }
    function write(value) {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch { return false; }
    }

    let notifications = [];
    let data = read(key);
    if (data?.version !== 1 || !Array.isArray(data.profiles) || !data.profiles.length) {
      const profile = newProfile("apprentice", "Apprentice");
      const legacy = read(legacyKey);
      if (validRun(legacy)) {
        legacy.runId ||= "legacy-" + makeId();
        if (legacy.ante > 8) legacy.victory = true;
        legacy.stats.bossesWon ??= Math.min(8, Math.max(0, (legacy.ante || 1) - 1))
          + Number(legacy.ante <= 8 && legacy.blind === 2 && ["payout", "shop", "won"].includes(legacy.phase));
        profile.run = legacy;
        trackRun(profile, legacy);
      }
      data = { version: 1, activeId: profile.id, profiles: [profile] };
      write(data);
    }
    let activeId = data.profiles.some(profile => profile.id === data.activeId)
      ? data.activeId : data.profiles[0].id;
    let dirty = false;

    function refresh() {
      if (dirty) return;
      const live = read(key);
      if (live?.version === 1 && live.profiles?.some(profile => profile.id === activeId)) data = live;
    }
    function persist() {
      const saved = write(data);
      dirty = !saved;
      return saved;
    }
    const active = () => data.profiles.find(profile => profile.id === activeId);
    const summarize = profile => ({ id: profile.id, name: profile.name, active: profile.id === activeId });

    return {
      current() {
        refresh();
        return summarize(active());
      },
      profiles() {
        refresh();
        return data.profiles.map(summarize);
      },
      switchProfile(id) {
        refresh();
        const profile = data.profiles.find(entry => entry.id === id);
        if (!profile) return null;
        activeId = data.activeId = profile.id;
        notifications = [];
        persist();
        return summarize(profile);
      },
      createProfile(name) {
        const label = String(name ?? "").trim().slice(0, 24);
        if (!label) return null;
        refresh();
        const profile = newProfile(makeId(), label);
        data.profiles.push(profile);
        notifications = [];
        activeId = data.activeId = profile.id;
        persist();
        return summarize(profile);
      },
      getRun() {
        refresh();
        const profile = active();
        if (!profile.run) return null;
        const run = copy(profile.run);
        const game = dataForGame();
        run.unlocks = {...run.unlocks, familiars:availableFamiliars(game, familiarCareer(profile, game))};
        return run;
      },
      setDeckDifficulty(deckId, stakeId) {
        const game = dataForGame();
        if (!own(game.decks, deckId) || !own(game.stakes, stakeId)) return false;
        refresh();
        const profile = active();
        profile.deckDifficulties ||= {};
        profile.deckDifficulties[deckId] = stakeId;
        return persist();
      },
      saveRun(run) {
        if (!validRun(run) || run.playtest) return false;
        refresh();
        const profile = active();
        const snapshot = copy(run);
        snapshot.runId ||= profile.run?.runId || makeId();
        const game = dataForGame();
        const career = familiarCareer(profile, game);
        const previous = {...career.earned};
        trackRun(profile, snapshot);
        const available = availableFamiliars(game, career);
        snapshot.unlocks = {...snapshot.unlocks, familiars:available};
        run.unlocks = {...run.unlocks, familiars:available};
        run.runId = snapshot.runId;
        for (const f of Object.values(game.familiars)) {
          if (career.earned[f.joker] && !previous[f.joker]) notifications.push(f.id);
        }
        profile.run = snapshot;
        return persist();
      },
      takeFamiliarUnlocks() {
        return notifications.splice(0);
      },
      resumeRun(run) {
        if (!run || !familiarRules.eligible(run) || ["won","lost"].includes(run.phase)) return false;
        refresh();
        if (active().run?.runId !== run.runId) return false;
        familiarRules.award(run, "Throwback");
        return this.saveRun(run);
      },
      clearRun() {
        refresh();
        const profile = active();
        if (profile.tracking && !profile.tracking.finished && !profile.tracking.practice) {
          profile.stats.runsAbandoned++;
        }
        profile.run = null;
        profile.tracking = null;
        return persist();
      },
      getProgress() {
        refresh();
        const profile = active();
        const discovered = { ...profile.discovered };
        const stats = copy(savedStats(profile));
        const achievements = earnedAchievements(stats, discovered);
        const game = dataForGame();
        const career = familiarCareer(profile, game);
        const availability = getAvailability(game, stats, achievements, career);
        const familiarAchievements = Object.values(game.familiars).filter(f => familiarRules.goals[f.joker]).map(f => {
          const goal = familiarRules.goals[f.joker];
          return {id:f.id, name:f.name, description:goal.hint, earned:!!career.earned[f.joker],
            current:goal.metric ? Math.min(career.totals[goal.metric] || 0, goal.target) : undefined, target:goal.target};
        });
        const collection = buildCollection(game, discovered, availability);
        return { profile: summarize(profile), deckDifficulties: { ...profile.deckDifficulties },
          stats, discovered, ...availability, achievements, familiarAchievements, collection };
      }
    };
  }

  const api = { createStore };
  root.CWProgress = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
