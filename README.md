# Maple Wars

**Maple Wars** is a fan-made single-player strategy game inspired by **Advance Wars**, with some changes and limitations.

It also uses **MapleStory-style assets** because I really like that game :)

This is mainly a personal project/prototype built to experiment with turn-based strategy gameplay, grid movement, unit combat, and simple AI.

## What You Can Do

In the current version, you can:

* Pick a commander
* Play against a Red AI opponent
* Build units from factories and airports
* Move units around a grid-based map
* Capture cities, factories, airports, and HQs
* Earn funds from owned buildings
* Attack enemy units
* Repair damaged units on owned buildings
* Restart your turn or restart the game

## Basic Goal

You control the **Blue Army** and play against the **Red AI Army**.

The main goal is to capture the enemy HQ or defeat the enemy army enough to control the map.

## Commanders

Each commander has a small passive bonus:

* **Dark Lord**: Mechs move farther, Infantry hit harder, but other units deal slightly less damage.
* **Athena**: Copters deal more damage.
* **Balrog**: Tanks take less damage.

## Units

The game currently has these units:

* **Infantry**: Cheap unit that can capture buildings.
* **Mech**: Stronger foot unit that can also capture buildings.
* **Recon**: Fast scouting unit.
* **Tank**: Strong ground combat unit.
* **Anti-Air**: Good against copters and infantry.
* **Copter**: Flying unit that ignores terrain movement costs.

## Buildings

* **City**: Gives income and repairs ground units.
* **Factory**: Builds ground units and repairs ground units.
* **Airport**: Builds copters and repairs copters.
* **HQ**: Your main base.

## Controls

* Click a building to open the build menu.
* Click one of your units to select it.
* Hover over tiles to preview movement.
* Click a tile to move, attack, or capture.
* Right-click a unit to see basic unit info.
* Click **End Turn** to let the AI play.
* Click **Restart Turn** to undo back to the start of your current turn.
* Click **Restart Game** to go back to the title screen.

## Project Status

This is still a prototype, so it is not a full game yet.

Some things are simple or limited right now, including:

* The AI is basic.
* There is only one main map.
* There is no multiplayer.
* There is no fog of war.
* Unit balance may change.
* Some visuals and animations are still experimental.

## Tech Stack

This project was built with:

* Next.js
* React
* TypeScript
* Tailwind CSS
* Framer Motion

## Getting Started

Install the dependencies:

```bash
npm install
```

Run the project:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Notes

This is a fan-made personal project made for fun and learning.

MapleStory assets are used because I am a fan of MapleStory. This project is not official, not commercial, and not affiliated with MapleStory, Nexon, Nintendo, or Advance Wars.
::: 
