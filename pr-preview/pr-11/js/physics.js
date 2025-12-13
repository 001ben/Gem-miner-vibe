// Physics aliases
const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body;

export { Engine, Runner, Bodies, Composite, Events, Vector, Body };

export const engine = Engine.create();
export const world = engine.world;
engine.gravity.y = 0; // Top down

export const runner = Runner.create();
