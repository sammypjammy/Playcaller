# Playcaller

A small browser football coaching game. You coach the fictional Iron City Foundry against the Bayport Breakers in one four-quarter exhibition. Each quarter lasts three game minutes.

## Run

Install Node.js 20.19+ or 22.12+, then from this folder:

```sh
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). For a production build, run `npm run build` and `npm run preview`. Run the gameplay checks with `npm test`.

## Play

Study Bayport's actual pre-snap alignment on the field. Its coverage name stays hidden until the play ends; the shell provides clues, never certainty. Browse 20 offensive calls by **Formation View** (I-Formation, Singleback, Shotgun, Pistol) or **Play Type View** (Run or Pass). The picker shows only the selected group. Tap a call's information button to see its purpose, useful situations, strengths, and weaknesses. On defense, choose Run Defense or Pass Defense, then Man Coverage, Zone Coverage, or Blitz. These views organize the existing seven calls by situation; special-team responses appear when the opponent is likely to kick. Selecting a call sends players from the huddle into formation; use **Snap** at the top right of **Choose a Call** when they are ready. After a touchdown, choose **Kick PAT** or **Go for 2**; a two-point try lets you pick from the existing playbook. A short teaching panel then shows the actual offense, defense, matchup rating, result, and why the call was favorable or unfavorable. **Play History** below the game keeps every snap, newest first, with both calls and the result. Fourth-down punt and field-goal units, including fakes and defensive responses, remain available. **My Favorites** saves preferred calls in this browser, and **New Game** restarts the exhibition.

The active playbook includes 20 offensive calls, seven defensive calls, and six offensive special-team calls. Calls differ in rushing gap and blocking or in route combinations, depth, and protection. Cover 0/1 use man responsibilities; Cover 2/3/4 use distinct deep zones; two blitzes add pressure. `src/strategy.ts` stores concept matchup advantages and bounded event probabilities. Advantage improves average results without guaranteeing a gain. Position ratings, down and distance, seeded variation, and play situation affect each snap. Bayport chooses based on down and distance and responds to repeated calls. The camera follows the ball while keeping a tactical view.

Every snap fields 11 named players per side, each with a jersey number, roster position, formation role, position-specific ratings, pre-snap alignment, and a structured assignment. I-Formation and Pistol use 21 personnel (two backs and one tight end); Singleback and Shotgun use 11 personnel (one back and one tight end). The larger reusable formation infrastructure remains in `src/football.ts` for future expansion. Special-team units include a punter, kicker, holder, snapper, protection, gunners, and coverage or return roles. Append `?debug` to the local URL to show formation diagnostics, or `?quick` for shorter animations. Formation validation runs before a lineup is used.

The field and players use original SVG pixel art. Iron City and Bayport have distinct helmet, jersey, and end-zone palettes. A shared sprite atlas provides stances for set, run, sprint, block, pass, catch, tackle, fall, and celebration. Turf sections, yard lines, centered numbers, hashes, players, ball, and goalposts share one yard coordinate system. At the snap, a replay plan stores the resolved start and end spots, carrier or receiver, catch point, and participating defender. Runs, completions, sacks, and tackles animate to those spots; incomplete passes travel to a target area and fall. Defenders follow coverage and pursuit assignments, and the camera follows the ball. Longer gains take longer to show. The selected call has a mini formation diagram with assignment arrows. The arcade scoreboard shows possession, score, game clock, and a presentation play clock.

## Prototype limits

Post-snap paths are simple movements derived from assignments, not a full physics or route-timing simulation. The play clock is visual only and reaching zero does not trigger a penalty; timeout pips are decorative. Contact and catch poses are approximate, because the simulation resolves the result before animation rather than calculating physical collisions. Standard kicks pass through the huddle, lineup, snap, and result sequence, while kick flight remains abstract. Fake runs and passes use normal down, yardage, turnover, and scoring rules with extra risk. Touchdowns award six and pause for a PAT or two-point choice. A PAT uses a short kick animation; a two-point try uses an existing offensive play from the opponent's 2-yard line. Defensive returns on blocked kicks or turnovers can score two. The next drive starts after the conversion at the receiving team's 25. The game does not simulate penalties, usable timeouts, overtime, or detailed kickoff flights. Teams and players are fictional. There is no season mode, separate main menu, team selection, pause screen, or direct player control.

## Adding a play

Add an offensive `PlaySpec` in `src/playbook.ts` and list its ID in exactly one `offenseGroups` formation. The `concept` selects routes and blocking in `src/football.ts`, motion in `src/FieldView.tsx`, and matchup modifiers in `src/strategy.ts`. Add a new concept there if the existing assignments do not describe the play. Each defense call likewise belongs to one `defenseGroups` category; `defensiveLookForCall` selects its front and personnel, and `coverageForCall` selects responsibilities. Descriptions, situations, strengths, and weaknesses on each `PlaySpec` feed the card and teaching panel. Run `npm test` to validate all active pairings before playing.

Coaching references used for the simplified concepts: [USA Football on 21-personnel runs and play action](https://blogs.usafootball.com/blog/5275/how-kyle-shanahan-s-21-personnel-offensive-sets-confuse-defenses), [USA Football on inside-zone blocking](https://blogs.usafootball.com/blog/7458/attacking-the-tite-front-with-inside-zone), and [USA Football on 11-personnel stick and draw](https://blogs.usafootball.com/blog/7013/learn-how-west-virginia-stole-yards-with-the-stick-draw-concept). These inform the concepts; the game's outcomes remain a simplified model.
