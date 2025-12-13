// Physics aliases
const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body;

// Ensure Matter is available for export if it's a global
const MatterLocal = window.Matter;

export { Engine, Runner, Bodies, Composite, Events, Vector, Body, MatterLocal as Matter };

export const engine = Engine.create();
export const world = engine.world;
engine.gravity.y = 0; // Top down

export const runner = Runner.create();
