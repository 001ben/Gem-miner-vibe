# Game Design Principles

!!! abstract "Philosophy"

    This document captures the core design philosophies for this project. When making decisions, refer to these principles to ensure the game "feels" right.

## 1. The "Juice" (Game Feel)

"Juice" is the tactile feedback that makes interaction satisfying.

- **Everything Reacts:** When an object is touched, collected, or bought, it must react. (Particles, floating text, sound, scale bounce).
- **Instant Feedback:** Never delay the visual result of an action. If a gem is collected, it disappears *this frame*, even if the logic takes longer.
- **Exaggeration:** Realism is secondary to clarity. A 10% upgrade should *look* like a 10% upgrade, but a Level 10 bulldozer should look absurdly powerful compared to Level 1.

## 2. Progression & Pacing

- **The Power Fantasy:** The player starts weak and slow. The goal is to make them feel unstoppable by the end.
- **Micro-Goals:** The player should always have a goal reachable within 1-2 minutes (e.g., "Buy next Engine level").
- **Macro-Goals:** The player needs a horizon goal (e.g., "Unlock the Red Zone").
- **Friction vs. Flow:**
    - *Friction* (Slow movement, walls) makes the *Flow* (Speed upgrades, breaking through) satisfying.
    - Do not remove all friction too early.

## 3. Clarity & Readability

- **Form Follows Function:** A "Collector" should look like it collects things (funnels, belts). A "Shop" should look like a place of transaction.
- **Visual Hierarchy:** The most important elements (The Player, The Gems) must contrast with the background.
- **Numbers:** Keep numbers readable. "1.5k" is better than "1500" in tight UI, but precise numbers feel more "RPG-like" in stats panels.

## 4. Engineering for Design

- **Exposed Knobs:** Design systems with "Knobs" (Constants, Configs) that can be tweaked without rewriting logic.
- **Iterative Balance:** Balance is never done. Build tools (like the Asset Viewer or Debug Consoles) that help us "feel" the values.
- **Separation of Logic and Visuals:** The physics simulation (Matter.js) is the "Truth", but the Visuals (Three.js) are the "Experience". It's okay to cheat visuals (e.g., floating coins) to make it look good.

## 5. Next Steps for "Better" Design

- **Sound:** Currently missing. Sound is 50% of the "Juice".
- **Save/Load:** Progression is meaningless if lost on refresh.
- **Victory Lap:** After winning, give the player a "Toy" (e.g., infinite speed, sandbox mode) to enjoy their power.
