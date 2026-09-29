const assert=require('node:assert/strict');
const {fresh,standings,valid}=require('./league.js');
const s=fresh();assert.ok(valid(s));assert.equal(new Set(s.sports.volley.map(m=>`${m.a}${m.b}`)).size,6);
assert.deepEqual([s.sports.volley[0].a,s.sports.volley[0].b],[2,3]);
// Exercise compatibility with backups in the former A-B-first order.
[s.sports.volley[0],s.sports.volley[1]]=[s.sports.volley[1],s.sports.volley[0]];
for(let t=0;t<4;t++)assert.equal(s.sports.volley.filter(m=>m.a===t||m.b===t).length,3);
s.sports.volley[0].x=21;s.sports.volley[0].y=18;
assert.equal(standings(s.sports.volley,s.rules)[0].points,0,'Unconfirmed scores must not count');
s.sports.volley[0].done=true;
let rows=standings(s.sports.volley,s.rules);assert.equal(rows[0].team,0);assert.equal(rows[0].points,3);assert.equal(rows[0].diff,3);
s.sports.volley[1].done=true;s.sports.volley[1].x=5;s.sports.volley[1].y=5;
rows=standings(s.sports.volley,s.rules);assert.equal(rows.find(r=>r.team===2).points,1);assert.equal(rows.find(r=>r.team===2).rank,rows.find(r=>r.team===3).rank);
s.sports.volley[0].done=false;assert.equal(standings(s.sports.volley,s.rules).find(r=>r.team===0).points,0);
s.rules.draw=2;assert.equal(standings(s.sports.volley,s.rules)[0].points,2);
s.sports.shoe[0].x=-1;assert.equal(valid(s),false);s.sports.shoe[0].x=0.5;assert.equal(valid(s),false);
assert.equal(valid({}),false);assert.ok(valid(JSON.parse(JSON.stringify(fresh()))));
console.log('PASS: fixtures, unconfirmed scores, wins, draws, ties, correction, rule changes, backup validation');
const {volleyWinner,volleyScoreValid}=require('./league.js');
for(const [x,y,w] of [[10,9,null],[10,10,null],[11,10,null],[11,11,null],[12,11,null],[12,12,null],[11,0,'x'],[11,9,'x'],[12,10,'x'],[13,11,'x'],[13,12,'x'],[9,11,'y'],[10,12,'y'],[12,13,'y']])assert.equal(volleyWinner(x,y),w,`${x}:${y}`);
for(const [x,y] of [[14,12],[13,13],[12,9],[13,10],[-1,0],[1.5,0]])assert.equal(volleyScoreValid(x,y),false);
console.log('PASS: 11-point wins, deuce, 13-point cap, both teams, invalid scores');
const old=fresh();for(const sport of ['volley','shoe']){const games=old.sports[sport];[games[0],games[1]]=[games[1],games[0]];games[0].x=11;games[0].done=true;}
assert.ok(valid(old));require('./league.js').reorder(old);
for(const sport of ['volley','shoe']){assert.equal(old.sports[sport][0].a,2);assert.equal(old.sports[sport][1].a,0);assert.equal(old.sports[sport][1].x,11);assert.equal(old.sports[sport][1].done,true);}
console.log('PASS: C-D first with previous scores and backup results preserved');
