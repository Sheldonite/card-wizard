const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const game = require('../engine');
const {createStore} = require('../progression');

function storage() {
  const data = new Map();
  return {getItem:key=>data.get(key), setItem:(key,value)=>data.set(key,value)};
}
function completedRun() {
  const run = game.newRun();
  Object.assign(run.stats, {roundsWon:10, bossesWon:10, purchases:3, spellsCast:3, bestScore:10000,
    skipped:10, packsOpened:10, moneyEarned:250});
  run.phase = 'won';
  run.victory = true;
  return run;
}
test('all ten illustrated styles correspond to distinct artwork and career achievements', () => {
  const store = createStore(storage());
  const fresh = store.getProgress();
  assert.equal(fresh.equippedCardStyle,'classic');
  assert.equal(fresh.cardStyles.length,10);
  assert.equal(new Set(fresh.cardStyles.map(s=>s.achievement)).size,10);
  const images = new Set();
  for (const style of fresh.cardStyles) {
    assert.ok(fresh.achievements.some(a=>a.id===style.achievement && a.description===style.goal));
    assert.equal(style.earned,false);
    assert.equal(store.equipCardStyle(style.id),false);
    const image = fs.readFileSync(path.join(__dirname,'..','art',style.art+'.jpg'));
    assert.equal(image.readUInt16BE(0),0xffd8);
    images.add(require('node:crypto').createHash('sha256').update(image).digest('hex'));
  }
  assert.equal(images.size,10);
  const run = completedRun();
  store.saveRun(run);
  const rewards = store.takeCardStyleUnlocks();
  assert.deepEqual(rewards.map(s=>s.id),fresh.cardStyles.map(s=>s.id));
  store.saveRun(run);
  assert.deepEqual(store.takeCardStyleUnlocks(),[]);
});
test('equipping a cosmetic belongs to the profile and changes no run state', () => {
  const db = storage(), store = createStore(db), run = game.newRun();
  run.stats.roundsWon=1;
  store.saveRun(run);
  const original=store.getRun();
  assert.ok(store.equipCardStyle('lantern-tabby'));
  assert.equal(store.equipCardStyle('eclipse-sovereign'),false);
  assert.deepEqual(store.getRun(),original);
  const reopened=createStore(db);
  assert.equal(reopened.getEquippedCardStyle().id,'lantern-tabby');
  const firstProfile=reopened.current().id;
  reopened.createProfile('Other player');
  assert.equal(reopened.getEquippedCardStyle(),null);
  assert.equal(reopened.equipCardStyle('lantern-tabby'),false);
  reopened.switchProfile(firstProfile);
  assert.equal(reopened.getProgress().equippedCardStyle,'lantern-tabby');
  assert.ok(reopened.equipCardStyle('classic'));
  assert.equal(createStore(db).getProgress().equippedCardStyle,'classic');
});
test('existing achievements award skins retroactively and practice never earns them', () => {
  const db=storage(), store=createStore(db);
  for (const mode of [{seeded:true},{playtest:'royal_reader'}]) {
    store.saveRun(Object.assign(completedRun(),mode));
    assert.ok(store.getProgress().cardStyles.every(s=>!s.earned));
  }
  const key='card-wizard.profiles.1';
  const old=JSON.parse(db.getItem(key));
  old.profiles[0].stats.roundsWon=1;
  db.setItem(key,JSON.stringify(old));
  const migrated=createStore(db);
  assert.ok(migrated.equipCardStyle('lantern-tabby'));
  assert.deepEqual(migrated.takeCardStyleUnlocks(),[]);
});
