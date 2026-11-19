(function (root) {
  'use strict';

  const deals = {
    royal_reader: {
      hand:['JS','JH','QS','QD','3C','5H','8D','9C'],
      hint:'Play the Jacks and hold both Queens.',
      done:'Compare the same Pair while holding one Queen.'
    },
    wayfinder: {
      hand:['3C','5D','7S','8H','10C','2H','QD','KC'],
      hint:'Play 3, 5, 7, 8 and 10.',
      done:'Wayfinder scored the five cards as a Straight.'
    },
    dustfin: {
      hand:['4H','4C','3S','8D','6H','9D','QC','KH'],
      hint:'Play the pair of 4s. Watch both cards score again.',
      done:'Dustfin repeated the low scoring cards.'
    },
    fox_in_ink: {
      hand:['QS','2C','5H','7D','9S','10D','JC','AH'],
      hint:'Play any hand and watch the Mult roll.',
      done:'Play another hand to roll again.'
    }
  };
  const ranks = {A:14,K:13,Q:12,J:11};
  function start(id) {
    const deal = deals[id];
    if (!deal) return null;
    const s = root.CW.newRun('FAMILIAR-' + id);
    s.familiars = [id,...(deal.partners || [])];
    s.consumables = [...(deal.spells || [])];
    root.CW.startBlind(s);
    const shuffled = [...s.draw,...s.hand];
    s.hand = deal.hand.map(face => {
      const rank = face.slice(0,-1);
      const card = s.deck.find(c=>c.suit === face.slice(-1) && c.rank === (ranks[rank] || Number(rank)));
      return Object.assign(card,deal.upgrades?.[face]);
    });
    // Keep the rest of the seeded draw, including cards from the original deal.
    s.draw = shuffled.filter(c=>!s.hand.includes(c));
    s.cardOrderMode = 'manual';
    s.playtest = id;
    return s;
  }
  root.CWPlaytest = {deals,start};
})(globalThis);
